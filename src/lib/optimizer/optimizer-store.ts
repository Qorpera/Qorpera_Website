import { prisma } from "@/lib/db";
import type { OptimizationCycleResult, OptimizationAction, ScoreDimension, ResearchFinding } from "./types";

export type CycleStatus = "RUNNING" | "COMPLETE" | "FAILED";

export type CycleSummary = {
  id: string;
  agentKind: string;
  status: CycleStatus;
  overallScore: number | null;
  actionCount: number;
  appliedCount: number;
  createdAt: Date;
  nextRunAt: Date | null;
};

export type CycleDetail = CycleSummary & {
  research: ResearchFinding[];
  synthesis: string | null;
  dimensions: ScoreDimension[];
  actions: OptimizationAction[];
  appliedActionIds: Set<string>;
};

export async function createCycle(userId: string, agentKind: string) {
  return prisma.agentOptimizationCycle.create({
    data: { userId, agentKind, status: "RUNNING" },
  });
}

export async function completeCycle(
  cycleId: string,
  result: OptimizationCycleResult,
  nextRunAt: Date,
) {
  return prisma.agentOptimizationCycle.update({
    where: { id: cycleId },
    data: {
      status: "COMPLETE",
      researchJson: JSON.stringify(result.research),
      synthesisText: result.synthesis,
      scoreJson: JSON.stringify({ overall: result.overallScore, dimensions: result.dimensions }),
      improvementsJson: JSON.stringify(result.actions),
      nextRunAt,
    },
  });
}

export async function failCycle(cycleId: string, error: string) {
  return prisma.agentOptimizationCycle.update({
    where: { id: cycleId },
    data: { status: "FAILED", errorMessage: error.slice(0, 1000) },
  });
}

export async function getCycleById(cycleId: string, userId: string): Promise<CycleDetail | null> {
  const cycle = await prisma.agentOptimizationCycle.findFirst({
    where: { id: cycleId, userId },
    include: { applications: true },
  });
  if (!cycle) return null;
  return parseCycleDetail(cycle, cycle.applications);
}

export async function getLatestCycle(userId: string, agentKind: string): Promise<CycleDetail | null> {
  const cycle = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, agentKind, status: "COMPLETE" },
    orderBy: { createdAt: "desc" },
    include: { applications: true },
  });
  if (!cycle) return null;
  return parseCycleDetail(cycle, cycle.applications);
}

export async function listCycles(userId: string, agentKind: string, limit = 10): Promise<CycleSummary[]> {
  const cycles = await prisma.agentOptimizationCycle.findMany({
    where: { userId, agentKind },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { applications: { select: { improvementId: true } } },
  });
  return cycles.map((c) => {
    let overallScore: number | null = null;
    let actionCount = 0;
    try { if (c.scoreJson) { const s = JSON.parse(c.scoreJson) as { overall?: number }; if (typeof s.overall === "number") overallScore = s.overall; } } catch { /* */ }
    try { if (c.improvementsJson) { actionCount = (JSON.parse(c.improvementsJson) as unknown[]).length; } } catch { /* */ }
    return { id: c.id, agentKind: c.agentKind, status: c.status as CycleStatus, overallScore, actionCount, appliedCount: c.applications.length, createdAt: c.createdAt, nextRunAt: c.nextRunAt };
  });
}

function parseCycleDetail(
  cycle: {
    id: string; agentKind: string; status: string;
    researchJson: string | null; synthesisText: string | null;
    scoreJson: string | null; improvementsJson: string | null;
    createdAt: Date; nextRunAt: Date | null;
  },
  applications: { improvementId: string }[],
): CycleDetail {
  let research: ResearchFinding[] = [];
  let dimensions: ScoreDimension[] = [];
  let actions: OptimizationAction[] = [];
  let overallScore: number | null = null;
  const appliedIds = new Set(applications.map((a) => a.improvementId));
  try { if (cycle.researchJson) research = JSON.parse(cycle.researchJson) as ResearchFinding[]; } catch { /* */ }
  try { if (cycle.scoreJson) { const s = JSON.parse(cycle.scoreJson) as { overall?: number; dimensions?: ScoreDimension[] }; overallScore = typeof s.overall === "number" ? s.overall : null; dimensions = Array.isArray(s.dimensions) ? s.dimensions : []; } } catch { /* */ }
  try { if (cycle.improvementsJson) actions = JSON.parse(cycle.improvementsJson) as OptimizationAction[]; } catch { /* */ }
  return { id: cycle.id, agentKind: cycle.agentKind, status: cycle.status as CycleStatus, overallScore, actionCount: actions.length, appliedCount: appliedIds.size, createdAt: cycle.createdAt, nextRunAt: cycle.nextRunAt, research, synthesis: cycle.synthesisText, dimensions, actions, appliedActionIds: appliedIds };
}

// ── Prompt patch apply/revoke (used by prompt_patch actions) ─────

export async function applyImprovement(
  userId: string,
  cycleId: string,
  agentKind: string,
  improvement: { id: string; dimension: string; recommendation: string; promptPatch: string; priority: string; issue: string; researchBasis: string },
) {
  return prisma.agentOptimizationApplication.create({
    data: { userId, cycleId, agentKind, improvementId: improvement.id, dimension: improvement.dimension, title: improvement.recommendation.slice(0, 200), patchText: improvement.promptPatch },
  });
}

export async function getAppliedPatches(userId: string, agentKind: string): Promise<string | null> {
  const apps = await prisma.agentOptimizationApplication.findMany({
    where: { userId, agentKind },
    orderBy: { appliedAt: "asc" },
    select: { patchText: true },
  });
  if (apps.length === 0) return null;
  return apps.map((a) => a.patchText).join("\n\n");
}

export async function revokeImprovement(userId: string, improvementId: string) {
  await prisma.agentOptimizationApplication.deleteMany({
    where: { userId, improvementId },
  });
}

export async function getAppliedApplications(userId: string, agentKind: string) {
  return prisma.agentOptimizationApplication.findMany({
    where: { userId, agentKind },
    orderBy: { appliedAt: "desc" },
  });
}

// ── Due-check (any agent) ──────────────────────────────────────────

export async function isDue(userId: string): Promise<boolean> {
  // Don't run if any cycle is still running
  const running = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, status: "RUNNING" },
    select: { id: true },
  });
  if (running) return false;

  // Use the most recent nextRunAt across all agents
  const latest = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, nextRunAt: { not: null } },
    orderBy: { nextRunAt: "desc" },
    select: { nextRunAt: true },
  });
  if (!latest?.nextRunAt) return false;
  return new Date() >= latest.nextRunAt;
}
