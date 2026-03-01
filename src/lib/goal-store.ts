/**
 * Goal decomposition, execution, and lifecycle management.
 *
 * Goals break down into ordered steps with agent assignments and dependencies.
 * Steps auto-create DelegatedTasks when executed, and goals auto-complete
 * when all steps are DONE.
 */

import { GoalPriority, GoalStatus, GoalStepStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { callAgentLlm } from "@/lib/agent-llm";
import { eventBus } from "@/lib/event-bus";

const MAX_GOAL_DEPTH = 2;
const MAX_STEPS = 8;
const MIN_STEPS = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalInput = {
  title: string;
  description?: string;
  priority?: GoalPriority;
  agentTarget?: string;
  parentGoalId?: string;
};

export type GoalStepInput = {
  title: string;
  instructions: string;
  agentTarget?: string;
  dependsOn?: string[]; // step IDs
};

export type GoalView = {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  agentTarget: string | null;
  totalSteps: number;
  completedSteps: number;
  progressPct: number;
  parentGoalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createGoal(
  userId: string,
  input: GoalInput,
): Promise<GoalView> {
  // Validate parent depth
  if (input.parentGoalId) {
    const depth = await getGoalDepth(input.parentGoalId);
    if (depth >= MAX_GOAL_DEPTH) {
      throw new Error(`Goal nesting exceeds maximum depth of ${MAX_GOAL_DEPTH}`);
    }
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title: input.title.slice(0, 240),
      description: (input.description ?? "").slice(0, 4000),
      priority: input.priority ?? "NORMAL",
      agentTarget: input.agentTarget ?? null,
      parentGoalId: input.parentGoalId ?? null,
      status: "ACTIVE",
    },
  });

  eventBus.emit({
    type: "GOAL_CREATED",
    userId,
    goalId: goal.id,
    title: goal.title,
  });

  return toGoalView(goal);
}

export async function getGoal(userId: string, goalId: string): Promise<GoalView | null> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
  });
  return goal ? toGoalView(goal) : null;
}

export async function listGoals(
  userId: string,
  opts?: { status?: GoalStatus; agentTarget?: string; limit?: number },
): Promise<GoalView[]> {
  const where: Record<string, unknown> = { userId };
  if (opts?.status) where.status = opts.status;
  if (opts?.agentTarget) where.agentTarget = opts.agentTarget;

  const goals = await prisma.goal.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 50,
  });

  return goals.map(toGoalView);
}

export async function updateGoalStatus(
  userId: string,
  goalId: string,
  status: GoalStatus,
): Promise<GoalView | null> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return null;

  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED" || status === "FAILED" || status === "CANCELLED") {
    data.completedAt = new Date();
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data,
  });

  if (status === "COMPLETED") {
    eventBus.emit({
      type: "GOAL_COMPLETED",
      userId,
      goalId,
      title: updated.title,
    });
  }

  return toGoalView(updated);
}

// ---------------------------------------------------------------------------
// Decomposition via LLM
// ---------------------------------------------------------------------------

