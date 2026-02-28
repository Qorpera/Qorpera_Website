import { AgentKind, AgentTriggerMode, BusinessLogCategory, BusinessLogSource, DelegatedTaskStatus, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runIntegrationAdaptersForTask } from "@/lib/integration-adapters";
import { callAgentLlm, type AgentLlmResult } from "@/lib/agent-llm";
import { getCompanySoul, type CompanySoulProfile } from "@/lib/company-soul-store";
import { listBusinessLogs } from "@/lib/business-logs-store";
import { eventBus } from "@/lib/event-bus";
import { getToolsForAgentKind } from "@/lib/tool-registry";
import { runAgenticLoop, type AgenticStreamEvent } from "@/lib/agentic-loop";
import { getEnabledSkillContents } from "@/lib/skills-store";
import { getAppPreferences } from "@/lib/settings-store";
import { getAgentMemoryIndex, ingestTaskCompletion } from "@/lib/agent-memory-store";
import { notifyApprovalNeeded, notifySubmissionReady, notifyTaskCompleted, notifyTaskFailed } from "@/lib/notifications";
import { runOptimizerIfDue } from "@/lib/optimizer";
import { getAppliedPatches } from "@/lib/optimizer/optimizer-store";

export type AgentTarget =
  | "CHIEF_ADVISOR"
  | "ASSISTANT"
  | "SALES_REP"
  | "CUSTOMER_SUCCESS"
  | "MARKETING_COORDINATOR"
  | "FINANCE_ANALYST"
  | "OPERATIONS_MANAGER"
  | "EXECUTIVE_ASSISTANT"
  | "RESEARCH_ANALYST"
  | "SEO_SPECIALIST";

export type WorkerAgentTarget = Exclude<AgentTarget, "CHIEF_ADVISOR">;

export type AgentAutomationConfigView = {
  agentTarget: AgentTarget;
  triggerMode: "MANUAL" | "DELEGATED" | "SCHEDULED" | "HYBRID";
  wakeOnDelegation: boolean;
  scheduleEnabled: boolean;
  dailyTimes: string[];
  timezone: string;
  runContinuously: boolean;
  heartbeatEnabled: boolean;
  heartbeatIntervalMin: number;
  maxLoopIterations: number;
  maxAgentCallsPerRun: number;
  maxToolRetries: number;
  maxRuntimeSeconds: number;
  requireApprovalForExternalActions: boolean;
  allowAgentDelegation: boolean;
  integrations: string[];
  notes: string;
  updatedAt: string | null;
};

export type DelegatedTaskView = {
  id: string;
  fromAgent: string;
  toAgentTarget: AgentTarget;
  title: string;
  instructions: string;
  status: keyof typeof DelegatedTaskStatus;
  triggerSource: string;
  scheduledFor: string | null;
  dueLabel: string | null;
  projectRef: string | null;
  inputFromTaskId: string | null;
  chainDepth: number;
  webhookEventId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  traces?: Array<{
    id: string;
    toolName: string;
    phase: string;
    status: string;
    latencyMs: number | null;
    inputSummary: string | null;
    outputSummary: string | null;
    createdAt: string;
  }>;
};

