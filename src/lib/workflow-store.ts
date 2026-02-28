import { prisma } from "@/lib/db";
import type { WorkflowGraph, WorkflowView, WorkflowRunView, NodeRunState } from "@/lib/workflow-types";

export async function listWorkflows(userId: string): Promise<WorkflowView[]> {
  const rows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toView);
}

export async function getWorkflow(userId: string, id: string) {
  return prisma.workflow.findFirst({ where: { id, userId } });
}

export async function createWorkflow(
  userId: string,
  opts: { name: string; description?: string; graphJson: string; templateSlug?: string },
): Promise<WorkflowView> {
  const row = await prisma.workflow.create({
    data: {
      userId,
      name: opts.name,
      description: opts.description ?? "",
      graphJson: opts.graphJson,
      templateSlug: opts.templateSlug ?? null,
      status: "DRAFT",
    },
  });
  return toView(row);
}

export async function updateWorkflow(
  userId: string,
  id: string,
  updates: { name?: string; description?: string; graphJson?: string; status?: string },
): Promise<WorkflowView | null> {
  const existing = await prisma.workflow.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await prisma.workflow.update({
    where: { id },
    data: {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.description !== undefined ? { description: updates.description } : {}),
      ...(updates.graphJson !== undefined ? { graphJson: updates.graphJson, version: existing.version + 1 } : {}),
      ...(updates.status !== undefined ? { status: updates.status as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" } : {}),
    },
  });
  return toView(row);
}

export async function deleteWorkflow(userId: string, id: string): Promise<void> {
  await prisma.workflow.deleteMany({ where: { id, userId } });
}

export async function createWorkflowRun(
  workflowId: string,
  userId: string,
  graph: WorkflowGraph,
  triggerPayload?: unknown,
): Promise<string> {
  // Initialize all node states to pending
  const nodeStates: Record<string, NodeRunState> = {};
  for (const node of graph.nodes) {
    nodeStates[node.id] = { status: "pending" };
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      graphSnapshotJson: JSON.stringify(graph),
      nodeStatesJson: JSON.stringify(nodeStates),
      triggerPayload: triggerPayload ? JSON.stringify(triggerPayload) : null,
    },
  });

  await prisma.workflow.update({
    where: { id: workflowId },
    data: { lastRunAt: new Date() },
  });

  return run.id;
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRunView | null> {
  const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  return toRunView(run);
}

export async function listWorkflowRuns(workflowId: string, limit = 20): Promise<WorkflowRunView[]> {
  const runs = await prisma.workflowRun.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    take: Math.min(limit, 50),
  });
  return runs.map(toRunView);
}

export async function updateWorkflowRunNodeState(
  runId: string,
  nodeId: string,
  state: Partial<NodeRunState>,
): Promise<void> {
  // Use a transaction with row-level locking to prevent concurrent overwrites
  // when parallel workflow branches complete simultaneously.
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ nodeStatesJson: string }>>(
      `SELECT "nodeStatesJson" FROM "WorkflowRun" WHERE "id" = $1 FOR UPDATE`,
      runId,
    );
    if (rows.length === 0) return;

    const nodeStates = JSON.parse(rows[0].nodeStatesJson) as Record<string, NodeRunState>;
    nodeStates[nodeId] = { ...nodeStates[nodeId], ...state };

    await tx.workflowRun.update({
      where: { id: runId },
      data: { nodeStatesJson: JSON.stringify(nodeStates) },
    });
  });
}

export async function completeWorkflowRun(
  runId: string,
  status: "COMPLETED" | "FAILED" | "CANCELED",
  errorMessage?: string,
): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      ...(errorMessage ? { errorMessage } : {}),
    },
  });
}

// --- Helpers ---

function toView(row: { id: string; name: string; description: string; status: string; version: number; templateSlug: string | null; lastRunAt: Date | null; createdAt: Date; updatedAt: Date }): WorkflowView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    version: row.version,
    templateSlug: row.templateSlug,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRunView(run: { id: string; workflowId: string; status: string; nodeStatesJson: string; triggerPayload: string | null; startedAt: Date; completedAt: Date | null; errorMessage: string | null }): WorkflowRunView {
  let nodeStates: Record<string, NodeRunState> = {};
  try { nodeStates = JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState>; } catch { /* empty */ }
  let triggerPayload: unknown = null;
  try { if (run.triggerPayload) triggerPayload = JSON.parse(run.triggerPayload); } catch { /* empty */ }
  return {
    id: run.id,
    workflowId: run.workflowId,
    status: run.status,
    nodeStates,
    triggerPayload,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    errorMessage: run.errorMessage,
  };
}