export async function decomposeGoal(
  userId: string,
  goalId: string,
): Promise<GoalStepInput[]> {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal) throw new Error("Goal not found");

  const systemPrompt = `You are a goal decomposition assistant. Break down the user's goal into ${MIN_STEPS}-${MAX_STEPS} concrete, ordered steps.
Each step should be a specific task that can be delegated to an AI agent.

Available agent types: ASSISTANT, SALES_REP, CUSTOMER_SUCCESS, MARKETING_COORDINATOR, FINANCE_ANALYST, OPERATIONS_MANAGER, EXECUTIVE_ASSISTANT, RESEARCH_ANALYST, SEO_SPECIALIST

Respond with a JSON array of steps:
[{"title": "step title", "instructions": "detailed instructions", "agentTarget": "AGENT_TYPE", "dependsOn": []}]

Rules:
- Each step title should be concise (under 120 chars)
- Instructions should be detailed enough for the agent to execute independently
- dependsOn contains indices (0-based) of steps that must complete first
- Assign the most appropriate agent type for each step
- Keep steps focused and actionable`;

  const userMessage = `Goal: ${goal.title}\nDescription: ${goal.description || "No additional description."}\nPriority: ${goal.priority}`;

  const result = await callAgentLlm({
    userId,
    agentKind: "CHIEF_ADVISOR",
    systemPrompt,
    userMessage,
    maxOutputTokens: 2000,
  });

  if (result.error || !result.text) {
    throw new Error(result.error || "LLM returned empty response");
  }

  // Parse JSON from response
  const jsonMatch = result.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Could not parse step array from LLM response");

  const raw = JSON.parse(jsonMatch[0]) as Array<{
    title?: string;
    instructions?: string;
    agentTarget?: string;
    dependsOn?: number[];
  }>;

  const steps = raw.slice(0, MAX_STEPS).filter((s) => s.title);

  // Create steps in DB
  const createdSteps: Array<{ id: string; title: string; instructions: string; agentTarget: string | null }> = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const step = await prisma.goalStep.create({
      data: {
        goalId,
        stepOrder: i,
        title: (s.title ?? "").slice(0, 240),
        instructions: (s.instructions ?? "").slice(0, 4000),
        agentTarget: s.agentTarget ?? goal.agentTarget ?? null,
        status: "PENDING",
        dependsOnJson: "[]", // will update after all created
      },
    });
    createdSteps.push(step);
  }

  // Resolve dependency indices to step IDs
  for (let i = 0; i < steps.length; i++) {
    const deps = (steps[i].dependsOn ?? [])
      .filter((idx) => idx >= 0 && idx < createdSteps.length && idx !== i)
      .map((idx) => createdSteps[idx].id);
    if (deps.length > 0) {
      await prisma.goalStep.update({
        where: { id: createdSteps[i].id },
        data: { dependsOnJson: JSON.stringify(deps) },
      });
    }
  }

  // Update goal step count
  await prisma.goal.update({
    where: { id: goalId },
    data: { totalSteps: createdSteps.length },
  });

  return createdSteps.map((s, i) => ({
    title: s.title,
    instructions: s.instructions,
    agentTarget: s.agentTarget ?? undefined,
    dependsOn: steps[i].dependsOn?.map((idx) => createdSteps[idx]?.id).filter(Boolean) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

/**
 * Find the next executable step: PENDING with all dependencies DONE.
 */
export async function getNextExecutableStep(
  userId: string,
  goalId: string,
): Promise<{ id: string; title: string; instructions: string; agentTarget: string | null; stepOrder: number } | null> {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal || goal.status !== "ACTIVE") return null;

  const steps = await prisma.goalStep.findMany({
    where: { goalId },
    orderBy: { stepOrder: "asc" },
  });

  const doneIds = new Set(steps.filter((s) => s.status === "DONE").map((s) => s.id));

  for (const step of steps) {
    if (step.status !== "PENDING") continue;
    const deps = JSON.parse(step.dependsOnJson) as string[];
    const allDepsDone = deps.every((d) => doneIds.has(d));
    if (allDepsDone) {
      return {
        id: step.id,
        title: step.title,
        instructions: step.instructions,
        agentTarget: step.agentTarget,
        stepOrder: step.stepOrder,
      };
    }
  }

  return null;
}

/**
 * Execute a goal step by creating a DelegatedTask.
 */
export async function executeGoalStep(
  userId: string,
  stepId: string,
): Promise<string | null> {
  const step = await prisma.goalStep.findUnique({
    where: { id: stepId },
    include: { goal: true },
  });
  if (!step || step.goal.userId !== userId) return null;
  if (step.status !== "PENDING") return null;

  const agentTarget = step.agentTarget ?? step.goal.agentTarget ?? "ASSISTANT";

  // Lazy import to avoid circular dependency
  const { createDelegatedTask } = await import("@/lib/orchestration-store");

  const task = await createDelegatedTask(userId, {
    fromAgent: "GOAL_ENGINE",
    toAgentTarget: agentTarget as Parameters<typeof createDelegatedTask>[1]["toAgentTarget"],
    title: step.title,
    instructions: `[Goal: ${step.goal.title}]\n\n${step.instructions}`,
    goalStepId: step.id,
  });

  if (!task) return null;

  await prisma.goalStep.update({
    where: { id: stepId },
    data: { status: "IN_PROGRESS", taskId: task.id },
  });

  return task.id;
}

/**
 * Called when a DelegatedTask linked to a goal step completes.
 */
export async function onGoalStepTaskCompleted(
  userId: string,
  taskId: string,
  taskStatus: string,
): Promise<void> {
  const step = await prisma.goalStep.findFirst({
    where: { taskId },
    include: { goal: true },
  });
  if (!step || step.goal.userId !== userId) return;

  const newStatus: GoalStepStatus =
    taskStatus === "DONE" ? "DONE" :
    taskStatus === "FAILED" ? "FAILED" : "BLOCKED";

  await prisma.goalStep.update({
    where: { id: step.id },
    data: {
      status: newStatus,
      completedAt: newStatus === "DONE" ? new Date() : null,
    },
  });

  if (newStatus === "DONE") {
    // Increment completed steps and recalculate progress
    const goal = await prisma.goal.update({
      where: { id: step.goalId },
      data: { completedSteps: { increment: 1 } },
    });

    const progressPct = goal.totalSteps > 0
      ? Math.round((goal.completedSteps / goal.totalSteps) * 100)
      : 0;

    await prisma.goal.update({
      where: { id: step.goalId },
      data: { progressPct },
    });

    // Auto-complete goal when all steps are done
    const allSteps = await prisma.goalStep.findMany({
      where: { goalId: step.goalId },
      select: { status: true },
    });
    const allDone = allSteps.every((s) => s.status === "DONE" || s.status === "SKIPPED");
    if (allDone && allSteps.length > 0) {
      await updateGoalStatus(userId, step.goalId, "COMPLETED");
    }
  }
}

// ---------------------------------------------------------------------------
// Goal attention queries
// ---------------------------------------------------------------------------

/**
 * Goals that need attention: URGENT first, then stale (no progress in 24h), then by priority.
 */
export async function getGoalsNeedingAttention(
  userId: string,
  agentTarget?: string,
  limit = 10,
): Promise<GoalView[]> {
  const where: Record<string, unknown> = { userId, status: "ACTIVE" };
  if (agentTarget) where.agentTarget = agentTarget;

  const goals = await prisma.goal.findMany({
    where,
    orderBy: [{ priority: "asc" }, { updatedAt: "asc" }],
    take: limit,
  });

  // Sort: URGENT first, then stale, then by priority
  const now = Date.now();
  const STALE_MS = 24 * 60 * 60 * 1000;
  const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

  goals.sort((a, b) => {
    const aUrgent = a.priority === "URGENT" ? 0 : 1;
    const bUrgent = b.priority === "URGENT" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;

    const aStale = now - a.updatedAt.getTime() > STALE_MS ? 0 : 1;
    const bStale = now - b.updatedAt.getTime() > STALE_MS ? 0 : 1;
    if (aStale !== bStale) return aStale - bStale;

    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });

  return goals.map(toGoalView);
}

// ---------------------------------------------------------------------------
// Task category inference
// ---------------------------------------------------------------------------

const CATEGORY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(email|mail|send|outreach|newsletter)\b/i, "email"],
  [/\b(research|analyze|investigate|study|survey)\b/i, "research"],
  [/\b(write|draft|blog|article|content|copy)\b/i, "content"],
  [/\b(data|report|metrics|analytics|dashboard)\b/i, "analysis"],
  [/\b(crm|lead|deal|pipeline|hubspot|salesforce)\b/i, "crm"],
  [/\b(schedule|calendar|meeting|appointment|book)\b/i, "scheduling"],
  [/\b(deploy|build|release|infra|devops|server)\b/i, "operations"],
  [/\b(browse|scrape|website|page|navigate)\b/i, "browser"],
];

export function inferTaskCategory(title: string, instructions: string): string {
  const text = `${title} ${instructions}`;
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getGoalDepth(goalId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = goalId;
  while (currentId && depth < 10) {
    const found: { parentGoalId: string | null } | null = await prisma.goal.findUnique({
      where: { id: currentId },
      select: { parentGoalId: true },
    });
    if (!found?.parentGoalId) break;
    currentId = found.parentGoalId;
    depth++;
  }
  return depth;
}

function toGoalView(g: {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;
  agentTarget: string | null;
  totalSteps: number;
  completedSteps: number;
  progressPct: number;
  parentGoalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): GoalView {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    status: g.status,
    priority: g.priority,
    agentTarget: g.agentTarget,
    totalSteps: g.totalSteps,
    completedSteps: g.completedSteps,
    progressPct: g.progressPct,
    parentGoalId: g.parentGoalId,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    completedAt: g.completedAt,
  };
}