const DEFAULT_CONFIGS: Record<AgentTarget, AgentAutomationConfigView> = {
  CHIEF_ADVISOR: {
    agentTarget: "CHIEF_ADVISOR",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["08:00", "13:00", "17:00"],
    timezone: "UTC",
    runContinuously: true,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 10,
    maxAgentCallsPerRun: 12,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["business_files", "business_logs", "review_queue", "projects"],
    notes: "Primary advisor with broad business memory. Reviews company state before delegating.",
    updatedAt: null,
  },
  ASSISTANT: {
    agentTarget: "ASSISTANT",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["09:00", "14:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 8,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["email", "crm", "browser", "files"],
    notes: "Handles support/admin work and wakes on delegated queue items.",
    updatedAt: null,
  },
  SALES_REP: {
    agentTarget: "SALES_REP",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["09:00", "15:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 8,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["email", "crm", "browser", "business_logs"],
    notes: "Handles outbound prospecting, research, and pipeline updates. Requires approval before sending outreach.",
    updatedAt: null,
  },
  CUSTOMER_SUCCESS: {
    agentTarget: "CUSTOMER_SUCCESS",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["09:30", "14:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 8,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["email", "crm", "files", "business_logs"],
    notes: "Monitors customer health, preps check-ins and renewal briefs, escalates at-risk accounts.",
    updatedAt: null,
  },
  MARKETING_COORDINATOR: {
    agentTarget: "MARKETING_COORDINATOR",
    triggerMode: "SCHEDULED",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["09:00", "17:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 10,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["email", "browser", "files", "business_logs"],
    notes: "Produces content drafts, campaign summaries, and email sequences. Nothing goes live without approval.",
    updatedAt: null,
  },
  FINANCE_ANALYST: {
    agentTarget: "FINANCE_ANALYST",
    triggerMode: "SCHEDULED",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["08:00", "17:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 10,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: false,
    integrations: ["files", "business_logs", "sheets"],
    notes: "Runs financial reports, categorizes expenses, and prepares invoice drafts on schedule.",
    updatedAt: null,
  },
  OPERATIONS_MANAGER: {
    agentTarget: "OPERATIONS_MANAGER",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["08:30", "16:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 10,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: true,
    integrations: ["files", "business_logs", "email", "browser"],
    notes: "Maintains process docs, coordinates vendor comms, and surfaces operational blockers.",
    updatedAt: null,
  },
  EXECUTIVE_ASSISTANT: {
    agentTarget: "EXECUTIVE_ASSISTANT",
    triggerMode: "HYBRID",
    wakeOnDelegation: true,
    scheduleEnabled: true,
    dailyTimes: ["08:00", "12:00", "17:00"],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 8,
    maxAgentCallsPerRun: 10,
    maxToolRetries: 2,
    maxRuntimeSeconds: 300,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: false,
    integrations: ["email", "files", "business_logs", "review_queue"],
    notes: "Triages inbox, preps meeting notes, tracks action items, and drafts communications.",
    updatedAt: null,
  },
  RESEARCH_ANALYST: {
    agentTarget: "RESEARCH_ANALYST",
    triggerMode: "DELEGATED",
    wakeOnDelegation: true,
    scheduleEnabled: false,
    dailyTimes: [],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 12,
    maxAgentCallsPerRun: 15,
    maxToolRetries: 2,
    maxRuntimeSeconds: 600,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: false,
    integrations: ["browser", "business_logs", "files"],
    notes: "Searches the web, validates findings, and produces structured research reports. Uses cloud model for quality review.",
    updatedAt: null,
  },
  SEO_SPECIALIST: {
    agentTarget: "SEO_SPECIALIST",
    triggerMode: "DELEGATED",
    wakeOnDelegation: true,
    scheduleEnabled: false,
    dailyTimes: [],
    timezone: "UTC",
    runContinuously: false,
    heartbeatEnabled: false,
    heartbeatIntervalMin: 15,
    maxLoopIterations: 12,
    maxAgentCallsPerRun: 15,
    maxToolRetries: 2,
    maxRuntimeSeconds: 600,
    requireApprovalForExternalActions: true,
    allowAgentDelegation: false,
    integrations: ["browser", "business_logs", "files"],
    notes: "Crawls and audits pages, researches keywords, analyzes competitors, and produces SEO optimization recommendations.",
    updatedAt: null,
  },
};

async function isAgentTargetAvailableToUser(userId: string, target: AgentTarget) {
  if (target === "CHIEF_ADVISOR") return true;
  const hired = await prisma.hiredJob.findFirst({
    where: { userId, agentKind: target, enabled: true },
    select: { id: true },
  });
  return Boolean(hired);
}

export async function getAvailableWorkerAgentTargetsForUser(userId: string): Promise<WorkerAgentTarget[]> {
  const rows = await prisma.hiredJob.findMany({
    where: { userId, enabled: true },
    select: { agentKind: true },
    distinct: ["agentKind"],
  });
  return rows.map((r) => r.agentKind as WorkerAgentTarget);
}

function parseCsv(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toConfigView(row: {
  agentTarget: string;
  triggerMode: AgentTriggerMode;
  wakeOnDelegation: boolean;
  scheduleEnabled: boolean;
  dailyTimesCsv: string;
  timezone: string;
  runContinuously: boolean;
  heartbeatEnabled: boolean;
  heartbeatIntervalMin: number;
  maxLoopIterations: number;
  maxAgentCallsPerRun: number;
  maxToolRetries: number;
  maxRuntimeSeconds: number;
  requireApprovalForExternalActions: boolean;
  allowAgentDelegation: boolean;
  integrationsCsv: string;
  notes: string;
  updatedAt: Date;
}): AgentAutomationConfigView {
  return {
    agentTarget: row.agentTarget as AgentTarget,
    triggerMode: row.triggerMode as AgentAutomationConfigView["triggerMode"],
    wakeOnDelegation: row.wakeOnDelegation,
    scheduleEnabled: row.scheduleEnabled,
    dailyTimes: parseCsv(row.dailyTimesCsv),
    timezone: row.timezone,
    runContinuously: row.runContinuously,
    heartbeatEnabled: row.heartbeatEnabled,
    heartbeatIntervalMin: row.heartbeatIntervalMin,
    maxLoopIterations: row.maxLoopIterations,
    maxAgentCallsPerRun: row.maxAgentCallsPerRun,
    maxToolRetries: row.maxToolRetries,
    maxRuntimeSeconds: row.maxRuntimeSeconds,
    requireApprovalForExternalActions: row.requireApprovalForExternalActions,
    allowAgentDelegation: row.allowAgentDelegation,
    integrations: parseCsv(row.integrationsCsv),
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toTaskView(row: {
  id: string;
  fromAgent: string;
  toAgentTarget: string;
  title: string;
  instructions: string;
  status: DelegatedTaskStatus;
  triggerSource: string;
  scheduledFor: Date | null;
  dueLabel: string | null;
  projectRef: string | null;
  inputFromTaskId: string | null;
  chainDepth: number;
  webhookEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  toolCalls?: Array<{
    id: string;
    toolName: string;
    phase: string;
    status: string;
    latencyMs: number | null;
    inputSummary: string | null;
    outputSummary: string | null;
    createdAt: Date;
  }>;
}): DelegatedTaskView {
  return {
    id: row.id,
    fromAgent: row.fromAgent,
    toAgentTarget: row.toAgentTarget as AgentTarget,
    title: row.title,
    instructions: row.instructions,
    status: row.status,
    triggerSource: row.triggerSource,
    scheduledFor: row.scheduledFor?.toISOString() ?? null,
    dueLabel: row.dueLabel,
    projectRef: row.projectRef,
    inputFromTaskId: row.inputFromTaskId,
    chainDepth: row.chainDepth,
    webhookEventId: row.webhookEventId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    traces: row.toolCalls?.map((t) => ({
      id: t.id,
      toolName: t.toolName,
      phase: t.phase,
      status: t.status,
      latencyMs: t.latencyMs,
      inputSummary: t.inputSummary,
      outputSummary: t.outputSummary,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function getAgentAutomationConfig(userId: string, agentTarget: AgentTarget): Promise<AgentAutomationConfigView> {
  const row = await prisma.agentAutomationConfig.findUnique({
    where: { userId_agentTarget: { userId, agentTarget } },
  });
  return row ? toConfigView(row) : DEFAULT_CONFIGS[agentTarget];
}

export async function getAllAgentAutomationConfigs(userId: string) {
  const rows = await prisma.agentAutomationConfig.findMany({ where: { userId } });
  const byTarget = new Map(rows.map((r) => [r.agentTarget, toConfigView(r)]));
  return {
    CHIEF_ADVISOR: (byTarget.get("CHIEF_ADVISOR") as AgentAutomationConfigView | undefined) ?? DEFAULT_CONFIGS.CHIEF_ADVISOR,
    ASSISTANT: (byTarget.get("ASSISTANT") as AgentAutomationConfigView | undefined) ?? DEFAULT_CONFIGS.ASSISTANT,
  };
}

export async function upsertAgentAutomationConfig(
  userId: string,
  agentTarget: AgentTarget,
  patch: Partial<Omit<AgentAutomationConfigView, "agentTarget" | "updatedAt">>,
) {
  const base = await getAgentAutomationConfig(userId, agentTarget);
  const next = { ...base, ...patch };
  const row = await prisma.agentAutomationConfig.upsert({
    where: { userId_agentTarget: { userId, agentTarget } },
    update: {
      triggerMode: next.triggerMode as AgentTriggerMode,
      wakeOnDelegation: Boolean(next.wakeOnDelegation),
      scheduleEnabled: Boolean(next.scheduleEnabled),
      dailyTimesCsv: (next.dailyTimes ?? []).join(","),
      timezone: (next.timezone ?? "UTC").slice(0, 80),
      runContinuously: Boolean(next.runContinuously),
      heartbeatEnabled: Boolean(next.heartbeatEnabled),
      heartbeatIntervalMin: Math.max(5, Math.min(60, Number(next.heartbeatIntervalMin ?? 15) || 15)),
      maxLoopIterations: Math.max(1, Math.min(20, Number(next.maxLoopIterations ?? 3) || 3)),
      maxAgentCallsPerRun: Math.max(1, Math.min(30, Number(next.maxAgentCallsPerRun ?? 6) || 6)),
      maxToolRetries: Math.max(0, Math.min(5, Number(next.maxToolRetries ?? 2) || 0)),
      maxRuntimeSeconds: Math.max(15, Math.min(14400, Number(next.maxRuntimeSeconds ?? 120) || 120)),
      requireApprovalForExternalActions: Boolean(next.requireApprovalForExternalActions ?? true),
      allowAgentDelegation: Boolean(next.allowAgentDelegation ?? true),
      integrationsCsv: (next.integrations ?? []).join(","),
      notes: (next.notes ?? "").slice(0, 2000),
    },
    create: {
      userId,
      agentTarget,
      triggerMode: next.triggerMode as AgentTriggerMode,
      wakeOnDelegation: Boolean(next.wakeOnDelegation),
      scheduleEnabled: Boolean(next.scheduleEnabled),
      dailyTimesCsv: (next.dailyTimes ?? []).join(","),
      timezone: (next.timezone ?? "UTC").slice(0, 80),
      runContinuously: Boolean(next.runContinuously),
      heartbeatEnabled: Boolean(next.heartbeatEnabled),
      heartbeatIntervalMin: Math.max(5, Math.min(60, Number(next.heartbeatIntervalMin ?? 15) || 15)),
      maxLoopIterations: Math.max(1, Math.min(20, Number(next.maxLoopIterations ?? 3) || 3)),
      maxAgentCallsPerRun: Math.max(1, Math.min(30, Number(next.maxAgentCallsPerRun ?? 6) || 6)),
      maxToolRetries: Math.max(0, Math.min(5, Number(next.maxToolRetries ?? 2) || 0)),
      maxRuntimeSeconds: Math.max(15, Math.min(14400, Number(next.maxRuntimeSeconds ?? 120) || 120)),
      requireApprovalForExternalActions: Boolean(next.requireApprovalForExternalActions ?? true),
      allowAgentDelegation: Boolean(next.allowAgentDelegation ?? true),
      integrationsCsv: (next.integrations ?? []).join(","),
      notes: (next.notes ?? "").slice(0, 2000),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "AGENT_AUTOMATION",
      entityId: row.id,
      action: "UPSERT",
      summary: `Updated automation config for ${agentTarget}`,
      metadata: JSON.stringify({
        triggerMode: row.triggerMode,
        scheduleEnabled: row.scheduleEnabled,
        runContinuously: row.runContinuously,
        maxLoopIterations: row.maxLoopIterations,
        maxAgentCallsPerRun: row.maxAgentCallsPerRun,
        maxToolRetries: row.maxToolRetries,
        maxRuntimeSeconds: row.maxRuntimeSeconds,
        requireApprovalForExternalActions: row.requireApprovalForExternalActions,
      }),
    },
  });

  return toConfigView(row);
}

export async function listDelegatedTasks(userId: string, take = 100) {
  const rows = await prisma.delegatedTask.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      toolCalls: {
        orderBy: { createdAt: "asc" },
        take: 8,
      },
    },
  });
  return rows.map(toTaskView);
}

export async function createDelegatedTask(
  userId: string,
  input: {
    fromAgent?: string;
    toAgentTarget: AgentTarget;
    title: string;
    instructions: string;
    triggerSource?: string;
    dueLabel?: string | null;
    projectRef?: string | null;
    scheduledFor?: Date | null;
    inputFromTaskId?: string | null;
    chainDepth?: number;
    webhookEventId?: string | null;
    escalatedFromId?: string | null;
  },
) {
  const title = input.title.trim().slice(0, 240);
  const instructions = input.instructions.trim().slice(0, 12000);
  if (!title || !instructions) throw new Error("Title and instructions are required");
  if (!(await isAgentTargetAvailableToUser(userId, input.toAgentTarget))) {
    throw new Error(`${input.toAgentTarget.replaceAll("_", " ")} is not hired for this workspace`);
  }
  const triggerSource = (input.triggerSource ?? "DELEGATED").slice(0, 60);
  if (triggerSource === "DELEGATED") {
    const cfg = await getAgentAutomationConfig(userId, input.toAgentTarget);
    if (!cfg.allowAgentDelegation) {
      throw new Error(`${input.toAgentTarget.replaceAll("_", " ")} does not accept agent-to-agent delegation right now`);
    }
  }

  // Per-agent monthly task budget check (item 3)
  const prefs = await getAppPreferences(userId);
  const budget = prefs.agentBudgets[input.toAgentTarget];
  if (budget?.monthlyTaskLimit) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthCount = await prisma.delegatedTask.count({
      where: { userId, toAgentTarget: input.toAgentTarget, createdAt: { gte: monthStart } },
    });
    if (monthCount >= budget.monthlyTaskLimit) {
      throw new Error(
        `Monthly task limit reached for ${input.toAgentTarget.replaceAll("_", " ")} ` +
        `(${monthCount}/${budget.monthlyTaskLimit}). Adjust limits in Settings → Preferences.`
      );
    }
  }

  const row = await prisma.delegatedTask.create({
    data: {
      userId,
      fromAgent: (input.fromAgent ?? "CHIEF_ADVISOR").slice(0, 80),
      toAgentTarget: input.toAgentTarget,
      title,
      instructions,
      triggerSource,
      dueLabel: input.dueLabel?.slice(0, 120) ?? null,
      projectRef: input.projectRef?.slice(0, 240) ?? null,
      scheduledFor: input.scheduledFor ?? null,
      inputFromTaskId: input.inputFromTaskId ?? null,
      chainDepth: input.chainDepth ?? 0,
      webhookEventId: input.webhookEventId ?? null,
      escalatedFromId: input.escalatedFromId ?? null,
      status: DelegatedTaskStatus.QUEUED,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "DELEGATED_TASK",
      entityId: row.id,
      action: "CREATE",
      summary: `${row.fromAgent} delegated "${row.title}" to ${row.toAgentTarget}`,
      metadata: JSON.stringify({ triggerSource: row.triggerSource, scheduledFor: row.scheduledFor?.toISOString() ?? null }),
    },
  });

  eventBus.emit({
    type: "DELEGATED_TASK_CREATED",
    userId,
    taskId: row.id,
    fromAgent: row.fromAgent,
    toAgentTarget: row.toAgentTarget,
    title: row.title,
  });

  return toTaskView(row);
}

const VALID_TASK_TRANSITIONS: Record<string, Set<string>> = {
  QUEUED:  new Set(["RUNNING", "PAUSED", "FAILED"]),
  RUNNING: new Set(["DONE", "REVIEW", "FAILED", "PAUSED", "QUEUED"]),
  REVIEW:  new Set(["DONE", "FAILED"]),
  PAUSED:  new Set(["QUEUED", "FAILED"]),
  FAILED:  new Set(["QUEUED"]), // manual retry
  DONE:    new Set<string>(),   // terminal
};

export async function updateDelegatedTaskStatus(
  userId: string,
  id: string,
  status: keyof typeof DelegatedTaskStatus,
) {
  const nextStatus = DelegatedTaskStatus[status];
  if (!nextStatus) throw new Error("Invalid status");
  const row = await prisma.delegatedTask.findFirst({ where: { id, userId } });
  if (!row) throw new Error("Task not found");

  const allowed = VALID_TASK_TRANSITIONS[row.status];
  if (!allowed?.has(nextStatus)) {
    throw new Error(`Cannot transition from ${row.status} to ${nextStatus}`);
  }

  const isTerminal = nextStatus === DelegatedTaskStatus.DONE || nextStatus === DelegatedTaskStatus.FAILED;
  const updated = await prisma.delegatedTask.update({
    where: { id },
    data: {
      status: nextStatus,
      completedAt: isTerminal ? (row.completedAt ?? new Date()) : row.completedAt,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      scope: "DELEGATED_TASK",
      entityId: id,
      action: "STATUS",
      summary: `Delegated task "${updated.title}" -> ${status}`,
    },
  });
  return toTaskView(updated);
}

function minutesUtcNow() {
  const d = new Date();
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export async function runSchedulerTick(userId: string) {
  const nowKey = minutesUtcNow();
  const configs = await prisma.agentAutomationConfig.findMany({
    where: { userId, scheduleEnabled: true, triggerMode: { in: [AgentTriggerMode.SCHEDULED, AgentTriggerMode.HYBRID] } },
  });
  const created: DelegatedTaskView[] = [];

  for (const cfg of configs) {
    const times = parseCsv(cfg.dailyTimesCsv);
    if (!times.includes(nowKey)) continue;
    const existing = await prisma.delegatedTask.findFirst({
      where: {
        userId,
        toAgentTarget: cfg.agentTarget,
        triggerSource: "SCHEDULED",
        status: { in: [DelegatedTaskStatus.QUEUED, DelegatedTaskStatus.RUNNING, DelegatedTaskStatus.REVIEW] },
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 30) },
      },
    });
    if (existing) continue;
    try {
      const task = await createDelegatedTask(userId, {
        fromAgent: "SCHEDULER",
        toAgentTarget: cfg.agentTarget as AgentTarget,
        title: `${cfg.agentTarget.replaceAll("_", " ")} scheduled wake`,
        instructions: `Scheduled wake tick at ${nowKey} ${cfg.timezone}. Review inbox, delegated queue, and active projects. Continue existing work or propose next actions.`,
        triggerSource: "SCHEDULED",
        dueLabel: "Now",
      });
      created.push(task);
    } catch (e: unknown) {
      await prisma.auditLog.create({
        data: {
          userId,
          scope: "SCHEDULER",
          entityId: String(cfg.id),
          action: "SKIP",
          summary:
            e instanceof Error && /not hired/i.test(e.message)
              ? `Skipped scheduled wake for ${cfg.agentTarget} (agent not hired)`
              : `Skipped scheduled wake for ${cfg.agentTarget}`,
          metadata: JSON.stringify({ reason: e instanceof Error ? e.message : "unknown", nowKey }),
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "SCHEDULER",
      entityId: "tick",
      action: "TICK",
      summary: `Scheduler tick ran at ${nowKey} UTC (${created.length} tasks created)`,
    },
  });

  // Fire optimizer if due — runs in background, doesn't block scheduler tick
  runOptimizerIfDue(userId).catch((e) => {
    console.error("[scheduler] optimizer error:", e);
  });

  // Run heartbeat tick — checks agents with heartbeat mode enabled
  const heartbeatCreated = await runHeartbeatTick(userId).catch((e) => {
    console.error("[scheduler] heartbeat error:", e);
    return [] as DelegatedTaskView[];
  });
  created.push(...heartbeatCreated);

  // Process queued webhook events — fire-and-forget, doesn't delay response
  void (async () => {
    try {
      const { processWebhookEvents } = await import("@/lib/event-orchestrator");
      const count = await processWebhookEvents(userId, 5);
      if (count > 0) {
        await prisma.auditLog.create({
          data: {
            userId,
            scope: "SCHEDULER",
            entityId: "event-orchestrator",
            action: "PROCESS_EVENTS",
            summary: `Processed ${count} webhook event(s)`,
          },
        });
      }
    } catch (e) {
      console.error("[scheduler] event orchestrator error:", e);
    }
  })();

  // Fire due user-defined schedules
  try {
    const { getSchedulesDue, markScheduleRan } = await import("@/lib/schedule-store");
    const dueSchedules = await getSchedulesDue(userId);
    for (const sched of dueSchedules) {
      try {
        await createDelegatedTask(userId, {
          fromAgent: "SYSTEM",
          toAgentTarget: sched.agentKind as AgentTarget,
          title: sched.title,
          instructions: sched.instructions,
          triggerSource: "SCHEDULED",
        });
        await markScheduleRan(sched.id);
      } catch (e: unknown) {
        await prisma.auditLog.create({
          data: {
            userId,
            scope: "SCHEDULER",
            entityId: sched.id,
            action: "SCHEDULE_SKIP",
            summary:
              e instanceof Error && /not hired/i.test(e.message)
                ? `Skipped schedule "${sched.title}" for ${sched.agentKind} (agent not hired)`
                : `Skipped schedule "${sched.title}" for ${sched.agentKind}`,
            metadata: JSON.stringify({ reason: e instanceof Error ? e.message : "unknown" }),
          },
        });
      }
    }
  } catch (e) {
    console.error("[scheduler] schedule-store error:", e);
  }

  return { utcTime: nowKey, created };
}

export async function runHeartbeatTick(userId: string): Promise<DelegatedTaskView[]> {
  // Sweep stale RUNNING tasks first — requeue or fail them so they're
  // available for pickup in this tick's normal queue execution.
  const { sweepStaleTasks } = await import("@/lib/heartbeat-precheck");
  await sweepStaleTasks(userId).catch((e) =>
    console.error("[heartbeat] stale-task sweep error:", e),
  );

  // Mark dead runners OFFLINE and requeue their orphaned jobs
  const { sweepStaleRunners } = await import("@/lib/runner-control-plane");
  await sweepStaleRunners(userId).catch((e) =>
    console.error("[heartbeat] stale-runner sweep error:", e),
  );

  const configs = await prisma.agentAutomationConfig.findMany({
    where: { userId, heartbeatEnabled: true, scheduleEnabled: true },
  });
  const created: DelegatedTaskView[] = [];

  for (const cfg of configs) {
    const intervalMs = (cfg.heartbeatIntervalMin || 15) * 60 * 1000;

    // Skip if there's already a heartbeat task in-flight within the interval window
    const existing = await prisma.delegatedTask.findFirst({
      where: {
        userId,
        toAgentTarget: cfg.agentTarget,
        triggerSource: "HEARTBEAT",
        status: { in: [DelegatedTaskStatus.QUEUED, DelegatedTaskStatus.RUNNING] },
        createdAt: { gte: new Date(Date.now() - intervalMs) },
      },
    });
    if (existing) continue;

    // Skip if last completed heartbeat was too recent
    const lastCompleted = await prisma.delegatedTask.findFirst({
      where: {
        userId,
        toAgentTarget: cfg.agentTarget,
        triggerSource: "HEARTBEAT",
        status: { in: [DelegatedTaskStatus.DONE, DelegatedTaskStatus.REVIEW] },
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
    if (lastCompleted?.completedAt && Date.now() - lastCompleted.completedAt.getTime() < intervalMs) continue;

    // Run pre-check to avoid unnecessary LLM cost
    const { runHeartbeatPrecheck } = await import("@/lib/heartbeat-precheck");
    const precheck = await runHeartbeatPrecheck(userId, cfg.agentTarget);

    // Log the heartbeat check result
    await prisma.heartbeatLog.create({
      data: {
        userId,
        agentTarget: cfg.agentTarget,
        checkResult: precheck.shouldWake ? "WAKE" : "SKIP",
        signalsFound: precheck.signals.length > 0 ? precheck.signals.join("; ") : null,
        llmSavedMs: precheck.shouldWake ? 0 : 15000, // rough estimate of LLM call saved
      },
    });

    if (!precheck.shouldWake) continue;

    try {
      const signalSummary = precheck.signals.length > 0
        ? `\n\nSignals detected:\n${precheck.signals.map((s) => `- ${s}`).join("\n")}`
        : "";
      const task = await createDelegatedTask(userId, {
        fromAgent: "HEARTBEAT",
        toAgentTarget: cfg.agentTarget as AgentTarget,
        title: `${cfg.agentTarget.replaceAll("_", " ")} heartbeat wake`,
        instructions: `Heartbeat wake (every ${cfg.heartbeatIntervalMin}min). Check for pending work, review inbox, and continue any active tasks.${signalSummary}`,
        triggerSource: "HEARTBEAT",
        dueLabel: "Now",
      });
      created.push(task);
    } catch {
      // Agent not hired or other issue — skip silently
    }
  }

  return created;
}

function delegatedTaskNeedsReview(task: {
  title: string;
  instructions: string;
  toAgentTarget: string;
}) {
  const text = `${task.title}\n${task.instructions}`.toLowerCase();
  return /(email|send|publish|post|meta|customer|external|crm write|update crm|message)/.test(text);
}

function synthesizeDelegatedOutput(task: {
  title: string;
  instructions: string;
  toAgentTarget: string;
}, memoryFindings: string[] = [], loopMeta?: { iteration: number; planStep?: string; reviewerIssues?: string[] }) {
  const targetLabel = task.toAgentTarget.replaceAll("_", " ").toLowerCase();
  const findings = memoryFindings.slice(0, 6);
  const lines = [
    `Processed delegated task for ${targetLabel}: ${task.title}.`,
    ...(loopMeta ? [`Loop iteration: ${loopMeta.iteration}.`] : []),
    ...(loopMeta?.planStep ? [`Planned step: ${loopMeta.planStep}`] : []),
    "What I did:",
    `- Reviewed instructions and identified the intended outcome and constraints.`,
    `- Retrieved relevant business context and current operational signals.`,
    `- Prepared a structured draft/result for the requested work.`,
    `- Flagged approval-sensitive actions before external execution.`,
    ...(findings.length
      ? ["Context used:", ...findings.map((f) => `- ${f}`)]
      : ["Context used:", "- No additional company-memory matches were retrieved for this task."]),
    ...(loopMeta?.reviewerIssues?.length ? ["Reviewer issues carried into this pass:", ...loopMeta.reviewerIssues.map((i) => `- ${i}`)] : []),
    "Output summary:",
    `- ${task.instructions.slice(0, 350)}${task.instructions.length > 350 ? "…" : ""}`,
    "Recommended next step:",
    delegatedTaskNeedsReview(task)
      ? "- Review the output and approve external actions before execution."
      : "- Mark complete or delegate a follow-up refinement task if needed.",
  ];
  return lines.join("\n");
}

function buildDelegatedLoopPlan(task: { title: string; instructions: string }, iteration: number, priorIssues: string[]) {
  const issueHint = priorIssues.length ? ` Address reviewer issues: ${priorIssues.slice(0, 3).join("; ")}.` : "";
  return `Iteration ${iteration}: produce one clear draft/result for "${task.title}" with explicit constraints and approval-sensitive flags.${issueHint}`;
}

function reviewDelegatedLoopOutput(input: {
  task: { title: string; instructions: string };
  output: string;
  iteration: number;
  maxIterations: number;
}) {
  const issues: string[] = [];
  if (input.output.length < 220) issues.push("Output is too short; include a clearer result and next step.");
  if (!/Recommended next step:/i.test(input.output)) issues.push("Missing explicit recommended next step section.");
  if (!/Output summary:/i.test(input.output)) issues.push("Missing output summary section.");

  const pass = issues.length === 0;
  if (pass) return { pass: true as const, issues: [], nextAction: "done" as const };
  if (input.iteration >= input.maxIterations) return { pass: false as const, issues, nextAction: "escalate_human" as const };
  return { pass: false as const, issues, nextAction: "retry" as const };
}

const ROLE_INSTRUCTIONS: Partial<Record<AgentTarget, string>> = {
  ASSISTANT:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the general-purpose triage and execution agent.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Assess — Read the task. Determine if it belongs to a specialist domain (sales, finance, ops, marketing, CS, executive). If yes, delegate via delegate_task with full context.\n" +
    "2. Research — Search business logs and files first (authoritative). Use web_fetch only when internal sources are insufficient.\n" +
    "3. Execute — Draft, analyze, or gather data as instructed. Cite specific log entries or file IDs for every factual claim.\n" +
    "4. Deliver — Structure output with 'Output summary:' and 'Recommended next step:' sections.\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Business logs and files (primary — these are the company's operational truth)\n" +
    "2. Inbox items and project details (current state)\n" +
    "3. Web research (supplementary only — always label as external source)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Don't stall on domain ambiguity — if unsure, complete the task yourself rather than bouncing it.\n" +
    "- Don't give generic advice when specific data is available in logs/files.\n" +
    "- Don't delegate simple lookups — only delegate when real specialist expertise is needed.",
  SALES_REP:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the sales and prospecting specialist.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Research — Gather prospect information. Check business logs (category SALES) for prior pipeline activity. Use web_fetch for company profiles, news, and market context.\n" +
    "2. Qualify — Score leads against the company's Ideal Customer Profile (ICP) from Company Soul. Rate fit as Strong / Moderate / Weak with reasoning.\n" +
    "3. Personalize — Draft outreach using prospect-specific pain points and company positioning. Match tone to prospect type (executive = concise/ROI-focused, founder = vision-aligned, technical = specifics-first).\n" +
    "4. Log — Record all pipeline activity as business logs with category SALES. Include: prospect name, score, status (researched/contacted/qualified/converted), and next action.\n" +
    "5. Hand off — When a prospect converts, delegate to CUSTOMER_SUCCESS via delegate_task with full context (history, expectations, commitments made).\n" +
    "\n" +
    "OUTPUT FORMAT:\n" +
    "| Prospect | ICP Score | Key Pain Point | Recommended Approach | Status |\n" +
    "For outreach drafts: Subject line, opening hook (personalized), value prop, CTA, sign-off.\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Business logs category SALES (prior pipeline, past outreach, conversion history)\n" +
    "2. Business files (sales collateral, pricing, case studies)\n" +
    "3. Web research (prospect company data, news, LinkedIn context)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Never send external communications without approval — all emails are gated.\n" +
    "- Don't send mass generic outreach. Every message must reference something specific to the prospect.\n" +
    "- Don't overstate capabilities. Promise only what the Company Soul's core offerings support.\n" +
    "- Don't skip logging — every prospect interaction must be recorded for pipeline continuity.",
  CUSTOMER_SUCCESS:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the customer success and retention specialist.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Assess health — Review business logs for the customer. Look for: engagement frequency, support tickets, renewal dates, last contact. Classify health as Healthy / At Risk / Critical.\n" +
    "2. Identify signals — Flag churn risk indicators: declining engagement, unresolved complaints, delayed renewals, competitor mentions, key contact departure.\n" +
    "3. Prepare — For renewals: compile usage summary, value delivered, expansion opportunities. For at-risk: draft intervention plan with specific save actions.\n" +
    "4. Communicate — Draft customer-facing messages. Tone: warm, professional, solution-oriented. Adapt formality to relationship history.\n" +
    "5. Escalate — If intervention exceeds your authority (pricing, contract terms, executive involvement), delegate via delegate_task with full customer context and risk assessment.\n" +
    "\n" +
    "HEALTH SCORING:\n" +
    "| Customer | Health | Last Contact | Renewal Date | Risk Signals | Recommended Action |\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Business logs (customer interaction history, support cases, feedback)\n" +
    "2. Inbox items (pending customer requests, approvals)\n" +
    "3. Business files (contracts, SLAs, onboarding docs)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Never promise discounts, credits, or contract changes without explicit owner approval.\n" +
    "- Don't hide bad news — if a customer is unhappy, address it directly with a remediation plan.\n" +
    "- Don't send check-in emails with no substance. Every touchpoint should deliver value (insight, update, resource).\n" +
    "- Don't wait for renewal date to engage at-risk accounts — early intervention is always cheaper.",
  MARKETING_COORDINATOR:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the marketing and content specialist.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Brief — Clarify the deliverable: type (blog, email, social, ad copy, campaign plan), audience, goal (awareness, conversion, retention), and constraints.\n" +
    "2. Research — Check business logs for prior campaigns and results. Review Company Soul for brand voice, positioning, and ICP. Use web_fetch for competitive and trend context.\n" +
    "3. Create — Draft content that strictly follows brand voice. Lead with the audience's pain point, not the product. Include a clear CTA.\n" +
    "4. Analyze — For campaign analysis, lead with business impact: pipeline influenced ($), conversion rate (%), reach/engagement. Vanity metrics (impressions, likes) are secondary context only.\n" +
    "5. Submit — Nothing goes live without explicit owner approval. Always submit drafts for review.\n" +
    "\n" +
    "OUTPUT FORMAT:\n" +
    "Content drafts: [Type] [Audience] [Goal] header, then the content, then 'Compliance notes:' for any claims that need verification.\n" +
    "Campaign analysis: | Campaign | Pipeline Influenced | Conversion Rate | Cost per Acquisition | Key Insight |\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Company Soul (brand voice, positioning — this is the style authority)\n" +
    "2. Business logs category MARKETING (prior campaigns, results, calendars)\n" +
    "3. Business files (brand assets, style guides, templates)\n" +
    "4. Web research (competitive landscape, trend data — always cite source)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Don't deviate from brand voice. If Company Soul defines a tone, follow it exactly.\n" +
    "- Don't publish metrics without context — a 2% conversion rate means nothing without the benchmark.\n" +
    "- Don't create content that makes unverifiable claims. Flag anything that needs fact-checking.\n" +
    "- Use Figma tools when design assets are referenced. Don't describe visuals you haven't inspected.",
  FINANCE_ANALYST:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the finance and analysis specialist. Accuracy is paramount — errors compound.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Gather — Collect all relevant data from business logs (category FINANCIAL) and business files. Note the date range and source for every figure.\n" +
    "2. Categorize — Use standard chart-of-accounts conventions. If the company has a custom schema in Company Soul, follow it exactly.\n" +
    "3. Analyze — Calculate trends, ratios, and comparisons. For every derived number, show the formula or inputs used.\n" +
    "4. Verify — Run these checks before presenting results:\n" +
    "   - Reasonableness: Does this figure make sense given the company's scale? Flag anything that seems off by an order of magnitude.\n" +
    "   - Consistency: Do totals sum correctly? Do period-over-period changes match the underlying data?\n" +
    "   - Anomalies: Flag any figure that exceeds 20% above or below the historical average. State the average and the deviation.\n" +
    "5. Present — Structured output only. Use tables with clear labels, units, and date ranges.\n" +
    "\n" +
    "OUTPUT FORMAT:\n" +
    "| Line Item | Current Period | Prior Period | Change ($) | Change (%) | Flag |\n" +
    "Anomaly section: '⚠ ANOMALY: [item] is [X]% above/below average ([avg value]). Possible causes: [list].'\n" +
    "Always end with: 'Verification: [restate 2-3 key figures with sources for cross-check].'\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Business logs category FINANCIAL (transactions, budgets, forecasts — authoritative)\n" +
    "2. Business files (financial statements, invoices, contracts)\n" +
    "3. Project details (budget allocations, resource costs)\n" +
    "4. Never use web search for financial figures — internal data only.\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Never present a number without its source and date range.\n" +
    "- Don't round aggressively — preserve precision to at least 2 decimal places for financial figures.\n" +
    "- Don't make projections without stating assumptions explicitly.\n" +
    "- Don't take external actions — you have no email, webhook, or delegation tools. Analysis only.\n" +
    "- Don't skip the verification step. If you can't verify, say so explicitly.",
  OPERATIONS_MANAGER:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the operations and process specialist.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Assess — Identify the operational area: vendor management, process improvement, SOP maintenance, resource allocation, or cross-team coordination.\n" +
    "2. Investigate — Search business logs (category OPERATIONS) for current state, prior incidents, and existing SOPs. Check inbox for pending blockers or approvals.\n" +
    "3. Analyze — For blockers: identify root cause, affected teams, and downstream impact. Quantify impact where possible (hours lost, revenue at risk, SLA breach proximity).\n" +
    "4. Recommend — Propose resolution with: owner, due date, success criteria, and rollback plan if applicable.\n" +
    "5. Document — Log all SOPs and process changes as business logs with category OPERATIONS. Include version number (v1.0, v1.1, etc.) and effective date.\n" +
    "6. Delegate — For cross-functional items, delegate to the appropriate domain agent via delegate_task with full context and expected deliverable.\n" +
    "\n" +
    "OUTPUT FORMAT:\n" +
    "SOPs: 'SOP [version] — [title] — Effective [date]' followed by numbered steps.\n" +
    "Blocker reports: | Blocker | Impact (1-5) | Affected Teams | Owner | Due Date | Status |\n" +
    "Vendor tracking: | Vendor | SLA Metric | Target | Actual | Breach? | Next Review |\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Business logs category OPERATIONS (SOPs, incident reports, process docs)\n" +
    "2. Business files (contracts, vendor agreements, org charts)\n" +
    "3. Inbox items (pending approvals, escalations, blockers)\n" +
    "4. Web research (vendor info, best practices — supplementary only)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Don't create a new SOP without checking if one already exists — update and version instead.\n" +
    "- Don't report a blocker without an impact assessment and proposed resolution.\n" +
    "- Don't automate via webhooks without approval — all external triggers are gated.\n" +
    "- Don't assign cross-functional work directly — delegate through delegate_task so it's tracked.",
  EXECUTIVE_ASSISTANT:
    "ROLE-SPECIFIC INSTRUCTIONS:\n" +
    "You are the executive assistant and inbox triage specialist. Treat all information as confidential.\n" +
    "\n" +
    "WORKFLOW:\n" +
    "1. Triage — Scan inbox items and classify each into priority tiers:\n" +
    "   - 🔴 CRITICAL: Revenue impact, security, legal, or SLA breach. Needs action within hours.\n" +
    "   - 🟡 TODAY: Important but not urgent. Needs attention before end of day.\n" +
    "   - 🔵 THIS WEEK: Can be scheduled. Track with due date.\n" +
    "   - ⚪ FYI: Informational only. Include in summary but no action needed.\n" +
    "2. Brief — For meetings or reviews, prepare a structured brief: attendees, objective, key context (pulled from business logs and project details), open items from prior meetings, and suggested talking points.\n" +
    "3. Track — Maintain action items with: description, owner, due date, status (open/in-progress/done). Flag overdue items.\n" +
    "4. Draft — Prepare email drafts on behalf of the owner. Match the owner's tone from prior communications. All emails are gated for approval.\n" +
    "5. Summarize — End every output with a 'Decision needed:' section listing items that require the owner's input.\n" +
    "\n" +
    "OUTPUT FORMAT:\n" +
    "Triage report:\n" +
    "🔴 CRITICAL ([count]): [one-line summaries]\n" +
    "🟡 TODAY ([count]): [one-line summaries]\n" +
    "🔵 THIS WEEK ([count]): [one-line summaries]\n" +
    "⚪ FYI ([count]): [one-line summaries]\n" +
    "Action items: | Item | Owner | Due | Status |\n" +
    "Meeting briefs: Objective → Context → Open Items → Talking Points → Decision Needed\n" +
    "\n" +
    "DATA SOURCE PRIORITY:\n" +
    "1. Inbox items (current state — the primary input for triage)\n" +
    "2. Business logs (context for items, prior decisions, meeting history)\n" +
    "3. Project details (status, deadlines, blockers for briefings)\n" +
    "\n" +
    "ANTI-PATTERNS:\n" +
    "- Never share internal details externally. All information is confidential by default.\n" +
    "- Don't send emails without approval — drafts only.\n" +
    "- Don't triage without classification. Every item must have a priority tier.\n" +
    "- Don't present a meeting brief without checking for open action items from prior meetings.\n" +
    "- Don't bury decisions — if the owner needs to decide something, put it in 'Decision needed:' explicitly.",
};

function buildAgentSystemPrompt(
  agentTarget: AgentTarget,
  companySoul: CompanySoulProfile,
  businessLogSummaries: string[],
  taskDigests?: { ownDigests: string[]; teamDigests: string[] },
) {
  const role = agentTarget.replaceAll("_", " ").toLowerCase();
  const soulLines: string[] = [];

  if (companySoul.companyName) soulLines.push(`Company: ${companySoul.companyName}`);
  if (companySoul.oneLinePitch) soulLines.push(`Positioning: ${companySoul.oneLinePitch}`);
  if (companySoul.mission) soulLines.push(`Mission: ${companySoul.mission}`);
  if (companySoul.coreOffers) soulLines.push(`Core offerings: ${companySoul.coreOffers}`);
  if (companySoul.idealCustomers) soulLines.push(`Ideal customers: ${companySoul.idealCustomers}`);
  if (companySoul.revenueModel) soulLines.push(`Revenue model: ${companySoul.revenueModel}`);
  if (companySoul.strategicGoals) soulLines.push(`Strategic goals: ${companySoul.strategicGoals}`);
  if (companySoul.keyMetrics) soulLines.push(`Key metrics: ${companySoul.keyMetrics}`);
  if (companySoul.departments) soulLines.push(`Departments: ${companySoul.departments}`);
  if (companySoul.constraints) soulLines.push(`Constraints: ${companySoul.constraints}`);
  if (companySoul.approvalRules) soulLines.push(`Approval rules: ${companySoul.approvalRules}`);
  if (companySoul.brandVoice) soulLines.push(`Brand voice: ${companySoul.brandVoice}`);
  if (companySoul.operatingCadence) soulLines.push(`Operating cadence: ${companySoul.operatingCadence}`);
  if (companySoul.toolsAndSystems) soulLines.push(`Tools and systems: ${companySoul.toolsAndSystems}`);
  if (companySoul.notesForAgents) soulLines.push(`Owner notes for agents: ${companySoul.notesForAgents}`);

  const glossaryLines = companySoul.glossary
    ? `\nGLOSSARY:\n${companySoul.glossary}`
    : "";

  const memoryBlock = businessLogSummaries.length > 0
    ? `\nBUSINESS MEMORY (recent operational context):\n${businessLogSummaries.map((s) => `- ${s}`).join("\n")}`
    : "";

  const ownHistoryBlock = taskDigests?.ownDigests.length
    ? `\nYOUR RECENT TASK HISTORY (last ${taskDigests.ownDigests.length} completed tasks):\n${taskDigests.ownDigests.map((d, i) => `[${i + 1}] ${d}`).join("\n\n")}`
    : "";

  const teamHistoryBlock = taskDigests?.teamDigests.length
    ? `\nTEAM TASK HISTORY (recent tasks completed by other agents):\n${taskDigests.teamDigests.map((d, i) => `[${i + 1}] ${d}`).join("\n\n")}`
    : "";

  return [
    `You are the ${role} agent for ${companySoul.companyName || "this business"}.`,
    "",
    "COMPANY SOUL:",
    ...(soulLines.length > 0 ? soulLines.map((l) => `- ${l}`) : ["- Company soul not yet defined."]),
    glossaryLines,
    memoryBlock,
    ownHistoryBlock,
    teamHistoryBlock,
    "",
    ...(ROLE_INSTRUCTIONS[agentTarget] ? [ROLE_INSTRUCTIONS[agentTarget], ""] : []),
    "TASK EXECUTION GUIDELINES:",
    "- Analyze the task instructions carefully and produce a structured result.",
    "- Identify specific actions, findings, or recommendations.",
    "- Respect the company's constraints, approval rules, and brand voice in all outputs.",
    "- Use the business memory and task history above to inform decisions with recent operational context.",
    "- Build on prior task results when relevant rather than repeating work.",
    "- Flag any approval-sensitive or external actions explicitly.",
    "- Be concise and operational. Avoid generic advice.",
    "",
    "Respond with a clear, actionable analysis of the task.",
  ].filter(Boolean).join("\n");
}

function buildAgentTaskPrompt(task: { title: string; instructions: string }, loopContext: {
  iteration: number;
  maxIterations: number;
  planStep: string;
  reviewerIssues: string[];
}) {
  return [
    `Task: ${task.title}`,
    "",
    `Instructions: ${task.instructions}`,
    "",
    `Loop iteration: ${loopContext.iteration}/${loopContext.maxIterations}`,
    `Planned step: ${loopContext.planStep}`,
    loopContext.reviewerIssues.length
      ? `Reviewer issues to address: ${loopContext.reviewerIssues.join(" | ")}`
      : "No reviewer issues.",
    "",
    "Produce a structured result addressing the task instructions.",
  ].join("\n");
}

function targetToAgentKind(target: AgentTarget): AgentKind | null {
  if (target === "CHIEF_ADVISOR") return null;
  return target as AgentKind;
}

async function getTaskDigestsForAgent(userId: string, agentTarget: string): Promise<{ ownDigests: string[]; teamDigests: string[] }> {
  const [ownTasks, teamTasks] = await Promise.all([
    prisma.delegatedTask.findMany({
      where: {
        userId,
        toAgentTarget: agentTarget,
        status: { in: [DelegatedTaskStatus.DONE, DelegatedTaskStatus.REVIEW] },
        completionDigest: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { completionDigest: true, completedAt: true },
    }),
    prisma.delegatedTask.findMany({
      where: {
        userId,
        fromAgent: "CHIEF_ADVISOR",
        toAgentTarget: { not: agentTarget },
        status: { in: [DelegatedTaskStatus.DONE, DelegatedTaskStatus.REVIEW] },
        completionDigest: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { completionDigest: true, completedAt: true },
    }),
  ]);
  return {
    ownDigests: ownTasks.map((t) => t.completionDigest!),
    teamDigests: teamTasks.map((t) => t.completionDigest!),
  };
}

function generateCompletionDigest(task: { title: string; instructions: string; toAgentTarget: string; fromAgent: string }, output: string, terminationReason: string): string {
  const instructionSummary = task.instructions.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" ").slice(0, 200);
  const outputLines = output.split(/\r?\n/).filter(Boolean);
  const outputSummary = outputLines.slice(0, 3).join(" ").slice(0, 300);
  const toolMentions = output.match(/(?:read_file|list_files|run_command|write_file|web_fetch|search_business_logs|delegate_task|send_email|create_business_log|get_project_details)/g);
  const toolsUsed = toolMentions ? [...new Set(toolMentions)].join(", ") : "none detected";
  return [
    `Task: ${task.title}`,
    `Assigned by: ${task.fromAgent.replaceAll("_", " ").toLowerCase()}`,
    `Agent: ${task.toAgentTarget.replaceAll("_", " ").toLowerCase()}`,
    `Objective: ${instructionSummary}`,
    `Outcome: ${terminationReason === "review_passed" || terminationReason === "final_answer" ? "completed" : terminationReason}`,
    `Result: ${outputSummary}`,
    `Tools used: ${toolsUsed}`,
  ].join("\n");
}

export async function executeDelegatedTask(userId: string, taskId: string, onEvent?: (event: AgenticStreamEvent) => void) {
  // Atomic claim — prevents double-execution in parallel scenarios
  const claimed = await prisma.delegatedTask.updateMany({
    where: { id: taskId, userId, status: { in: [DelegatedTaskStatus.QUEUED, DelegatedTaskStatus.PAUSED] } },
    data: { status: DelegatedTaskStatus.RUNNING, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) throw new Error("Task already claimed or not runnable");

  const row = await prisma.delegatedTask.findFirst({ where: { id: taskId, userId } });
  if (!row) throw new Error("Task not found");

  try {
    return await _executeClaimedTask(userId, row, onEvent);
  } catch (execError: unknown) {
    // Recovery: if attempts < maxAttempts, reset to QUEUED with exponential backoff.
    // Otherwise mark FAILED permanently and escalate to CHIEF_ADVISOR.
    const canRetry = row.attempts < (row.maxAttempts || 3);
    const nextStatus = canRetry ? DelegatedTaskStatus.QUEUED : DelegatedTaskStatus.FAILED;
    // Exponential backoff: 30s * 2^attempt (attempt already incremented by this run)
    const backoffMs = canRetry ? Math.min(30_000 * Math.pow(2, row.attempts), 3_600_000) : 0;
    const nextRetryAt = canRetry ? new Date(Date.now() + backoffMs) : null;
    await prisma.delegatedTask.update({
      where: { id: row.id },
      data: {
        status: nextStatus,
        ...(nextStatus === DelegatedTaskStatus.FAILED ? { completedAt: new Date() } : {}),
        ...(nextRetryAt ? { nextRetryAt } : {}),
      },
    }).catch(() => null);

    const errMsg = execError instanceof Error ? execError.message : String(execError);
    await prisma.auditLog.create({
      data: {
        userId,
        scope: "DELEGATED_TASK",
        entityId: row.id,
        action: canRetry ? "RETRY_QUEUED" : "FAILED_PERMANENT",
        summary: canRetry
          ? `Task "${row.title}" failed (attempt ${row.attempts}/${row.maxAttempts}), retrying in ${Math.round(backoffMs / 1000)}s`
          : `Task "${row.title}" failed permanently after ${row.attempts} attempts: ${errMsg.slice(0, 300)}`,
      },
    }).catch(() => null);

    if (!canRetry) {
      const agentName = row.toAgentTarget === "ASSISTANT" ? "Mara" : row.toAgentTarget.replaceAll("_", " ");
      notifyTaskFailed(userId, { taskTitle: row.title, agentName }).catch((e) => {
        console.error("[notifications] notifyTaskFailed error:", e);
      });

      // Agent-to-agent escalation: delegate permanently failed task to CHIEF_ADVISOR.
      if (row.toAgentTarget !== "CHIEF_ADVISOR") {
        createDelegatedTask(userId, {
          fromAgent: row.toAgentTarget as AgentTarget,
          toAgentTarget: "CHIEF_ADVISOR",
          title: `Escalation: "${row.title}" failed permanently`,
          instructions: [
            `The following task failed permanently after ${row.attempts} attempts and requires your decision:`,
            `Agent: ${agentName}`,
            `Original instructions: ${row.instructions.slice(0, 800)}`,
            `Final error: ${errMsg.slice(0, 400)}`,
            "",
            "Please assess: retry manually, delegate to another agent, or close as unresolvable.",
          ].join("\n"),
          triggerSource: "AGENT_FAILURE_ESCALATION",
          escalatedFromId: row.id,
        }).catch(() => null);
      }
    }

    throw execError;
  }
}

async function _executeClaimedTask(
  userId: string,
  row: Awaited<ReturnType<typeof prisma.delegatedTask.findFirst>> & {},
  onEvent?: (event: AgenticStreamEvent) => void,
) {
  if (!(await isAgentTargetAvailableToUser(userId, row.toAgentTarget as AgentTarget))) {
    throw new Error(`${row.toAgentTarget.replaceAll("_", " ")} is not hired for this workspace`);
  }

  // Gate on skill readiness — fail fast if required API keys are missing
  const { checkSkillReadiness } = await import("@/lib/skills-store");
  const readiness = await checkSkillReadiness(userId);
  const notReady = readiness.filter((r) => !r.ready && r.missing.some((m) => m.startsWith("env:")));
  if (notReady.length > 0) {
    const missing = notReady.flatMap((r) => r.missing.filter((m) => m.startsWith("env:")).map((m) => m.slice(4)));
    throw new Error(
      `Cannot run task: enabled skill(s) are missing API keys: ${missing.join(", ")}. ` +
      `Add them in Settings → Skills.`
    );
  }

  // If this task was chained from another task, fetch the source task's output
  // and prepend it so the receiving agent has full context.
  let chainedInput = "";
  if (row.inputFromTaskId) {
    const sourceTask = await prisma.delegatedTask.findFirst({
      where: { id: row.inputFromTaskId, userId },
      select: { title: true, toAgentTarget: true, fromAgent: true, completionDigest: true },
    });
    if (sourceTask?.completionDigest) {
      const sourceLabel = sourceTask.toAgentTarget.replaceAll("_", " ").toLowerCase();
      chainedInput = [
        `--- INPUT FROM PRIOR TASK (${sourceLabel}: "${sourceTask.title}") ---`,
        sourceTask.completionDigest,
        "--- END PRIOR TASK OUTPUT ---",
        "",
      ].join("\n");
    }
  }

  const [config, userPrefs] = await Promise.all([
    getAgentAutomationConfig(userId, row.toAgentTarget as AgentTarget),
    getAppPreferences(userId),
  ]);
  const startedAt = Date.now();
  const maxIterations = Math.max(1, config.maxLoopIterations);
  const retryAttempts = Math.max(0, config.maxToolRetries);
  const workerToolTraces: Array<{
    toolName: string;
    phase: string;
    status: string;
    latencyMs: number | null;
    inputSummary: string | null;
    outputSummary: string | null;
  }> = [];
  const loopTraces: typeof workerToolTraces = [];
  let output = "";
  let adapterResult: Awaited<ReturnType<typeof runIntegrationAdaptersForTask>> | null = null;
  let reviewerIssues: string[] = [];
  let terminationReason = "max_iterations";
  let iterationsCompleted = 0;
  let needsReview = false;
  let approvalRequired = false;
  let pendingActions: Array<{ toolName: string; details: string; argsJson: string }> = [];

  // Agentic tool-calling path: if tools are available in DB, use the agentic loop
  const agenticTools = await getToolsForAgentKind(row.toAgentTarget, config.integrations);

  if (agenticTools.length > 0) {
    const [soul, recentLogs, taskDigests, agentMemoryIndex] = await Promise.all([
      getCompanySoul(userId),
      listBusinessLogs(userId, 30),
      getTaskDigestsForAgent(userId, row.toAgentTarget),
      getAgentMemoryIndex(userId, row.toAgentTarget),
    ]);
    const logSummaries = recentLogs
      .filter((l) => !String(l.relatedRef ?? "").startsWith("CHAT_LOG:"))
      .slice(0, 20)
      .map((l) => `[${l.category.toLowerCase()}] ${l.title} (${l.source.toLowerCase()}, ${l.createdAt.toISOString().slice(0, 10)}): ${l.body.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" | ")}`);
    let agenticSystemPrompt = buildAgentSystemPrompt(row.toAgentTarget as AgentTarget, soul, logSummaries, taskDigests);
    if (agentMemoryIndex) {
      agenticSystemPrompt += `\n\n${agentMemoryIndex}`;
    }
    agenticSystemPrompt += "\n\nYou have access to tools. Use them to gather information and take actions. "
      + "When ready to give your final answer, respond with plain text (no tool calls).";

    // Inject enabled skill content into the system prompt with paths and env context
    const MAX_SKILL_INJECTION = 12000;
    const skillContents = await getEnabledSkillContents(userId);
    let injected = 0;
    for (const skill of skillContents) {
      const meta: string[] = [`Skill directory: ${skill.skillDir}`];
      if (skill.scripts.length > 0) {
        meta.push(`Available scripts: ${skill.scripts.join(", ")}`);
      }
      if (skill.envReady.length > 0) {
        meta.push(`Environment: ${skill.envReady.join(", ")} configured`);
      }
      const block = `\n\n--- SKILL: ${skill.name} ---\n${meta.join("\n")}\n\n${skill.content}\n--- END SKILL ---`;
      if (injected + block.length > MAX_SKILL_INJECTION) break;
      agenticSystemPrompt += block;
      injected += block.length;
    }

    // Inject optimizer prompt patches (evidence-based improvements auto-applied by background job)
    const optimizerPatches = await getAppliedPatches(userId, row.toAgentTarget).catch(() => null);
    if (optimizerPatches) {
      agenticSystemPrompt += `\n\nAPPLIED_OPTIMIZATIONS\nEvidence-based improvements active for this agent:\n${optimizerPatches}`;
    }

    const agenticResult = await runAgenticLoop({
      userId,
      delegatedTaskId: row.id,
      agentKind: row.toAgentTarget,
      systemPrompt: agenticSystemPrompt,
      userMessage: chainedInput
        ? `Task: ${row.title}\n\n${chainedInput}\nInstructions: ${row.instructions}`
        : `Task: ${row.title}\n\nInstructions: ${row.instructions}`,
      tools: agenticTools,
      config: {
        maxTurns: config.maxLoopIterations,
        maxRuntimeMs: config.maxRuntimeSeconds * 1000,
        maxParallelCalls: config.maxAgentCallsPerRun,
        maxToolRetries: config.maxToolRetries,
        requireApproval: config.requireApprovalForExternalActions,
        maxOutputTokens: userPrefs.maxAgentOutputTokens,
      },
      onEvent,
    });

    output = agenticResult.finalText;
    terminationReason = agenticResult.terminationReason;
    iterationsCompleted = agenticResult.turns;
    loopTraces.push(...agenticResult.traces);
    if (agenticResult.approvalRequired.length > 0) {
      needsReview = true;
      approvalRequired = true;
      pendingActions = agenticResult.approvalRequired;
    }

    // Create a synthetic adapterResult for the transaction below
    adapterResult = { traces: [], memoryFindings: [], actions: [] };
  } else {

  // FALLBACK: No tools in DB -> run existing heuristic loop unchanged
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    iterationsCompleted = iteration;
    if (Date.now() - startedAt > config.maxRuntimeSeconds * 1000) {
      terminationReason = "runtime_budget_exceeded";
      throw new Error(`Delegated task exceeded runtime budget (${config.maxRuntimeSeconds}s)`);
    }

    const planStep = buildDelegatedLoopPlan(row, iteration, reviewerIssues);
    loopTraces.push({
      toolName: "agent.planner",
      phase: `plan:${iteration}`,
      status: "ok",
      latencyMs: 1,
      inputSummary: `Plan delegated task iteration ${iteration}`,
      outputSummary: planStep.slice(0, 220),
    });

    // LLM reasoning step: get agent's analysis before running adapters
    let llmReasoning = "";
    const llmStart = Date.now();
    try {
      const [soul, fallbackLogs, fallbackDigests, fallbackMemoryIndex] = await Promise.all([
        getCompanySoul(userId),
        listBusinessLogs(userId, 30),
        getTaskDigestsForAgent(userId, row.toAgentTarget),
        getAgentMemoryIndex(userId, row.toAgentTarget),
      ]);
      const fallbackLogSummaries = fallbackLogs
        .filter((l) => !String(l.relatedRef ?? "").startsWith("CHAT_LOG:"))
        .slice(0, 20)
        .map((l) => `[${l.category.toLowerCase()}] ${l.title} (${l.source.toLowerCase()}, ${l.createdAt.toISOString().slice(0, 10)}): ${l.body.split(/\r?\n/).filter(Boolean).slice(0, 2).join(" | ")}`);
      let systemPrompt = buildAgentSystemPrompt(row.toAgentTarget as AgentTarget, soul, fallbackLogSummaries, fallbackDigests);
      if (fallbackMemoryIndex) {
        systemPrompt += `\n\n${fallbackMemoryIndex}`;
      }
      const taskPrompt = buildAgentTaskPrompt(row, {
        iteration,
        maxIterations,
        planStep,
        reviewerIssues,
      });
      const llmResult = await callAgentLlm({
        userId,
        agentKind: row.toAgentTarget as AgentTarget,
        systemPrompt,
        userMessage: taskPrompt,
        maxOutputTokens: userPrefs.maxAgentOutputTokens,
      });
      llmReasoning = llmResult.text;
      loopTraces.push({
        toolName: "agent.llm_reasoning",
        phase: `llm:${iteration}`,
        status: llmResult.error ? "fallback" : "ok",
        latencyMs: Math.max(1, Date.now() - llmStart),
        inputSummary: `LLM reasoning for ${row.toAgentTarget} (${llmResult.provider}:${llmResult.model})`,
        outputSummary: (llmResult.error || llmResult.text).slice(0, 220),
      });
    } catch (llmErr: unknown) {
      // LLM failure is non-fatal; fall through to heuristic behavior
      loopTraces.push({
        toolName: "agent.llm_reasoning",
        phase: `llm:${iteration}`,
        status: "error",
        latencyMs: Math.max(1, Date.now() - llmStart),
        inputSummary: `LLM reasoning attempt for ${row.toAgentTarget}`,
        outputSummary: (llmErr instanceof Error ? llmErr.message : "LLM call failed").slice(0, 220),
      });
    }

    let lastError: unknown = null;
    let workerResult: Awaited<ReturnType<typeof runIntegrationAdaptersForTask>> | null = null;
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const instructionsWithLoopContext = [
          ...(chainedInput ? [chainedInput] : []),
          row.instructions,
          "",
          `Loop iteration: ${iteration}/${maxIterations}`,
          `Planned step: ${planStep}`,
          reviewerIssues.length ? `Reviewer issues to resolve: ${reviewerIssues.join(" | ")}` : "Reviewer issues to resolve: none",
          llmReasoning ? `\nAgent reasoning:\n${llmReasoning.slice(0, 4000)}` : "",
        ].join("\n");
        workerResult = await runIntegrationAdaptersForTask({
          userId,
          integrations: config.integrations.slice(0, config.maxAgentCallsPerRun),
          title: row.title,
          instructions: instructionsWithLoopContext,
        });
        break;
      } catch (e: unknown) {
        lastError = e;
        workerToolTraces.push({
          toolName: "agent.worker",
          phase: `work:${iteration}:attempt:${attempt + 1}`,
          status: "error",
          latencyMs: 1,
          inputSummary: `Worker attempt ${attempt + 1} failed`,
          outputSummary: e instanceof Error ? e.message.slice(0, 220) : "Unknown worker error",
        });
        if (attempt >= retryAttempts) throw e;
        await new Promise((r) => setTimeout(r, Math.min(1500, 250 * (attempt + 1))));
      }
    }
    if (!workerResult) {
      throw (lastError instanceof Error ? lastError : new Error("Adapter execution failed"));
    }
    adapterResult = workerResult;
    workerToolTraces.push(
      ...workerResult.traces.map((t) => ({
        toolName: t.toolName,
        phase: `work:${iteration}:${t.phase}`,
        status: t.status,
        latencyMs: t.latencyMs,
        inputSummary: t.inputSummary,
        outputSummary: t.outputSummary,
      })),
    );

    output = synthesizeDelegatedOutput(row, workerResult.memoryFindings, {
      iteration,
      planStep,
      reviewerIssues,
    });

    const review = reviewDelegatedLoopOutput({ task: row, output, iteration, maxIterations });
    reviewerIssues = review.issues;
    loopTraces.push({
      toolName: "agent.reviewer",
      phase: `review:${iteration}`,
      status: review.pass ? "ok" : review.nextAction,
      latencyMs: 1,
      inputSummary: `Review delegated output iteration ${iteration}`,
      outputSummary: review.pass ? "Pass -> done" : `${review.nextAction}: ${review.issues.join(" | ")}`.slice(0, 220),
    });

    if (review.nextAction === "done") {
      terminationReason = "review_passed";
      break;
    }
    if (review.nextAction === "escalate_human") {
      terminationReason = "review_failed_max_iterations";
      break;
    }
    terminationReason = "review_retry";
  }

  if (!adapterResult) throw new Error("Delegated loop produced no worker result");

  } // end else (heuristic fallback)
  if (!adapterResult) adapterResult = { traces: [], memoryFindings: [], actions: [] };
  const reviewEscalated = terminationReason === "review_failed_max_iterations";
  const heuristicApproval = config.requireApprovalForExternalActions ? delegatedTaskNeedsReview(row) : false;
  needsReview = needsReview || reviewEscalated || heuristicApproval;
  if (heuristicApproval) approvalRequired = true;
  const finalStatus = needsReview ? DelegatedTaskStatus.REVIEW : DelegatedTaskStatus.DONE;
  const agentKind = targetToAgentKind(row.toAgentTarget as AgentTarget);
  const traceRows = [...loopTraces, ...workerToolTraces];

  const digest = generateCompletionDigest(row, output, terminationReason);

  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.delegatedTask.update({
      where: { id: row.id },
      data: {
        status: finalStatus,
        completedAt: finalStatus === DelegatedTaskStatus.DONE ? new Date() : null,
        completionDigest: digest,
      },
    });

    if (agentKind) {
      await tx.submission.create({
        data: {
          userId,
          agentKind,
          title: row.title,
          output,
          status: needsReview ? SubmissionStatus.SUBMITTED : SubmissionStatus.ACCEPTED,
          notes: `Delegated task ${row.id} from ${row.fromAgent}`,
        },
      });
    }

    await tx.businessLogEntry.create({
      data: {
        userId,
        title: `Delegated output: ${row.title}`,
        category: BusinessLogCategory.OPERATIONS,
        source: BusinessLogSource.AGENT,
        authorLabel: row.toAgentTarget.replaceAll("_", " "),
        body: output,
        relatedRef: `DELEGATED_TASK:${row.id}`,
      },
    });

    for (const action of adapterResult.actions) {
      if (action.kind !== "business_log") continue;
      await tx.businessLogEntry.create({
        data: {
          userId,
          title: action.title,
          category: ((BusinessLogCategory as Record<string, string>)[action.category] ?? BusinessLogCategory.GENERAL) as BusinessLogCategory,
          source: ((BusinessLogSource as Record<string, string>)[action.source] ?? BusinessLogSource.AGENT) as BusinessLogSource,
          authorLabel: action.authorLabel,
          body: action.body,
          relatedRef: `DELEGATED_TASK:${row.id}`,
        },
      });
    }

    if (needsReview) {
      const agentLabel =
        row.toAgentTarget === "ASSISTANT" ? "Mara" :
        row.toAgentTarget.replaceAll("_", " ");
      const dept =
        row.toAgentTarget === "ASSISTANT" ? "Support" : "General";
      const itemType = approvalRequired ? "approval" : "draft";
      const itemSummary = (digest.split("\n")[0] || row.title).slice(0, 240);

      // Check auto-approval rules: if ALL pending actions match a rule, execute immediately
      let autoApproved = false;
      if (pendingActions.length > 0) {
        try {
          const { checkAutoApproval } = await import("@/lib/auto-approval-store");
          const autoApprovalChecks = await Promise.all(
            pendingActions.map(async (a) => {
              let argsObj: Record<string, unknown> = {};
              try { argsObj = JSON.parse(a.argsJson); } catch { /* ignore */ }
              const matchedRule = await checkAutoApproval(userId, a.toolName, argsObj);
              return matchedRule;
            }),
          );
          if (autoApprovalChecks.every((r) => r !== null)) {
            autoApproved = true;
            // Execute all pending actions immediately
            const { executePendingActions } = await import("@/lib/pending-actions-executor");
            const execResults = await executePendingActions(pendingActions, userId);
            const executionResultJson = JSON.stringify(execResults);
            // Create an already-approved inbox item (for audit trail)
            await tx.inboxItem.create({
              data: {
                userId,
                type: "approval",
                summary: `[Auto-approved] ${itemSummary}`,
                impact: row.title,
                owner: agentLabel,
                department: dept,
                state: "APPROVED",
                stateLabel: "Auto-approved",
                sourceType: "DELEGATED_TASK",
                sourceId: row.id,
                digest,
                pendingActionsJson: JSON.stringify(pendingActions),
                executionResultJson,
              },
            });
          }
        } catch {
          // Auto-approval check failed, fall through to normal inbox item
        }
      }

      if (!autoApproved) {
        await tx.inboxItem.create({
          data: {
            userId,
            type: itemType,
            summary: itemSummary,
            impact: row.title,
            owner: agentLabel,
            department: dept,
            sourceType: "DELEGATED_TASK",
            sourceId: row.id,
            digest,
            pendingActionsJson: pendingActions.length > 0 ? JSON.stringify(pendingActions) : null,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId,
        scope: "DELEGATED_TASK",
        entityId: row.id,
        action: "EXECUTE",
        summary: `Executed delegated task "${row.title}" -> ${finalStatus}`,
        metadata: JSON.stringify({
          toAgentTarget: row.toAgentTarget,
          needsReview,
          retriesUsed: Math.max(0, workerToolTraces.filter((t) => t.status === "error").length),
          maxToolRetries: config.maxToolRetries,
          maxRuntimeSeconds: config.maxRuntimeSeconds,
          maxAgentCallsPerRun: config.maxAgentCallsPerRun,
          maxLoopIterations: config.maxLoopIterations,
          iterationsCompleted,
          terminationReason,
          adapterActionCount: adapterResult.actions.length,
        }),
      },
    });

    await tx.delegatedTaskToolCall.createMany({
      data: traceRows.map((t) => ({
        delegatedTaskId: row.id,
        toolName: t.toolName.slice(0, 120),
        phase: t.phase.slice(0, 60),
        status: t.status.slice(0, 40),
        latencyMs: t.latencyMs,
        inputSummary: t.inputSummary?.slice(0, 240) ?? null,
        outputSummary: t.outputSummary?.slice(0, 240) ?? null,
      })),
    });
    return tx.delegatedTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { toolCalls: { orderBy: { createdAt: "asc" }, take: 8 } },
    });
  });

  eventBus.emit({
    type: "DELEGATED_TASK_COMPLETED",
    userId,
    taskId: row.id,
    toAgentTarget: row.toAgentTarget,
    title: row.title,
    status: finalStatus,
  });

  if (digest) {
    ingestTaskCompletion(userId, row.toAgentTarget, digest).catch(() => {});
  }

  const agentDisplayName =
    row.toAgentTarget === "ASSISTANT" ? "Mara" :
    row.toAgentTarget.replaceAll("_", " ");
  if (needsReview && approvalRequired) {
    notifyApprovalNeeded(userId, { taskTitle: row.title, agentName: agentDisplayName, taskId: row.id }).catch((e) => {
      console.error("[notifications] notifyApprovalNeeded error:", e);
    });
  } else if (needsReview) {
    notifySubmissionReady(userId, { taskTitle: row.title, agentName: agentDisplayName, taskId: row.id }).catch((e) => {
      console.error("[notifications] notifySubmissionReady error:", e);
    });
  } else {
    notifyTaskCompleted(userId, { taskTitle: row.title, agentName: agentDisplayName }).catch((e) => {
      console.error("[notifications] notifyTaskCompleted error:", e);
    });
  }

  // Output auto-routing — fire configured routes for completed/failed tasks (item 2).
  if (finalStatus === DelegatedTaskStatus.DONE) {
    import("@/lib/output-routes-store").then(({ fireOutputRoutes }) =>
      fireOutputRoutes({
        userId,
        agentTarget: row.toAgentTarget,
        event: "completed",
        digest: digest ?? "",
        taskTitle: row.title,
        taskId: row.id,
      }).catch(() => null)
    ).catch(() => null);
  }

  // Cost attribution — estimate token cost and record on the task (item 8).
  // Uses a rough heuristic: 1 token ≈ $0.003/1K (GPT-4o blended) scaled to output length.
  // Replaced with a real count from agent-llm usage if available.
  const estimatedTokens = Math.ceil((output.length + row.instructions.length) / 4);
  const estimatedCentsPer1K = 0.3; // ~$3/1M blended input+output (Claude Sonnet rate)
  const costEstimateCents = Math.round((estimatedTokens / 1000) * estimatedCentsPer1K);
  prisma.delegatedTask.update({
    where: { id: row.id },
    data: { costEstimateCents },
  }).catch(() => null);

  onEvent?.({ type: "task_done", status: finalStatus });

  return toTaskView(updated);
}

export async function runDelegatedTaskQueue(userId: string, limit = 10) {
  const now = new Date();
  const queued = await prisma.delegatedTask.findMany({
    where: {
      userId,
      status: DelegatedTaskStatus.QUEUED,
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  // Group by agent target — take first task per agent (same-agent stays serial)
  const byAgent = new Map<string, typeof queued>();
  for (const task of queued) {
    if (!byAgent.has(task.toAgentTarget)) {
      byAgent.set(task.toAgentTarget, []);
    }
    byAgent.get(task.toAgentTarget)!.push(task);
  }

  // Pick one task per agent for parallel execution
  const tasksToRun = [...byAgent.values()].map((tasks) => tasks[0]);

  // Execute all agents in parallel with Promise.allSettled
  // executeDelegatedTask handles its own recovery (retry or fail)
  const results = await Promise.allSettled(
    tasksToRun.map(async (task) => {
      try {
        return await executeDelegatedTask(userId, task.id);
      } catch {
        // executeDelegatedTask already handled recovery (requeued or failed)
        return null;
      }
    }),
  );

  const processed: DelegatedTaskView[] = results
    .filter((r): r is PromiseFulfilledResult<DelegatedTaskView | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is DelegatedTaskView => v !== null);

  return { processed };
}

function delegatedTaskHasEmailIntent(task: { title: string; instructions: string }) {
  const text = `${task.title}\n${task.instructions}`.toLowerCase();
  return /(email|reply|send|customer|outreach)/.test(text);
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return [...new Set(matches.map((m) => m.trim()))];
}

function buildApprovedEmailBody(task: { title: string; instructions: string }) {
  const compact = task.instructions.replace(/\s+/g, " ").trim();
  return {
    subject: `Follow-up: ${task.title}`.slice(0, 160),
    html: `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#111">
        <p>Hi,</p>
        <p>This message was prepared from an approved delegated task in qorpera.</p>
        <p><strong>Task:</strong> ${task.title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <p><strong>Summary:</strong> ${compact.slice(0, 900).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <p>Please review and respond if you'd like adjustments.</p>
        <p>Best,<br/>Qorpera Assistant</p>
      </div>
    `.trim(),
  };
}

async function sendResendEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; message: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { ok: false, message: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; error?: { message?: string } };
    if (!res.ok) return { ok: false, message: data.error?.message || data.message || `Resend error (${res.status})` };
    return { ok: true, message: "Email sent via Resend", id: data.id };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : "Resend request failed" };
  }
}

export async function approveAndExecuteDelegatedTaskConnectors(userId: string, taskId: string) {
  const row = await prisma.delegatedTask.findFirst({ where: { id: taskId, userId } });
  if (!row) throw new Error("Task not found");
  if (row.status !== DelegatedTaskStatus.REVIEW) throw new Error("Task is not in review");

  const config = await getAgentAutomationConfig(userId, row.toAgentTarget as AgentTarget);
  const traces: Array<{
    toolName: string;
    phase: string;
    status: string;
    latencyMs: number | null;
    inputSummary: string | null;
    outputSummary: string | null;
  }> = [];

  let executed = 0;
  let failed = 0;
  const emails = extractEmails(`${row.title}\n${row.instructions}`);
  const canUseEmail = config.integrations.map((i) => i.toLowerCase()).includes("email");
  const wantsEmail = delegatedTaskHasEmailIntent(row);

  if (wantsEmail) {
    if (!canUseEmail) {
      traces.push({
        toolName: "email.send",
        phase: "execute",
        status: "blocked",
        latencyMs: 1,
        inputSummary: "Approved connector execution requested",
        outputSummary: 'Blocked: "email" is not enabled in the agent integrations allowlist.',
      });
      failed += 1;
    } else if (!emails.length) {
      traces.push({
        toolName: "email.send",
        phase: "execute",
        status: "error",
        latencyMs: 1,
        inputSummary: "Approved connector execution requested",
        outputSummary: "No recipient email address found in task title/instructions.",
      });
      failed += 1;
    } else {
      const payload = buildApprovedEmailBody(row);
      const start = Date.now();
      const result = await sendResendEmail({
        to: emails.slice(0, 5),
        subject: payload.subject,
        html: payload.html,
      });
      traces.push({
        toolName: "email.send",
        phase: "execute",
        status: result.ok ? "ok" : (result.message.includes("Missing RESEND") ? "requires_connector" : "error"),
        latencyMs: Math.max(1, Date.now() - start),
        inputSummary: `Send approved email to ${emails.slice(0, 3).join(", ")}`,
        outputSummary: result.ok ? `${result.message}${result.id ? ` (id: ${result.id})` : ""}` : result.message,
      });
      if (result.ok) {
        executed += 1;
      } else {
        failed += 1;
      }
    }
  }

  if (!wantsEmail) {
    traces.push({
      toolName: "connector.execute",
      phase: "execute",
      status: "ok",
      latencyMs: 1,
      inputSummary: "Approved connector execution requested",
      outputSummary: "No live connector action available for this task yet (email send is the first supported action).",
    });
  }

  const finalStatus = failed === 0 && executed > 0 ? DelegatedTaskStatus.DONE : DelegatedTaskStatus.REVIEW;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.delegatedTaskToolCall.createMany({
      data: traces.map((t) => ({
        delegatedTaskId: row.id,
        toolName: t.toolName.slice(0, 120),
        phase: t.phase.slice(0, 60),
        status: t.status.slice(0, 40),
        latencyMs: t.latencyMs,
        inputSummary: t.inputSummary?.slice(0, 240) ?? null,
        outputSummary: t.outputSummary?.slice(0, 240) ?? null,
      })),
    });

    if (executed > 0) {
      await tx.businessLogEntry.create({
        data: {
          userId,
          title: `Connector execution: ${row.title}`.slice(0, 240),
          category: BusinessLogCategory.OPERATIONS,
          source: BusinessLogSource.AGENT,
          authorLabel: row.toAgentTarget.replaceAll("_", " "),
          body: `Approved connector execution completed.\n\nTask: ${row.title}\nExecuted actions: ${executed}\nFailed actions: ${failed}\nRecipients: ${emails.join(", ") || "n/a"}`,
          relatedRef: `DELEGATED_TASK:${row.id}`,
        },
      });
    }

    const task = await tx.delegatedTask.update({
      where: { id: row.id },
      data: {
        status: finalStatus,
        completedAt: finalStatus === DelegatedTaskStatus.DONE ? new Date() : row.completedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        scope: "DELEGATED_TASK",
        entityId: row.id,
        action: "APPROVE_EXECUTE",
        summary: `Approved connector execution for "${row.title}" (${executed} executed, ${failed} failed)`,
        metadata: JSON.stringify({ executed, failed, finalStatus }),
      },
    });

    return tx.delegatedTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { toolCalls: { orderBy: { createdAt: "asc" }, take: 20 } },
    });
  });

  return { task: toTaskView(updated), executed, failed };
}
