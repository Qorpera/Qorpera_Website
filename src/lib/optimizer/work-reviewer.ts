/**
 * Retrospective review of an agent's execution over the past 48 hours.
 *
 * Fetches delegated task records + tool call traces, asks the LLM to:
 *  - Identify failure patterns and root causes
 *  - Assess whether the current agent setup handled the work optimally
 *  - Generate targeted fix actions (prompt_patch, memory_seed, soul_addition)
 *    aimed at preventing the same failures next cycle
 */

import { prisma } from "@/lib/db";
import type { OptimizationAction } from "./types";

const REVIEW_WINDOW_HOURS = 48;
const MAX_TASKS = 40; // cap to keep prompt size sane

type LlmCaller = (system: string, user: string) => Promise<string | null>;

export type WorkReviewResult = {
  reviewSummary: string;
  actions: OptimizationAction[];
  taskStats: {
    total: number;
    done: number;
    failed: number;
    review: number;
    paused: number;
  };
};

function extractJson<T>(raw: string): T | null {
  for (const [open, close] of [["{", "}"], ["[", "]"]] as const) {
    const first = raw.indexOf(open);
    const last = raw.lastIndexOf(close);
    if (first !== -1 && last > first) {
      try { return JSON.parse(raw.slice(first, last + 1)) as T; } catch { /* next */ }
    }
  }
  return null;
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export async function reviewAgentWork(
  userId: string,
  agentKind: string,
  agentName: string,
  llmCaller: LlmCaller,
): Promise<WorkReviewResult> {
  const since = new Date(Date.now() - REVIEW_WINDOW_HOURS * 60 * 60 * 1000);

  const tasks = await prisma.delegatedTask.findMany({
    where: {
      userId,
      toAgentTarget: agentKind,
      createdAt: { gte: since },
    },
    include: {
      toolCalls: {
        orderBy: { createdAt: "asc" },
        select: {
          toolName: true,
          phase: true,
          status: true,
          inputSummary: true,
          outputSummary: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_TASKS,
  });

  const noWork: WorkReviewResult = {
    reviewSummary: "No tasks in the past 48 hours — nothing to review.",
    actions: [],
    taskStats: { total: 0, done: 0, failed: 0, review: 0, paused: 0 },
  };

  if (tasks.length === 0) return noWork;

  const stats = {
    total: tasks.length,
    done:   tasks.filter((t) => t.status === "DONE").length,
    failed: tasks.filter((t) => t.status === "FAILED").length,
    review: tasks.filter((t) => t.status === "REVIEW").length,
    paused: tasks.filter((t) => t.status === "PAUSED").length,
  };

  // Build a concise execution log for the LLM
  const taskText = tasks.map((task) => {
    const failedCalls = task.toolCalls.filter(
      (tc) => tc.status !== "ok" && tc.status !== "requires_connector",
    );
    const toolLines = failedCalls.length > 0
      ? `\n  Failed tool calls:\n${failedCalls.map((tc) =>
          `    • ${tc.toolName} [${tc.status}]: ${tc.outputSummary?.slice(0, 200) ?? "no output"}`
        ).join("\n")}`
      : "";

    return `STATUS:${task.status}  TASK: ${task.title}
  Instruction: ${task.instructions.slice(0, 250)}${toolLines}
  Result: ${task.completionDigest?.slice(0, 250) ?? "(none)"}`;
  }).join("\n\n");

  const raw = await llmCaller(
    "You are a rigorous AI agent performance auditor. Analyze execution logs, identify root causes of failures, and produce targeted fix actions. Return only valid JSON.",
    `Audit the last 48 hours of work for the ${agentName} agent.

EXECUTION STATS:
  Total tasks: ${stats.total}
  Done:        ${stats.done}
  Failed:      ${stats.failed}
  Pending review (output needed human check): ${stats.review}
  Paused/terminated: ${stats.paused}

TASK EXECUTION LOG:
${taskText}

Your job:
1. Was overall performance good, acceptable, or poor? Why?
2. For each failure or near-failure: what was the root cause? (wrong tool, unclear instruction, bad reasoning, missing knowledge, etc.)
3. Are there repeated failure patterns across tasks?
4. For each pattern, generate a targeted fix action (prompt_patch or memory_seed) that would prevent the same failure next time. Be specific — vague actions are useless.
5. If the agent performed well, say so and return an empty actions array.

Return JSON (no markdown):
{
  "summary": "3-5 sentence executive summary — overall verdict, key failures, key wins",
  "actions": [
    {
      "type": "prompt_patch",
      "id": "rev_PLACEHOLDER",
      "priority": "high|medium|low",
      "dimension": "tool_guidance|reasoning_chain|uncertainty_handling|output_quality|context_utilization",
      "issue": "exact failure pattern observed (quote task title if useful)",
      "researchBasis": "empirical: observed in 48h execution log",
      "sectionHeader": "SECTION_NAME_IN_CAPS",
      "content": "Precise protocol to follow to prevent recurrence. Imperative. 100-200 words. Include concrete decision rules."
    },
    {
      "type": "memory_seed",
      "id": "rev_PLACEHOLDER",
      "priority": "high|medium|low",
      "topic": "failure_pattern|tool_usage|task_handling|domain_knowledge",
      "title": "Short descriptive title",
      "content": "Specific knowledge to retain: what went wrong, what the correct approach is, any domain facts that were missing. 100-200 words.",
      "importance": 9,
      "issue": "knowledge gap that caused the failure",
      "researchBasis": "empirical: observed in 48h execution log"
    },
    {
      "type": "soul_addition",
      "id": "rev_PLACEHOLDER",
      "priority": "high|medium|low",
      "field": "coreTruth|boundary",
      "issue": "behavioural pattern that needs to be a core belief",
      "researchBasis": "empirical: observed in 48h execution log",
      "content": "The exact belief or boundary text to add. 1-2 sentences."
    }
  ]
}

Prioritise: HIGH = failure happened multiple times or was severe; MEDIUM = single failure with clear fix; LOW = minor inefficiency.`,
  ).catch(() => null);

  let reviewSummary = `${stats.done}/${stats.total} tasks completed. ${stats.failed} failed, ${stats.review} pending review.`;
  let actions: OptimizationAction[] = [];

  if (raw) {
    type ReviewPayload = { summary?: string; actions?: OptimizationAction[] };
    const parsed = extractJson<ReviewPayload>(raw);
    if (parsed?.summary) reviewSummary = parsed.summary;
    if (Array.isArray(parsed?.actions) && parsed.actions.length > 0) {
      actions = parsed.actions
        .filter((a) => a.type && a.priority)
        .map((a) => ({ ...a, id: `rev_${shortId()}` }));
    }
  }

  return { reviewSummary, actions, taskStats: stats };
}
