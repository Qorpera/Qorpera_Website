import { prisma } from "@/lib/db";
import { UI_AGENTS } from "@/lib/workforce-ui";
import { getOllamaUsageThisMonth, CLOUD_PRICING, estimateCloudCost } from "@/lib/ollama-usage-store";

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
  /** Acceptance rate change vs the first half of the selected period. Null if insufficient data. */
  acceptanceRateDelta: number | null;
};

export type DailyActivityPoint = {
  date: string; // "YYYY-MM-DD"
  tasks: number;
  submissions: number;
};

export type WeeklyAcceptancePoint = {
  weekStart: string; // "YYYY-MM-DD"
  submissions: number;
  accepted: number;
  rate: number;
};

export type RunnerJobStats = {
  total: number;
  succeeded: number;
  failed: number;
  successRate: number;
};

export type MetricsSummary = {
  // Overview KPIs
  submissionsThisWeek: number;
  acceptanceRate: number;
  openApprovals: number;
  apiSpendThisMonth: number;

  // Week-over-week delta for acceptance rate KPI card
  acceptanceRateDelta: number | null;

  // Per-agent table rows
  agentRows: AgentMetricRow[];

  // Workflow quality
  totalSubmissions: number;
  needsRevisionCount: number;
  avgRevisionRate: number;
  failedTaskCount: number;

  // Execution health
  runSuccessRate: number;
  projectHealthCounts: { green: number; yellow: number; red: number };

  // Runner health (last 30 days)
  runnerJobStats: RunnerJobStats;

  // Provider costs
  providerUsage: { provider: string; requests: number; usdEstimate: number }[];

  // Local AI (Ollama) usage this month
  localAiUsage: {
    requestCount: number;
    promptTokens: number;
    completionTokens: number;
    cloudEquivalents: { label: string; usd: number }[];
  };

  // Daily activity (last 14 days)
  dailyActivity: DailyActivityPoint[];

  // 8-week acceptance rate trend
  weeklyAcceptanceTrend: WeeklyAcceptancePoint[];
};

