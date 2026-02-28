import { ConnectorCheckCadence, DefaultAutonomy } from "@prisma/client";
import { prisma } from "@/lib/db";

export type AgentBudget = {
  monthlyTaskLimit: number;
  warnAtPct?: number; // 0-100, default 80
};

export type AppPreferences = {
  defaultAutonomy: "DRAFT_ONLY" | "APPROVAL" | "AUTO";
  requirePreview: boolean;
  enableRollback: boolean;
  justDoItMode: boolean;
  compactDashboard: boolean;
  highlightApprovals: boolean;
  connectorChecks: "hourly" | "daily" | "manual";
  maxAgentOutputTokens: number;
  notifyApprovalNeeded: boolean;
  notifySubmissionReady: boolean;
  notifyTaskCompleted: boolean;
  notifyTaskFailed: boolean;
  /** Hours until open approval items expire and escalate (0 = never). */
  approvalExpiryHours: number;
  /** Escalate expired approvals to CHIEF_ADVISOR instead of just closing them. */
  escalationEnabled: boolean;
  /** Per-agent monthly task caps. JSON: Record<agentKind, AgentBudget> */
  agentBudgets: Record<string, AgentBudget>;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultAutonomy: "APPROVAL",
  requirePreview: true,
  enableRollback: true,
  justDoItMode: true,
  compactDashboard: false,
  highlightApprovals: true,
  connectorChecks: "daily",
  maxAgentOutputTokens: 32768,
  notifyApprovalNeeded: true,
  notifySubmissionReady: true,
  notifyTaskCompleted: true,
  notifyTaskFailed: true,
  approvalExpiryHours: 0,
  escalationEnabled: true,
  agentBudgets: {},
};

function fromDb(row: {
  defaultAutonomy: DefaultAutonomy;
  requirePreview: boolean;
  enableRollback: boolean;
  justDoItMode: boolean;
  compactDashboard: boolean;
  highlightApprovals: boolean;
  connectorChecks: ConnectorCheckCadence;
  maxAgentOutputTokens: number | null;
  notifyApprovalNeeded?: boolean | null;
  notifySubmissionReady?: boolean | null;
  notifyTaskCompleted?: boolean | null;
  notifyTaskFailed?: boolean | null;
  approvalExpiryHours?: number | null;
  escalationEnabled?: boolean | null;
  agentBudgetsJson?: string | null;
}): AppPreferences {
  let agentBudgets: Record<string, AgentBudget> = {};
  try {
    if (row.agentBudgetsJson) agentBudgets = JSON.parse(row.agentBudgetsJson) as Record<string, AgentBudget>;
  } catch { /* ignore corrupt JSON */ }
  return {
    defaultAutonomy: row.defaultAutonomy,
    requirePreview: row.requirePreview,
    enableRollback: row.enableRollback,
    justDoItMode: row.justDoItMode,
    compactDashboard: row.compactDashboard,
    highlightApprovals: row.highlightApprovals,
    connectorChecks: row.connectorChecks.toLowerCase() as AppPreferences["connectorChecks"],
    maxAgentOutputTokens: row.maxAgentOutputTokens ?? DEFAULT_PREFERENCES.maxAgentOutputTokens,
    notifyApprovalNeeded: row.notifyApprovalNeeded ?? true,
    notifySubmissionReady: row.notifySubmissionReady ?? true,
    notifyTaskCompleted: row.notifyTaskCompleted ?? true,
    notifyTaskFailed: row.notifyTaskFailed ?? true,
    approvalExpiryHours: row.approvalExpiryHours ?? 0,
    escalationEnabled: row.escalationEnabled ?? true,
    agentBudgets,
  };
}

function toDb(next: Partial<AppPreferences>) {
  const data: {
    defaultAutonomy?: DefaultAutonomy;
    requirePreview?: boolean;
    enableRollback?: boolean;
    justDoItMode?: boolean;
    compactDashboard?: boolean;
    highlightApprovals?: boolean;
    connectorChecks?: ConnectorCheckCadence;
    maxAgentOutputTokens?: number;
    notifyApprovalNeeded?: boolean;
    notifySubmissionReady?: boolean;
    notifyTaskCompleted?: boolean;
    notifyTaskFailed?: boolean;
    approvalExpiryHours?: number;
    escalationEnabled?: boolean;
    agentBudgetsJson?: string;
  } = {};

  if (next.defaultAutonomy) data.defaultAutonomy = next.defaultAutonomy as DefaultAutonomy;
  if (typeof next.requirePreview === "boolean") data.requirePreview = next.requirePreview;
  if (typeof next.enableRollback === "boolean") data.enableRollback = next.enableRollback;
  if (typeof next.justDoItMode === "boolean") data.justDoItMode = next.justDoItMode;
  if (typeof next.compactDashboard === "boolean") data.compactDashboard = next.compactDashboard;
  if (typeof next.highlightApprovals === "boolean") data.highlightApprovals = next.highlightApprovals;
  if (next.connectorChecks) data.connectorChecks = next.connectorChecks.toUpperCase() as ConnectorCheckCadence;
  if (typeof next.maxAgentOutputTokens === "number") data.maxAgentOutputTokens = Math.max(1024, Math.min(32768, next.maxAgentOutputTokens));
  if (typeof next.notifyApprovalNeeded === "boolean") data.notifyApprovalNeeded = next.notifyApprovalNeeded;
  if (typeof next.notifySubmissionReady === "boolean") data.notifySubmissionReady = next.notifySubmissionReady;
  if (typeof next.notifyTaskCompleted === "boolean") data.notifyTaskCompleted = next.notifyTaskCompleted;
  if (typeof next.notifyTaskFailed === "boolean") data.notifyTaskFailed = next.notifyTaskFailed;
  if (typeof next.approvalExpiryHours === "number") data.approvalExpiryHours = Math.max(0, next.approvalExpiryHours);
  if (typeof next.escalationEnabled === "boolean") data.escalationEnabled = next.escalationEnabled;
  if (next.agentBudgets !== undefined) data.agentBudgetsJson = JSON.stringify(next.agentBudgets);

  return data;
}

export async function getAppPreferences(userId?: string | null): Promise<AppPreferences> {
  if (!userId) return DEFAULT_PREFERENCES;

  const row = await prisma.userPreference.findUnique({ where: { userId } });
  if (!row) return DEFAULT_PREFERENCES;
  return fromDb(row);
}

export async function setAppPreferences(userId: string, next: Partial<AppPreferences>): Promise<AppPreferences> {
  const row = await prisma.userPreference.upsert({
    where: { userId },
    update: toDb(next),
    create: {
      userId,
      ...toDb(next),
    },
  });
  return fromDb(row);
}
