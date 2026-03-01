/**
 * Task outcome recording and agent performance profiling.
 *
 * Records SUCCESS/PARTIAL/FAILURE outcomes per task, then aggregates
 * into per-agent performance profiles for system prompt injection.
 */

import { TaskOutcome } from "@prisma/client";
import { prisma } from "@/lib/db";
import { inferTaskCategory } from "@/lib/goal-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskOutcomeInput = {
  taskId: string;
  agentTarget: string;
  outcome: TaskOutcome;
  category?: string;
  toolsUsed?: string[];
  turnsUsed?: number;
  runtimeMs?: number;
  errorSummary?: string;
  title?: string;
  instructions?: string;
};

export type AgentPerformanceProfile = {
  agentTarget: string;
  windowDays: number;
  totalTasks: number;
  successRate: number;
  partialRate: number;
  failureRate: number;
  approvalRate: number | null;
  categoryBreakdown: Record<string, { total: number; successRate: number }>;
  commonBlockers: string[];
  trend: "improving" | "stable" | "declining";
};

// ---------------------------------------------------------------------------
// Record outcomes
// ---------------------------------------------------------------------------

export async function recordTaskOutcome(
  userId: string,
  input: TaskOutcomeInput,
): Promise<void> {
  try {
    const category = input.category ?? inferTaskCategory(input.title ?? "", input.instructions ?? "");

    await prisma.taskOutcomeRecord.upsert({
      where: { taskId: input.taskId },
      create: {
        userId,
        taskId: input.taskId,
        agentTarget: input.agentTarget,
        outcome: input.outcome,
        category,
        toolsUsedJson: JSON.stringify(input.toolsUsed ?? []),
        turnsUsed: input.turnsUsed ?? 0,
        runtimeMs: input.runtimeMs ?? 0,
        errorSummary: input.errorSummary?.slice(0, 1000) ?? null,
      },
      update: {
        outcome: input.outcome,
        category,
        toolsUsedJson: JSON.stringify(input.toolsUsed ?? []),
        turnsUsed: input.turnsUsed ?? 0,
        runtimeMs: input.runtimeMs ?? 0,
        errorSummary: input.errorSummary?.slice(0, 1000) ?? null,
      },
    });
  } catch (err) {
    console.error("[outcome-ledger] recordTaskOutcome error", String(err));
  }
}

/**
 * Record inbox approval/rejection decision on an existing outcome.
 */
export async function recordInboxDecision(
  userId: string,
  taskId: string,
  wasApproved: boolean,
): Promise<void> {
  try {
    await prisma.taskOutcomeRecord.updateMany({
      where: { taskId, userId },
      data: { wasApproved },
    });
  } catch (err) {
    console.error("[outcome-ledger] recordInboxDecision error", String(err));
  }
}

// ---------------------------------------------------------------------------
// Performance profiling
// ---------------------------------------------------------------------------

export async function getAgentPerformanceProfile(
  userId: string,
  agentTarget: string,
  windowDays = 90,
): Promise<AgentPerformanceProfile> {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const records = await prisma.taskOutcomeRecord.findMany({
    where: {
      userId,
      agentTarget,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const totalTasks = records.length;
  if (totalTasks === 0) {
    return {
      agentTarget,
      windowDays,
      totalTasks: 0,
      successRate: 0,
      partialRate: 0,
      failureRate: 0,
      approvalRate: null,
      categoryBreakdown: {},
      commonBlockers: [],
      trend: "stable",
    };
  }

  const successCount = records.filter((r) => r.outcome === "SUCCESS").length;
  const partialCount = records.filter((r) => r.outcome === "PARTIAL").length;
  const failureCount = records.filter((r) => r.outcome === "FAILURE").length;

  const approvedRecords = records.filter((r) => r.wasApproved !== null);
  const approvalRate = approvedRecords.length > 0
    ? approvedRecords.filter((r) => r.wasApproved === true).length / approvedRecords.length
    : null;

  // Category breakdown
  const categoryMap = new Map<string, { total: number; success: number }>();
  for (const r of records) {
    const cat = r.category;
    const entry = categoryMap.get(cat) ?? { total: 0, success: 0 };
    entry.total++;
    if (r.outcome === "SUCCESS") entry.success++;
    categoryMap.set(cat, entry);
  }
  const categoryBreakdown: Record<string, { total: number; successRate: number }> = {};
  for (const [cat, data] of categoryMap) {
    categoryBreakdown[cat] = {
      total: data.total,
      successRate: Math.round((data.success / data.total) * 100) / 100,
    };
  }

  // Common blockers (from error summaries of failures)
  const errors = records
    .filter((r) => r.outcome === "FAILURE" && r.errorSummary)
    .map((r) => r.errorSummary!)
    .slice(0, 10);
  const commonBlockers = [...new Set(errors)].slice(0, 5);

  // Trend: compare recent half vs older half
  const mid = Math.floor(records.length / 2);
  const recentHalf = records.slice(0, mid);
  const olderHalf = records.slice(mid);
  const recentSuccessRate = recentHalf.length > 0
    ? recentHalf.filter((r) => r.outcome === "SUCCESS").length / recentHalf.length
    : 0;
  const olderSuccessRate = olderHalf.length > 0
    ? olderHalf.filter((r) => r.outcome === "SUCCESS").length / olderHalf.length
    : 0;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (recentSuccessRate - olderSuccessRate > 0.1) trend = "improving";
  else if (olderSuccessRate - recentSuccessRate > 0.1) trend = "declining";

  return {
    agentTarget,
    windowDays,
    totalTasks,
    successRate: Math.round((successCount / totalTasks) * 100) / 100,
    partialRate: Math.round((partialCount / totalTasks) * 100) / 100,
    failureRate: Math.round((failureCount / totalTasks) * 100) / 100,
    approvalRate: approvalRate !== null ? Math.round(approvalRate * 100) / 100 : null,
    categoryBreakdown,
    commonBlockers,
    trend,
  };
}

/**
 * Format performance profile for system prompt injection.
 */
export function formatPerformanceForPrompt(profile: AgentPerformanceProfile): string {
  if (profile.totalTasks === 0) return "";

  const lines: string[] = [
    `## PERFORMANCE HISTORY (${profile.agentTarget}, last ${profile.windowDays}d)`,
    `Tasks completed: ${profile.totalTasks} | Success: ${Math.round(profile.successRate * 100)}% | Partial: ${Math.round(profile.partialRate * 100)}% | Failure: ${Math.round(profile.failureRate * 100)}%`,
  ];

  if (profile.approvalRate !== null) {
    lines.push(`Approval rate: ${Math.round(profile.approvalRate * 100)}%`);
  }

  lines.push(`Trend: ${profile.trend}`);

  // Top categories
  const sortedCats = Object.entries(profile.categoryBreakdown)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);
  if (sortedCats.length > 0) {
    lines.push("Top categories: " + sortedCats.map(([cat, d]) => `${cat}(${d.total}, ${Math.round(d.successRate * 100)}%)`).join(", "));
  }

  if (profile.commonBlockers.length > 0) {
    lines.push("Common blockers: " + profile.commonBlockers.join("; "));
  }

  if (profile.trend === "declining") {
    lines.push("⚠ Performance declining — review recent failures and adjust approach.");
  }

  return lines.join("\n");
}
