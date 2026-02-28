/**
 * Workflow execution engine.
 * Processes workflow graphs node-by-node, creating DelegatedTasks for agent_action nodes,
 * evaluating conditions, handling delays, and managing parallel splits/joins.
 */

import { prisma } from "@/lib/db";
import type { WorkflowGraph, WorkflowNode, WorkflowEdge, NodeRunState } from "@/lib/workflow-types";
import {
  createWorkflowRun,
  updateWorkflowRunNodeState,
  completeWorkflowRun,
} from "@/lib/workflow-store";
import { eventBus } from "@/lib/event-bus";

/**
 * Start executing a workflow from its trigger node.
 */
export async function executeWorkflow(
  workflowId: string,
  userId: string,
  triggerPayload?: unknown,
): Promise<string> {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow || workflow.userId !== userId) throw new Error("Workflow not found");
  if (workflow.status !== "ACTIVE" && workflow.status !== "DRAFT") {
    throw new Error(`Workflow is ${workflow.status}, cannot execute`);
  }

  const graph = JSON.parse(workflow.graphJson) as WorkflowGraph;
  const runId = await createWorkflowRun(workflowId, userId, graph, triggerPayload);

  // Find trigger nodes (nodes with no incoming edges)
  const targetNodeIds = new Set(graph.edges.map((e) => e.target));
  const triggerNodes = graph.nodes.filter((n) => !targetNodeIds.has(n.id));

  if (triggerNodes.length === 0) {
    await completeWorkflowRun(runId, "FAILED", "No trigger node found");
    return runId;
  }

  // Mark trigger nodes as completed and advance
  for (const trigger of triggerNodes) {
    await updateWorkflowRunNodeState(runId, trigger.id, {
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      output: triggerPayload ? JSON.stringify(triggerPayload).slice(0, 2000) : "triggered",
    });
    await advanceWorkflow(runId, userId, graph, trigger.id);
  }

  eventBus.emit({
    type: "WORKFLOW_RUN_STARTED",
    userId,
    workflowId,
    runId,
    workflowName: workflow.name,
  });

  return runId;
}

/**
 * Called when a node completes. Finds downstream nodes and processes them.
 */
async function advanceWorkflow(
  runId: string,
  userId: string,
  graph: WorkflowGraph,
  completedNodeId: string,
): Promise<void> {
  const outEdges = graph.edges.filter((e) => e.source === completedNodeId);
  if (outEdges.length === 0) {
    // Check if all nodes are done
    await checkWorkflowCompletion(runId);
    return;
  }

  for (const edge of outEdges) {
    const targetNode = graph.nodes.find((n) => n.id === edge.target);
    if (!targetNode) continue;

    // For parallel_join: wait for all incoming edges
    if (targetNode.type === "parallel_join") {
      const incomingEdges = graph.edges.filter((e) => e.target === targetNode.id);
      const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
      if (!run) return;
      const nodeStates = JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState>;
      const allSourcesComplete = incomingEdges.every((ie) => {
        const state = nodeStates[ie.source];
        return state?.status === "completed" || state?.status === "failed" || state?.status === "skipped";
      });
      if (!allSourcesComplete) continue;
    }

    // For condition edges, check if this edge's branch matches
    const parentNode = graph.nodes.find((n) => n.id === completedNodeId);
    if (parentNode?.type === "condition" && edge.conditionBranch) {
      const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
      if (!run) return;
      const nodeStates = JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState>;
      const condResult = nodeStates[completedNodeId]?.output;
      if (condResult !== edge.conditionBranch) {
        await updateWorkflowRunNodeState(runId, targetNode.id, { status: "skipped" });
        await advanceWorkflow(runId, userId, graph, targetNode.id);
        continue;
      }
    }

    await processNode(runId, userId, graph, targetNode);
  }
}

/**
 * Process a single workflow node.
 */
