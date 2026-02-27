import { prisma } from "@/lib/db";
import type { OptimizationCycleResult, OptimizationImprovement, ScoreDimension, ResearchFinding } from "./types";

export type CycleStatus = "RUNNING" | "COMPLETE" | "FAILED";

export type CycleSummary = {
  id: string;
  agentKind: string;
  status: CycleStatus;
  overallScore: number | null;
  improvementCount: number;
  appliedCount: number;
  createdAt: Date;
  nextRunAt: Date | null;
};

export type CycleDetail = CycleSummary & {
  research: ResearchFinding[];
  synthesis: string | null;
  dimensions: ScoreDimension[];
  improvements: OptimizationImprovement[];
  appliedImprovementIds: Set<string>;
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
      scoreJson: JSON.stringify({
        overall: result.overallScore,
        dimensions: result.dimensions,
      }),
      improvementsJson: JSON.stringify(result.improvements),
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

export async function listCycles(
  userId: string,
  agentKind: string,
  limit = 10,
): Promise<CycleSummary[]> {
  const cycles = await prisma.agentOptimizationCycle.findMany({
    where: { userId, agentKind },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      applications: { select: { improvementId: true } },
    },
  });

  return cycles.map((c) => {
    let overallScore: number | null = null;
    let improvementCount = 0;
    if (c.scoreJson) {
      try {
        const s = JSON.parse(c.scoreJson) as { overall?: number };
        if (typeof s.overall === "number") overallScore = s.overall;
      } catch {
        // ignore
      }
    }
    if (c.improvementsJson) {
      try {
        const imps = JSON.parse(c.improvementsJson) as unknown[];
        improvementCount = imps.length;
      } catch {
        // ignore
      }
    }
    return {
      id: c.id,
      agentKind: c.agentKind,
      status: c.status as CycleStatus,
      overallScore,
      improvementCount,
      appliedCount: c.applications.length,
      createdAt: c.createdAt,
      nextRunAt: c.nextRunAt,
    };
  });
}

export async function getLatestCycle(
  userId: string,
  agentKind: string,
): Promise<CycleDetail | null> {
  const cycle = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, agentKind, status: "COMPLETE" },
    orderBy: { createdAt: "desc" },
    include: { applications: true },
  });
  if (!cycle) return null;

  return parseCycleDetail(cycle, cycle.applications);
}

export async function getCycleById(
  cycleId: string,
  userId: string,
): Promise<CycleDetail | null> {
  const cycle = await prisma.agentOptimizationCycle.findFirst({
    where: { id: cycleId, userId },
    include: { applications: true },
  });
  if (!cycle) return null;
  return parseCycleDetail(cycle, cycle.applications);
}

function parseCycleDetail(
  cycle: {
    id: string;
    agentKind: string;
    status: string;
    researchJson: string | null;
    synthesisText: string | null;
    scoreJson: string | null;
    improvementsJson: string | null;
    createdAt: Date;
    nextRunAt: Date | null;
  },
  applications: { improvementId: string }[],
): CycleDetail {
  let research: ResearchFinding[] = [];
  let dimensions: ScoreDimension[] = [];
  let improvements: OptimizationImprovement[] = [];
  let overallScore: number | null = null;
  const appliedIds = new Set(applications.map((a) => a.improvementId));

  try {
    if (cycle.researchJson) research = JSON.parse(cycle.researchJson) as ResearchFinding[];
  } catch { /* ignore */ }

  try {
    if (cycle.scoreJson) {
      const s = JSON.parse(cycle.scoreJson) as { overall?: number; dimensions?: ScoreDimension[] };
      overallScore = typeof s.overall === "number" ? s.overall : null;
      dimensions = Array.isArray(s.dimensions) ? s.dimensions : [];
    }
  } catch { /* ignore */ }

  try {
    if (cycle.improvementsJson) {
      improvements = JSON.parse(cycle.improvementsJson) as OptimizationImprovement[];
    }
  } catch { /* ignore */ }

  return {
    id: cycle.id,
    agentKind: cycle.agentKind,
    status: cycle.status as CycleStatus,
    overallScore,
    improvementCount: improvements.length,
    appliedCount: appliedIds.size,
    createdAt: cycle.createdAt,
    nextRunAt: cycle.nextRunAt,
    research,
    synthesis: cycle.synthesisText,
    dimensions,
    improvements,
    appliedImprovementIds: appliedIds,
  };
}

export async function applyImprovement(
  userId: string,
  cycleId: string,
  agentKind: string,
  improvement: OptimizationImprovement,
) {
  return prisma.agentOptimizationApplication.create({
    data: {
      userId,
      cycleId,
      agentKind,
      improvementId: improvement.id,
      dimension: improvement.dimension,
      title: improvement.recommendation.slice(0, 200),
      patchText: improvement.promptPatch,
    },
  });
}

export async function revokeImprovement(userId: string, improvementId: string) {
  return prisma.agentOptimizationApplication.deleteMany({
    where: { userId, improvementId },
  });
}

export async function getAppliedPatches(
  userId: string,
  agentKind: string,
): Promise<string | null> {
  const applications = await prisma.agentOptimizationApplication.findMany({
    where: { userId, agentKind },
    orderBy: { appliedAt: "asc" },
    select: { patchText: true, dimension: true, improvementId: true },
  });
  if (applications.length === 0) return null;
  return applications.map((a) => a.patchText).join("\n\n");
}

export async function getAppliedApplications(
  userId: string,
  agentKind: string,
) {
  return prisma.agentOptimizationApplication.findMany({
    where: { userId, agentKind },
    orderBy: { appliedAt: "desc" },
  });
}

export async function shouldAutoRun(
  userId: string,
  agentKind: string,
): Promise<boolean> {
  // Check if there's already a RUNNING cycle
  const running = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, agentKind, status: "RUNNING" },
  });
  if (running) return false;

  // Check nextRunAt of the latest completed cycle
  const latest = await prisma.agentOptimizationCycle.findFirst({
    where: { userId, agentKind },
    orderBy: { createdAt: "desc" },
    select: { nextRunAt: true, status: true },
  });
  if (!latest) return false; // no cycles yet, user must trigger first
  if (latest.status === "RUNNING") return false;
  if (!latest.nextRunAt) return false;
  return new Date() >= latest.nextRunAt;
}
