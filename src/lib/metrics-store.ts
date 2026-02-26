import { prisma } from "@/lib/db";
import { UI_AGENTS } from "@/lib/workforce-ui";

export type AgentMetricRow = {
  kind: string;
  name: string;
  tone: string;
  submissions: number;
  accepted: number;
  acceptanceRate: number;
  delegatedDone: number;
  delegatedTotal: number;
  completionRate: number;
  avgToolLatencyMs: number | null;
};

export type MetricsSummary = {
  // Overview KPIs
  submissionsThisWeek: number;
  acceptanceRate: number;
  openApprovals: number;
  apiSpendThisMonth: number;

  // Per-agent table rows
  agentRows: AgentMetricRow[];

  // Workflow quality
  totalSubmissions: number;
  needsRevisionCount: number;
  avgRevisionRate: number;

  // Execution health
  runSuccessRate: number;
  projectHealthCounts: { green: number; yellow: number; red: number };

  // Provider costs
  providerUsage: { provider: string; requests: number; usdEstimate: number }[];
};

export async function getMetricsForUser(userId: string): Promise<MetricsSummary> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    allSubmissions,
    recentSubmissions,
    inboxItems,
    providerCredentials,
    delegatedTasks,
    toolCalls,
    recentRuns,
    projects,
  ] = await Promise.all([
    prisma.submission.findMany({
      where: { userId },
      select: { agentKind: true, status: true, createdAt: true },
    }),
    prisma.submission.findMany({
      where: { userId, createdAt: { gte: weekAgo } },
      select: { agentKind: true, status: true },
    }),
    prisma.inboxItem.findMany({
      where: { userId },
      select: { type: true, state: true },
    }),
    prisma.providerCredential.findMany({
      where: { userId },
      select: { provider: true, monthlyEstimatedUsd: true, monthlyRequestCount: true },
    }),
    prisma.delegatedTask.findMany({
      where: { userId, createdAt: { gte: ninetyDaysAgo } },
      select: { toAgentTarget: true, status: true },
    }),
    prisma.delegatedTaskToolCall.findMany({
      where: {
        delegatedTask: { userId },
        latencyMs: { not: null },
      },
      select: { latencyMs: true, delegatedTask: { select: { toAgentTarget: true } } },
    }),
    prisma.run.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { status: true },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { workforceHealth: true },
    }),
  ]);

  // KPIs
  const submissionsThisWeek = recentSubmissions.length;

  const totalSubmissions = allSubmissions.length;
  const acceptedCount = allSubmissions.filter((s) => s.status === "ACCEPTED").length;
  const acceptanceRate = totalSubmissions > 0 ? acceptedCount / totalSubmissions : 0;

  const openApprovals = inboxItems.filter(
    (i) => i.state === "OPEN" && i.type === "approval",
  ).length;

  const apiSpendThisMonth = providerCredentials.reduce(
    (sum, c) => sum + (c.monthlyEstimatedUsd ?? 0),
    0,
  );

  // Workflow quality
  const needsRevisionCount = allSubmissions.filter((s) => s.status === "NEEDS_REVISION").length;
  const avgRevisionRate = totalSubmissions > 0 ? needsRevisionCount / totalSubmissions : 0;

  // Execution health
  const finishedRuns = recentRuns.filter((r) => r.status === "FINISHED").length;
  const totalRuns = recentRuns.length;
  const runSuccessRate = totalRuns > 0 ? finishedRuns / totalRuns : 0;

  // Project health
  const projectHealthCounts = { green: 0, yellow: 0, red: 0 };
  for (const p of projects) {
    if (p.workforceHealth === "GREEN") projectHealthCounts.green++;
    else if (p.workforceHealth === "YELLOW") projectHealthCounts.yellow++;
    else if (p.workforceHealth === "RED") projectHealthCounts.red++;
  }

  // Provider usage
  const providerUsage = providerCredentials.map((c) => ({
    provider: c.provider,
    requests: c.monthlyRequestCount ?? 0,
    usdEstimate: c.monthlyEstimatedUsd ?? 0,
  }));

  // Per-agent rows
  // Build submission maps per agent kind
  const submissionsByKind = new Map<string, { total: number; accepted: number }>();
  for (const s of allSubmissions) {
    const key = String(s.agentKind);
    const entry = submissionsByKind.get(key) ?? { total: 0, accepted: 0 };
    entry.total++;
    if (s.status === "ACCEPTED") entry.accepted++;
    submissionsByKind.set(key, entry);
  }

  // Build delegated task maps per toAgentTarget
  const delegatedByTarget = new Map<string, { done: number; total: number }>();
  for (const t of delegatedTasks) {
    const key = t.toAgentTarget;
    const entry = delegatedByTarget.get(key) ?? { done: 0, total: 0 };
    entry.total++;
    if (t.status === "DONE") entry.done++;
    delegatedByTarget.set(key, entry);
  }

  // Build avg tool latency per toAgentTarget
  const latencyByTarget = new Map<string, number[]>();
  for (const tc of toolCalls) {
    const key = tc.delegatedTask.toAgentTarget;
    const arr = latencyByTarget.get(key) ?? [];
    if (tc.latencyMs !== null) arr.push(tc.latencyMs);
    latencyByTarget.set(key, arr);
  }

  const agentRows: AgentMetricRow[] = UI_AGENTS.map((agent) => {
    const kindKey = agent.kind;
    const subStats = submissionsByKind.get(kindKey) ?? { total: 0, accepted: 0 };
    const delStats = delegatedByTarget.get(kindKey) ?? { done: 0, total: 0 };
    const latencies = latencyByTarget.get(kindKey) ?? [];
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;

    return {
      kind: kindKey,
      name: agent.name,
      tone: agent.tone,
      submissions: subStats.total,
      accepted: subStats.accepted,
      acceptanceRate: subStats.total > 0 ? subStats.accepted / subStats.total : 0,
      delegatedDone: delStats.done,
      delegatedTotal: delStats.total,
      completionRate: delStats.total > 0 ? delStats.done / delStats.total : 0,
      avgToolLatencyMs: avgLatency,
    };
  });

  return {
    submissionsThisWeek,
    acceptanceRate,
    openApprovals,
    apiSpendThisMonth,
    agentRows,
    totalSubmissions,
    needsRevisionCount,
    avgRevisionRate,
    runSuccessRate,
    projectHealthCounts,
    providerUsage,
  };
}