async function processNode(
  runId: string,
  userId: string,
  graph: WorkflowGraph,
  node: WorkflowNode,
): Promise<void> {
  await updateWorkflowRunNodeState(runId, node.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    switch (node.type) {
      case "agent_action": {
        const agentKind = String(node.config.agentKind ?? "ASSISTANT");
        const instructions = String(node.config.instructions ?? node.label);
        const title = String(node.config.title ?? node.label).slice(0, 240);

        // Gather outputs from predecessor nodes as context
        const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
        const nodeStates = run ? JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState> : {};
        const predecessorEdges = graph.edges.filter((e) => e.target === node.id);
        const contextParts: string[] = [];
        for (const pe of predecessorEdges) {
          const prevState = nodeStates[pe.source];
          if (prevState?.output) contextParts.push(`[Previous step output]: ${prevState.output.slice(0, 2000)}`);
        }
        const fullInstructions = contextParts.length > 0
          ? `${instructions}\n\n--- Context from previous steps ---\n${contextParts.join("\n\n")}`
          : instructions;

        const task = await prisma.delegatedTask.create({
          data: {
            userId,
            fromAgent: "WORKFLOW",
            toAgentTarget: agentKind,
            title,
            instructions: fullInstructions.slice(0, 12000),
            status: "QUEUED",
            triggerSource: "WORKFLOW",
            workflowRunId: runId,
            workflowNodeId: node.id,
          },
        });

        await updateWorkflowRunNodeState(runId, node.id, { taskId: task.id });
        // Task will be picked up by the scheduler/daemon; completion triggers onTaskCompleted
        return;
      }

      case "condition": {
        const field = String(node.config.field ?? "");
        const op = String(node.config.operator ?? "equals");
        const value = String(node.config.value ?? "");

        // Get the output from the predecessor
        const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
        const nodeStates = run ? JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState> : {};
        const predecessorEdges = graph.edges.filter((e) => e.target === node.id);
        let input = "";
        for (const pe of predecessorEdges) {
          const prev = nodeStates[pe.source];
          if (prev?.output) { input = prev.output; break; }
        }

        const result = evaluateCondition(input, field, op, value);
        await updateWorkflowRunNodeState(runId, node.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          output: result ? "true" : "false",
        });
        await advanceWorkflow(runId, userId, graph, node.id);
        return;
      }

      case "delay": {
        const delayMs = Number(node.config.delayMs ?? 0);
        if (delayMs > 0 && delayMs <= 86400000) { // max 24 hours
          // For real delays, we'd schedule a timer. For now, mark completed immediately
          // In production, this would use a job queue or scheduler
          await updateWorkflowRunNodeState(runId, node.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            output: `Delayed ${Math.round(delayMs / 1000)}s`,
          });
        } else {
          await updateWorkflowRunNodeState(runId, node.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            output: "No delay",
          });
        }
        await advanceWorkflow(runId, userId, graph, node.id);
        return;
      }

      case "parallel_split": {
        await updateWorkflowRunNodeState(runId, node.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          output: "split",
        });
        await advanceWorkflow(runId, userId, graph, node.id);
        return;
      }

      case "parallel_join": {
        // Collect all predecessor outputs
        const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
        const nodeStates = run ? JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState> : {};
        const predecessorEdges = graph.edges.filter((e) => e.target === node.id);
        const outputs = predecessorEdges
          .map((pe) => nodeStates[pe.source]?.output)
          .filter(Boolean);
        await updateWorkflowRunNodeState(runId, node.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          output: outputs.join("\n---\n").slice(0, 4000),
        });
        await advanceWorkflow(runId, userId, graph, node.id);
        return;
      }

      case "output": {
        const format = String(node.config.format ?? "text");
        const destination = String(node.config.destination ?? "log");
        // Collect predecessor outputs
        const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
        const nodeStates = run ? JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState> : {};
        const predecessorEdges = graph.edges.filter((e) => e.target === node.id);
        const outputParts: string[] = [];
        for (const pe of predecessorEdges) {
          const prev = nodeStates[pe.source];
          if (prev?.output) outputParts.push(prev.output);
        }
        const finalOutput = outputParts.join("\n\n").slice(0, 8000);

        await updateWorkflowRunNodeState(runId, node.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          output: `[${format}→${destination}] ${finalOutput.slice(0, 500)}`,
        });
        await advanceWorkflow(runId, userId, graph, node.id);
        return;
      }

      default: {
        // Trigger types are already handled
        await updateWorkflowRunNodeState(runId, node.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
          output: "passthrough",
        });
        await advanceWorkflow(runId, userId, graph, node.id);
      }
    }
  } catch (e) {
    await updateWorkflowRunNodeState(runId, node.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : "Unknown error",
    });
    await completeWorkflowRun(runId, "FAILED", e instanceof Error ? e.message : "Node execution failed");
  }
}

/**
 * Called when a DelegatedTask completes that belongs to a workflow run.
 */
export async function onTaskCompleted(
  taskId: string,
  workflowRunId: string,
  workflowNodeId: string,
  completionDigest: string | null,
  status: string,
): Promise<void> {
  const run = await prisma.workflowRun.findUnique({ where: { id: workflowRunId } });
  if (!run || run.status !== "RUNNING") return;

  const graph = JSON.parse(run.graphSnapshotJson) as WorkflowGraph;
  const nodeOutput = completionDigest?.slice(0, 4000) ?? `Task ${status}`;

  if (status === "DONE" || status === "REVIEW") {
    await updateWorkflowRunNodeState(workflowRunId, workflowNodeId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      output: nodeOutput,
    });
    await advanceWorkflow(workflowRunId, run.userId, graph, workflowNodeId);
  } else {
    await updateWorkflowRunNodeState(workflowRunId, workflowNodeId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: `Task ${status}: ${completionDigest?.slice(0, 500) ?? ""}`,
    });
    await completeWorkflowRun(workflowRunId, "FAILED", `Agent task failed at node ${workflowNodeId}`);
  }
}

/**
 * Cancel a running workflow.
 */
export async function cancelWorkflowRun(runId: string): Promise<void> {
  await completeWorkflowRun(runId, "CANCELED", "Manually canceled");
}

// --- Helpers ---

function evaluateCondition(input: string, field: string, op: string, value: string): boolean {
  let target = input;
  if (field) {
    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      target = String(parsed[field] ?? "");
    } catch {
      target = input;
    }
  }

  switch (op) {
    case "equals": return target === value;
    case "not_equals": return target !== value;
    case "contains": return target.includes(value);
    case "not_contains": return !target.includes(value);
    case "greater_than": return Number(target) > Number(value);
    case "less_than": return Number(target) < Number(value);
    case "is_empty": return !target || target.trim() === "";
    case "is_not_empty": return !!target && target.trim() !== "";
    default: return target === value;
  }
}

async function checkWorkflowCompletion(runId: string): Promise<void> {
  const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "RUNNING") return;

  const nodeStates = JSON.parse(run.nodeStatesJson) as Record<string, NodeRunState>;
  const allDone = Object.values(nodeStates).every(
    (s) => s.status === "completed" || s.status === "failed" || s.status === "skipped",
  );

  if (!allDone) return;

  const anyFailed = Object.values(nodeStates).some((s) => s.status === "failed");
  await completeWorkflowRun(runId, anyFailed ? "FAILED" : "COMPLETED");
}