// Pass rangeDays=0 to mean "all time" (lifetime).
export async function getMetricsForUser(userId: string, rangeDays = 365): Promise<MetricsSummary> {
  const isLifetime = rangeDays === 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const rangeAgo = isLifetime ? new Date(0) : new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - Math.min(isLifetime ? 30 : rangeDays, 30) * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = rangeAgo;

  const [
    allSubmissions,
    recentSubmissions,
    inboxItems,
    providerCredentials,
    delegatedTasks,
    recentDelegatedTasks,
    toolCalls,
    recentRuns,
    projects,
    runnerJobs,
    ollamaRaw,
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
    prisma.delegatedTask.findMany({
      where: { userId, createdAt: { gte: rangeAgo } },
      select: { createdAt: true },
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
    prisma.runnerJob.findMany({
      where: { userId, createdAt: { gte: thirtyDaysAgo } },
      select: { status: true },
    }),
    getOllamaUsageThisMonth(userId),
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

  // Week-over-week acceptance rate delta for KPI card
  const lastWeekSubs = allSubmissions.filter(
    (s) => s.createdAt >= twoWeeksAgo && s.createdAt < weekAgo,
  );
  const thisWeekAccepted = recentSubmissions.filter((s) => s.status === "ACCEPTED").length;
  const lastWeekAccepted = lastWeekSubs.filter((s) => s.status === "ACCEPTED").length;
  const thisWeekRate = recentSubmissions.length > 0 ? thisWeekAccepted / recentSubmissions.length : null;
  const lastWeekRate = lastWeekSubs.length > 0 ? lastWeekAccepted / lastWeekSubs.length : null;
  const acceptanceRateDelta: number | null =
    thisWeekRate !== null && lastWeekRate !== null ? thisWeekRate - lastWeekRate : null;

  // Workflow quality
  const needsRevisionCount = allSubmissions.filter((s) => s.status === "NEEDS_REVISION").length;
  const avgRevisionRate = totalSubmissions > 0 ? needsRevisionCount / totalSubmissions : 0;
  const failedTaskCount = delegatedTasks.filter((t) => t.status === "FAILED").length;

  // Execution health
  const finishedRuns = recentRuns.filter((r) => r.status === "FINISHED").length;
  const totalRuns = recentRuns.length;
  const runSuccessRate = totalRuns > 0 ? finishedRuns / totalRuns : 0;

  // Runner job health (last 30 days)
  const runnerSucceeded = runnerJobs.filter((j) => j.status === "SUCCEEDED").length;
  const runnerFailed = runnerJobs.filter((j) => j.status === "FAILED").length;
  const runnerTotal = runnerJobs.length;
  const runnerJobStats: RunnerJobStats = {
    total: runnerTotal,
    succeeded: runnerSucceeded,
    failed: runnerFailed,
    successRate: runnerTotal > 0 ? runnerSucceeded / runnerTotal : 0,
  };

  // Daily activity — covers the full range (heatmap handles large spans via overflow-x)
  // For lifetime, derive the span from the earliest delegated task or submission.
  let chartDays = isLifetime ? 0 : rangeDays;
  if (isLifetime) {
    const earliest = recentDelegatedTasks.reduce<Date | null>((min, t) => (!min || t.createdAt < min ? t.createdAt : min), null)
      ?? allSubmissions.reduce<Date | null>((min, s) => (!min || s.createdAt < min ? s.createdAt : min), null);
    chartDays = earliest ? Math.ceil((now.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)) + 1 : 30;
  }
  const dateLabels: string[] = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateLabels.push(d.toISOString().slice(0, 10));
  }
  const tasksByDay = new Map<string, number>();
  for (const t of recentDelegatedTasks) {
    const day = t.createdAt.toISOString().slice(0, 10);
    tasksByDay.set(day, (tasksByDay.get(day) ?? 0) + 1);
  }
  const submissionsByDay = new Map<string, number>();
  for (const s of allSubmissions) {
    const day = s.createdAt.toISOString().slice(0, 10);
    if (day >= dateLabels[0]) {
      submissionsByDay.set(day, (submissionsByDay.get(day) ?? 0) + 1);
    }
  }
  const dailyActivity: DailyActivityPoint[] = dateLabels.map((date) => ({
    date,
    tasks: tasksByDay.get(date) ?? 0,
    submissions: submissionsByDay.get(date) ?? 0,
  }));

  // 8-week acceptance rate trend (fixed window, not affected by rangeDays)
  const weeklyAcceptanceTrend: WeeklyAcceptancePoint[] = [];
  for (let w = 7; w >= 0; w--) {
    const wStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const wSubs = allSubmissions.filter((s) => s.createdAt >= wStart && s.createdAt < wEnd);
    const wAccepted = wSubs.filter((s) => s.status === "ACCEPTED").length;
    weeklyAcceptanceTrend.push({
      weekStart: wStart.toISOString().slice(0, 10),
      submissions: wSubs.length,
      accepted: wAccepted,
      rate: wSubs.length > 0 ? wAccepted / wSubs.length : 0,
    });
  }

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

  // Local AI usage
  const localAiUsage = {
    requestCount: ollamaRaw.requestCount,
    promptTokens: ollamaRaw.promptTokens,
    completionTokens: ollamaRaw.completionTokens,
    cloudEquivalents: CLOUD_PRICING.map((p) => ({
      label: p.label,
      usd: estimateCloudCost(ollamaRaw.promptTokens, ollamaRaw.completionTokens, p),
    })),
  };

  // Per-agent period comparison: split rangeDays into two halves to detect improvement
  const halfMs = (rangeDays / 2) * 24 * 60 * 60 * 1000;
  const halfAgo = new Date(now.getTime() - halfMs);
  const firstHalfByKind = new Map<string, { total: number; accepted: number }>();
  const secondHalfByKind = new Map<string, { total: number; accepted: number }>();
  for (const s of allSubmissions) {
    if (s.createdAt < rangeAgo) continue;
    const key = String(s.agentKind);
    if (s.createdAt < halfAgo) {
      const e = firstHalfByKind.get(key) ?? { total: 0, accepted: 0 };
      e.total++;
      if (s.status === "ACCEPTED") e.accepted++;
      firstHalfByKind.set(key, e);
    } else {
      const e = secondHalfByKind.get(key) ?? { total: 0, accepted: 0 };
      e.total++;
      if (s.status === "ACCEPTED") e.accepted++;
      secondHalfByKind.set(key, e);
    }
  }

  // Per-agent rows
  const submissionsByKind = new Map<string, { total: number; accepted: number }>();
  for (const s of allSubmissions) {
    const key = String(s.agentKind);
    const entry = submissionsByKind.get(key) ?? { total: 0, accepted: 0 };
    entry.total++;
    if (s.status === "ACCEPTED") entry.accepted++;
    submissionsByKind.set(key, entry);
  }

  const delegatedByTarget = new Map<string, { done: number; total: number }>();
  for (const t of delegatedTasks) {
    const key = t.toAgentTarget;
    const entry = delegatedByTarget.get(key) ?? { done: 0, total: 0 };
    entry.total++;
    if (t.status === "DONE") entry.done++;
    delegatedByTarget.set(key, entry);
  }

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

    const firstHalf = firstHalfByKind.get(kindKey) ?? { total: 0, accepted: 0 };
    const secondHalf = secondHalfByKind.get(kindKey) ?? { total: 0, accepted: 0 };
    // Require at least 3 submissions in each half to avoid noisy single-sample comparisons
    const firstRate = firstHalf.total >= 3 ? firstHalf.accepted / firstHalf.total : null;
    const secondRate = secondHalf.total >= 3 ? secondHalf.accepted / secondHalf.total : null;
    const acceptanceRateDelta =
      firstRate !== null && secondRate !== null ? secondRate - firstRate : null;

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
      acceptanceRateDelta,
    };
  });

  return {
    submissionsThisWeek,
    acceptanceRate,
    openApprovals,
    apiSpendThisMonth,
    acceptanceRateDelta,
    agentRows,
    totalSubmissions,
    needsRevisionCount,
    avgRevisionRate,
    failedTaskCount,
    runSuccessRate,
    projectHealthCounts,
    runnerJobStats,
    providerUsage,
    localAiUsage,
    dailyActivity,
    weeklyAcceptanceTrend,
  };
}
