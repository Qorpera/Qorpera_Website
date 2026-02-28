import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { notifyTaskFailed } from "@/lib/notifications";
import { eventBus } from "@/lib/event-bus";

import type { RunnerNode, RunnerJob, RunnerPolicy } from "@prisma/client";

type RunnerNodeRow = RunnerNode;
type RunnerJobRow = RunnerJob;
type RunnerPolicyRow = RunnerPolicy;

type RunnerPolicyRules = {
  execution?: {
    allowedRoots?: string[];
    allowedCommands?: string[];
    network?: {
      mode?: "allow_all" | "deny_all" | "allowlist";
      allowDomains?: string[];
    };
  };
  defaultRule?: {
    riskLevel?: string;
    approvalRequired?: boolean;
  };
  jobTypeRules?: Record<string, {
    riskLevel?: string;
    approvalRequired?: boolean;
  }>;
};

type RunnerPolicyView = {
  id: string;
  userId: string;
  templateKey: string;
  templateName: string;
  version: number;
  rules: RunnerPolicyRules;
  createdAt: string;
  updatedAt: string;
};


function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function cleanText(value: unknown, max: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  const v = value.trim().slice(0, max);
  return v || fallback;
}

function maybeJsonString(value: unknown, max = 20000) {
  if (value == null) return null;
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowPlusSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function runnerView(row: RunnerNodeRow) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    environment: row.environment,
    status: row.status,
    label: row.label,
    hostName: row.hostName,
    osName: row.osName,
    runnerVersion: row.runnerVersion,
    capabilities: parseJson<Record<string, unknown>>(row.capabilitiesJson),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    lastIp: row.lastIp,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function policyView(row: RunnerPolicyRow): RunnerPolicyView {
  return {
    id: row.id,
    userId: row.userId,
    templateKey: row.templateKey,
    templateName: row.templateName,
    version: row.version,
    rules: parseJson<RunnerPolicyRules>(row.rulesJson) ?? defaultRunnerPolicyRules(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function jobView(row: RunnerJobRow, policy?: RunnerPolicyView | null) {
  const payload = parseJson<Record<string, unknown>>(row.payloadJson) ?? {};
  const policyDecision = buildRunnerJobPolicyDecision(row, payload, policy ?? null);
  return {
    id: row.id,
    userId: row.userId,
    runnerNodeId: row.runnerNodeId,
    jobType: row.jobType,
    title: row.title,
    status: row.status,
    riskLevel: row.riskLevel,
    payload,
    result: parseJson<Record<string, unknown>>(row.resultJson),
    errorMessage: row.errorMessage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    requestedBy: row.requestedBy,
    approvalRequired: row.approvalRequired,
    policyDecision,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    leaseExpiresAt: row.leaseExpiresAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildRunnerJobPolicyDecision(row: RunnerJobRow, payload: Record<string, unknown>, policy: RunnerPolicyView | null) {
  const riskLevel = row.riskLevel || "medium";
  const needsApproval = row.status === "NEEDS_APPROVAL" || row.approvalRequired;
  const workspaceTemplate = policy?.templateName ?? "Default workspace template";

  if (!needsApproval) {
    return {
      requiresApproval: false,
      decision: "auto_run",
      reasonCode: "auto_run_allowed",
      source: "server_policy_v1",
      policy: policy ? {
        id: policy.id,
        templateKey: policy.templateKey,
        templateName: policy.templateName,
        version: policy.version,
      } : null,
      message: `${row.jobType} is allowed to auto-run under ${workspaceTemplate} because it is currently classified as ${riskLevel} risk and no approval gate is required.`,
    };
  }

  if (row.jobType === "command.exec" || row.jobType === "command.interactive" || row.jobType === "command.pty") {
    const cwd = typeof payload.cwd === "string" ? payload.cwd : "runner default directory";
    return {
      requiresApproval: true,
      decision: "needs_approval",
      reasonCode:
        row.jobType === "command.pty"
          ? "command_pty_requires_approval"
          : row.jobType === "command.interactive"
            ? "command_interactive_requires_approval"
            : "command_exec_requires_approval",
      source: "server_policy_v1",
      policy: policy ? {
        id: policy.id,
        templateKey: policy.templateKey,
        templateName: policy.templateName,
        version: policy.version,
      } : null,
      message: `Requires approval because ${
        row.jobType === "command.pty"
          ? "PTY command execution"
          : row.jobType === "command.interactive"
            ? "interactive command execution"
            : "command execution"
      } is ${riskLevel} risk in ${workspaceTemplate}. Review the command and working directory before allowing local execution (${cwd}).`,
    };
  }

  if (row.jobType === "file.write") {
    const path = typeof payload.path === "string" ? payload.path : "unknown path";
    return {
      requiresApproval: true,
      decision: "needs_approval",
      reasonCode: "file_write_requires_approval",
      source: "server_policy_v1",
      policy: policy ? {
        id: policy.id,
        templateKey: policy.templateKey,
        templateName: policy.templateName,
        version: policy.version,
      } : null,
      message: `Requires approval because file writes are ${riskLevel} risk in ${workspaceTemplate}. Confirm the destination path and content preview before allowing the runner to write ${path}.`,
    };
  }

  if (row.jobType === "file.read") {
    const path = typeof payload.path === "string" ? payload.path : "unknown path";
    return {
      requiresApproval: true,
      decision: "needs_approval",
      reasonCode: "file_read_policy_gate",
      source: "server_policy_v1",
      policy: policy ? {
        id: policy.id,
        templateKey: policy.templateKey,
        templateName: policy.templateName,
        version: policy.version,
      } : null,
      message: `Requires approval because the current policy template flagged this file read for human review. Confirm the path is expected before reading ${path}.`,
    };
  }

  return {
    requiresApproval: true,
    decision: "needs_approval",
    reasonCode: "policy_gated_action",
    source: "server_policy_v1",
    policy: policy ? {
      id: policy.id,
      templateKey: policy.templateKey,
      templateName: policy.templateName,
      version: policy.version,
    } : null,
    message: `Requires approval because ${row.jobType} is policy-gated under ${workspaceTemplate}. Review the action details before continuing.`,
  };
}

function defaultRunnerPolicyRules(): RunnerPolicyRules {
  return {
    execution: {
      allowedRoots: [],
      allowedCommands: [],
      network: {
        mode: "allow_all",
        allowDomains: [],
      },
    },
    defaultRule: { riskLevel: "medium", approvalRequired: true },
    jobTypeRules: {
      "health.check": { riskLevel: "low", approvalRequired: false },
      "file.read": { riskLevel: "low", approvalRequired: false },
      "file.write": { riskLevel: "medium", approvalRequired: true },
      "command.exec": { riskLevel: "medium", approvalRequired: true },
      "command.interactive": { riskLevel: "high", approvalRequired: true },
      "command.pty": { riskLevel: "high", approvalRequired: true },
    },
  };
}

function sanitizeRunnerPolicyRules(input: unknown): RunnerPolicyRules {
  const parsed = (typeof input === "object" && input && !Array.isArray(input)) ? (input as RunnerPolicyRules) : {};
  const defaultRule = parsed.defaultRule ?? {};
  const execution = parsed.execution ?? {};
  const executionNetwork = execution.network ?? {};
  const out: RunnerPolicyRules = {
    execution: {
      allowedRoots: Array.isArray(execution.allowedRoots)
        ? execution.allowedRoots.map((v) => cleanText(v, 1000, "")).filter(Boolean).slice(0, 50)
        : [],
      allowedCommands: Array.isArray(execution.allowedCommands)
        ? execution.allowedCommands.map((v) => cleanText(v, 80, "")).filter(Boolean).slice(0, 100)
        : [],
      network: {
        mode: executionNetwork.mode === "deny_all" || executionNetwork.mode === "allowlist" ? executionNetwork.mode : "allow_all",
        allowDomains: Array.isArray(executionNetwork.allowDomains)
          ? executionNetwork.allowDomains.map((v) => cleanText(v, 255, "").toLowerCase()).filter(Boolean).slice(0, 200)
          : [],
      },
    },
    defaultRule: {
      riskLevel: cleanText(defaultRule.riskLevel, 12, "medium"),
      approvalRequired: defaultRule.approvalRequired !== false,
    },
    jobTypeRules: {},
  };
  const entries = Object.entries(parsed.jobTypeRules ?? {});
  for (const [jobType, rule] of entries.slice(0, 50)) {
    out.jobTypeRules![cleanText(jobType, 80, "generic")] = {
      riskLevel: cleanText(rule?.riskLevel, 12, out.defaultRule?.riskLevel ?? "medium"),
      approvalRequired: typeof rule?.approvalRequired === "boolean" ? rule.approvalRequired : (out.defaultRule?.approvalRequired ?? true),
    };
  }
  return out;
}

async function ensureRunnerPolicyForUser(userId: string) {
  const row = await prisma.runnerPolicy.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      templateKey: "default",
      templateName: "Default workspace template",
      version: 1,
      rulesJson: JSON.stringify(defaultRunnerPolicyRules()),
    },
  });
  return policyView(row);
}

function ruleForJobType(policy: RunnerPolicyView, jobType: string) {
  const defaultRule = policy.rules.defaultRule ?? { riskLevel: "medium", approvalRequired: true };
  const exact = policy.rules.jobTypeRules?.[jobType];
  return {
    riskLevel: cleanText(exact?.riskLevel, 12, cleanText(defaultRule.riskLevel, 12, "medium")),
    approvalRequired: typeof exact?.approvalRequired === "boolean" ? exact.approvalRequired : (defaultRule.approvalRequired !== false),
  };
}

export async function createRunnerRegistration(userId: string, input: {
  name: string;
  environment?: string;
  label?: string;
}) {
  const plainToken = `wfr_${randomToken(24)}`;
  const row = await prisma.runnerNode.create({
    data: {
      userId,
      name: cleanText(input.name, 120, "Local Runner"),
      environment: cleanText(input.environment, 32, "desktop"),
      label: cleanText(input.label, 160, "") || null,
      status: "PENDING",
      authTokenHash: sha256Hex(plainToken),
      authTokenLast4: plainToken.slice(-4),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "RUNNER",
      entityId: row.id,
      action: "REGISTER",
      summary: `Runner registered: ${row.name}`,
      metadata: maybeJsonString({ environment: row.environment, label: row.label }),
    },
  });

  return {
    runner: runnerView(row),
    authToken: plainToken,
  };
}

export async function listRunnersForUser(userId: string) {
  const rows = await prisma.runnerNode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(runnerView);
}

export async function getRunnerPolicyForUser(userId: string) {
  return ensureRunnerPolicyForUser(userId);
}

export async function getRunnerPolicyForRunner(runnerId: string) {
    const runner = await prisma.runnerNode.findFirst({ where: { id: runnerId } });
  if (!runner) throw new Error("Runner not found");
  const policy = await ensureRunnerPolicyForUser(runner.userId);
  return {
    policy,
    runner: runnerView(runner),
  };
}

export async function updateRunnerPolicyForUser(userId: string, input: {
  templateKey?: string;
  templateName?: string;
  version?: number;
  rules?: unknown;
}) {
  const current = await ensureRunnerPolicyForUser(userId);
  const nextRules = input.rules === undefined ? current.rules : sanitizeRunnerPolicyRules(input.rules);
  const row = await prisma.runnerPolicy.update({
    where: { userId },
    data: {
      templateKey: cleanText(input.templateKey, 80, current.templateKey),
      templateName: cleanText(input.templateName, 160, current.templateName),
      version: Math.max(1, Number(input.version ?? (current.version + 1)) || (current.version + 1)),
      rulesJson: JSON.stringify(nextRules),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      scope: "RUNNER_POLICY",
      entityId: row.id,
      action: "UPDATE",
      summary: `Updated runner policy: ${row.templateName}`,
      metadata: maybeJsonString({ templateKey: row.templateKey, version: row.version }),
    },
  });
  return policyView(row);
}

export async function authenticateRunnerBearer(authHeader: string | null) {
  const header = (authHeader ?? "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const row = await prisma.runnerNode.findFirst({
    where: {
      authTokenHash: sha256Hex(token),
      status: { not: "REVOKED" },
    },
  });
  return row ? runnerView(row) : null;
}

export async function heartbeatRunner(input: {
  runnerId: string;
  ip?: string | null;
  hostName?: string | null;
  osName?: string | null;
  runnerVersion?: string | null;
  capabilities?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}) {
  const row = await prisma.runnerNode.update({
    where: { id: input.runnerId },
    data: {
      status: "ONLINE",
      lastSeenAt: new Date(),
      lastIp: cleanText(input.ip, 80, "") || undefined,
      hostName: cleanText(input.hostName, 160, "") || undefined,
      osName: cleanText(input.osName, 120, "") || undefined,
      runnerVersion: cleanText(input.runnerVersion, 80, "") || undefined,
      capabilitiesJson: input.capabilities ? maybeJsonString(input.capabilities) : undefined,
      metadataJson: input.metadata ? maybeJsonString(input.metadata) : undefined,
    },
  });
  return runnerView(row);
}

export async function enqueueRunnerJob(userId: string, input: {
  title: string;
  jobType: string;
  payload: Record<string, unknown>;
  riskLevel?: "low" | "medium" | "high";
  approvalRequired?: boolean;
  requestedBy?: string | null;
  maxAttempts?: number;
}) {
  const policy = await ensureRunnerPolicyForUser(userId);
  const effectiveRule = ruleForJobType(policy, cleanText(input.jobType, 80, "generic"));
  const row = await prisma.runnerJob.create({
    data: {
      userId,
      title: cleanText(input.title, 240, "Runner job"),
      jobType: cleanText(input.jobType, 80, "generic"),
      status: (input.approvalRequired ?? effectiveRule.approvalRequired) ? "NEEDS_APPROVAL" : "QUEUED",
      riskLevel: cleanText(input.riskLevel, 12, effectiveRule.riskLevel),
      payloadJson: maybeJsonString(input.payload, 50000) ?? "{}",
      approvalRequired: Boolean(input.approvalRequired ?? effectiveRule.approvalRequired),
      requestedBy: cleanText(input.requestedBy, 120, "") || null,
      maxAttempts: Math.max(1, Math.min(10, Number(input.maxAttempts ?? 1) || 1)),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "RUNNER_JOB",
      entityId: row.id,
      action: "ENQUEUE",
      summary: `Enqueued runner job: ${row.title}`,
      metadata: maybeJsonString({ jobType: row.jobType, riskLevel: row.riskLevel, approvalRequired: row.approvalRequired }),
    },
  });

  return jobView(row, policy);
}

export async function listRunnerJobsForUser(userId: string, limit = 50) {
  const policy = await ensureRunnerPolicyForUser(userId);
  const rows = await prisma.runnerJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => jobView(row, policy));
}

export async function approveRunnerJob(userId: string, jobId: string) {
  const policy = await ensureRunnerPolicyForUser(userId);
  const existing = await prisma.runnerJob.findFirst({ where: { id: jobId, userId } });
  if (!existing) throw new Error("Job not found");
  const row = await prisma.runnerJob.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      approvedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      scope: "RUNNER_JOB",
      entityId: row.id,
      action: "APPROVE",
      summary: `Approved runner job: ${row.title}`,
    },
  });
  return jobView(row, policy);
}

export async function cancelRunnerJob(userId: string, jobId: string) {
  const policy = await ensureRunnerPolicyForUser(userId);
  const existing = await prisma.runnerJob.findFirst({ where: { id: jobId, userId } });
  if (!existing) throw new Error("Job not found");
  if (["SUCCEEDED", "FAILED", "CANCELED"].includes(existing.status)) {
    return jobView(existing, policy);
  }
  const row = await prisma.runnerJob.update({
    where: { id: jobId },
    data: {
      status: "CANCELED",
      errorMessage: existing.errorMessage ?? "Canceled by user",
      finishedAt: existing.finishedAt ?? new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      scope: "RUNNER_JOB",
      entityId: row.id,
      action: "CANCEL",
      summary: `Canceled runner job: ${row.title}`,
      metadata: maybeJsonString({ previousStatus: existing.status }),
    },
  });
  return jobView(row, policy);
}

export async function pollRunnerJobs(input: { runnerId: string; limit?: number; leaseSeconds?: number }) {
  const runner = await prisma.runnerNode.findFirst({ where: { id: input.runnerId } });
  if (!runner) throw new Error("Runner not found");
  const take = Math.max(1, Math.min(20, Number(input.limit ?? 3) || 3));
  const leaseSeconds = Math.max(15, Math.min(900, Number(input.leaseSeconds ?? 120) || 120));
  const candidates = await prisma.runnerJob.findMany({
    where: { userId: runner.userId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  // Filter in JS to remain compatible with current generated client fallback typing.
  const now = new Date();
  for (const job of candidates) {
    const leaseExpired = Boolean(job.leaseExpiresAt && job.leaseExpiresAt <= now);
    if (!leaseExpired) continue;
    if (job.status !== "LEASED" && job.status !== "RUNNING") continue;
    const shouldRetry = (job.attempts ?? 0) < (job.maxAttempts ?? 1);
    await prisma.runnerJob.update({
      where: { id: job.id },
      data: {
        status: shouldRetry ? "QUEUED" : "FAILED",
        runnerNodeId: shouldRetry ? null : job.runnerNodeId,
        leaseToken: null,
        leaseExpiresAt: null,
        errorMessage: shouldRetry
          ? "Lease expired; re-queued for retry"
          : "Lease expired and retry budget exhausted",
        finishedAt: shouldRetry ? null : (job.finishedAt ?? new Date()),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: runner.userId,
        scope: "RUNNER_JOB",
        entityId: job.id,
        action: shouldRetry ? "REQUEUE_EXPIRED_LEASE" : "FAIL_EXPIRED_LEASE",
        summary: shouldRetry ? `Re-queued expired runner job: ${job.title}` : `Failed expired runner job: ${job.title}`,
      },
    });
  }
  const refreshedCandidates = await prisma.runnerJob.findMany({
    where: { userId: runner.userId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const available = refreshedCandidates.filter((job) =>
    job.status === "QUEUED" &&
    (!job.leaseExpiresAt || job.leaseExpiresAt <= now),
  );

  const leased: Array<ReturnType<typeof jobView> & { leaseToken: string }> = [];
  for (const job of available.slice(0, take)) {
    const leaseToken = randomToken(18);
    // Atomic claim: only lease if the job is still QUEUED (prevents double-leasing)
    const claimed = await prisma.runnerJob.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: {
        runnerNodeId: input.runnerId,
        status: "LEASED",
        leaseToken,
        leaseExpiresAt: nowPlusSeconds(leaseSeconds),
        attempts: (job.attempts ?? 0) + 1,
      },
    });
    if (claimed.count === 0) continue; // another runner grabbed it first
    const updated = await prisma.runnerJob.findFirst({ where: { id: job.id } });
    if (updated) leased.push({ ...jobView(updated), leaseToken });
  }

  return { jobs: leased };
}

async function getJobForRunner(jobId: string, runnerId: string, leaseToken?: string) {
  const job = await prisma.runnerJob.findFirst({ where: { id: jobId } });
  if (!job) throw new Error("Runner job not found");
  if (job.runnerNodeId !== runnerId) throw new Error("Runner job is not assigned to this runner");
  if (leaseToken && job.leaseToken !== leaseToken) throw new Error("Invalid lease token");
  return job;
}

export async function startRunnerJob(input: { runnerId: string; jobId: string; leaseToken: string }) {
  const job = await getJobForRunner(input.jobId, input.runnerId, input.leaseToken);
  const updated = await prisma.runnerJob.update({
    where: { id: job.id },
    data: {
      status: "RUNNING",
      startedAt: job.startedAt ?? new Date(),
      leaseExpiresAt: nowPlusSeconds(300),
    },
  });
  const policy = await ensureRunnerPolicyForUser(job.userId);
  return jobView(updated, policy);
}

export async function renewRunnerJobLease(input: { runnerId: string; jobId: string; leaseToken: string; leaseSeconds?: number }) {
  const job = await getJobForRunner(input.jobId, input.runnerId, input.leaseToken);
  if (job.status === "CANCELED") throw new Error("Runner job was canceled");
  if (job.status === "FAILED" || job.status === "SUCCEEDED") throw new Error(`Runner job already ${job.status.toLowerCase()}`);
  const updated = await prisma.runnerJob.update({
    where: { id: job.id },
    data: {
      leaseExpiresAt: nowPlusSeconds(Math.max(15, Math.min(900, Number(input.leaseSeconds ?? 120) || 120))),
      status: job.status === "LEASED" ? "RUNNING" : job.status,
      startedAt: job.startedAt ?? new Date(),
    },
  });
  const policy = await ensureRunnerPolicyForUser(job.userId);
  return jobView(updated, policy);
}

export async function appendRunnerJobEvents(input: {
  runnerId: string;
  jobId: string;
  leaseToken?: string;
  events: Array<{ eventType: string; level?: string; message: string; data?: Record<string, unknown> | null }>;
}) {
  const job = await getJobForRunner(input.jobId, input.runnerId, input.leaseToken);
  if (job.status === "CANCELED") return { count: 0, canceled: true };
  const events = input.events.slice(0, 100).map((e) => ({
    runnerJobId: job.id,
    eventType: cleanText(e.eventType, 60, "log"),
    level: cleanText(e.level, 20, "info"),
    message: cleanText(e.message, 4000, ""),
    dataJson: e.data ? maybeJsonString(e.data, 20000) : null,
  })).filter((e) => e.message);
  if (!events.length) return { count: 0 };

  await prisma.runnerJobEvent.createMany({ data: events });
  await prisma.runnerJob.update({
    where: { id: job.id },
    data: { leaseExpiresAt: nowPlusSeconds(300) },
  });
  return { count: events.length, canceled: false };
}

export async function enqueueRunnerJobControl(input: {
  userId: string;
  jobId: string;
  kind: string;
  payload: Record<string, unknown>;
}) {
  const job = await prisma.runnerJob.findFirst({ where: { id: input.jobId, userId: input.userId } });
  if (!job) throw new Error("Runner job not found");
  if (!["LEASED", "RUNNING"].includes(job.status)) {
    throw new Error(`Runner job is not interactive right now (status: ${job.status})`);
  }
  const kind = cleanText(input.kind, 40, "stdin");
  if (!["stdin.write", "stdin.line", "signal", "resize"].includes(kind)) {
    throw new Error("Unsupported control kind");
  }
  await prisma.runnerJobControl.create({
    data: {
      runnerJobId: job.id,
      kind,
      payloadJson: maybeJsonString(input.payload, 20000) ?? "{}",
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      scope: "RUNNER_JOB",
      entityId: job.id,
      action: "CONTROL",
      summary: `Queued runner control (${kind}) for job: ${job.title}`,
      metadata: maybeJsonString({ kind }),
    },
  });
  return { ok: true };
}

export async function pollRunnerJobControls(input: {
  runnerId: string;
  jobId: string;
  leaseToken: string;
  limit?: number;
}) {
  const job = await getJobForRunner(input.jobId, input.runnerId, input.leaseToken);
  if (job.status === "CANCELED") return { controls: [], canceled: true };
  const limit = Math.max(1, Math.min(100, Number(input.limit ?? 20) || 20));
  const controls = await prisma.runnerJobControl.findMany({
    where: { runnerJobId: job.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const control of controls) {
    await prisma.runnerJobControl.update({
      where: { id: control.id },
      data: { status: "APPLIED", appliedAt: new Date() },
    });
  }
  return {
    canceled: false,
    controls: controls.map((control) => ({
      id: control.id,
      kind: control.kind,
      payload: parseJson<Record<string, unknown>>(control.payloadJson) ?? {},
      createdAt: control.createdAt.toISOString(),
    })),
  };
}

export async function completeRunnerJob(input: {
  runnerId: string;
  jobId: string;
  leaseToken: string;
  ok: boolean;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
}) {
  const job = await getJobForRunner(input.jobId, input.runnerId, input.leaseToken);
  if (job.status === "CANCELED") {
    const policy = await ensureRunnerPolicyForUser(job.userId);
    return jobView(job, policy);
  }
  const status = input.ok ? "SUCCEEDED" : "FAILED";
  const updated = await prisma.runnerJob.update({
    where: { id: job.id },
    data: {
      status,
      resultJson: input.result ? maybeJsonString(input.result, 50000) : undefined,
      errorMessage: input.ok ? null : cleanText(input.errorMessage, 2000, "Runner job failed"),
      finishedAt: new Date(),
      leaseToken: null,
      leaseExpiresAt: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: updated.userId,
      scope: "RUNNER_JOB",
      entityId: updated.id,
      action: input.ok ? "COMPLETE" : "FAIL",
      summary: `${input.ok ? "Completed" : "Failed"} runner job: ${updated.title}`,
      metadata: maybeJsonString({ status, runnerNodeId: updated.runnerNodeId }),
    },
  });

  if (!input.ok) {
    notifyTaskFailed(updated.userId, { taskTitle: updated.title, agentName: "Runner" }).catch((e) => {
      console.error("[notifications] notifyTaskFailed error:", e);
    });
  }

  eventBus.emit({
    type: "RUNNER_JOB_COMPLETED",
    userId: updated.userId,
    jobId: updated.id,
    jobType: updated.jobType,
    ok: input.ok,
    errorMessage: input.ok ? null : (updated.errorMessage ?? null),
  });

  const policy = await ensureRunnerPolicyForUser(job.userId);
  return jobView(updated, policy);
}

export async function listRunnerJobEventsForUser(userId: string, jobId: string, limit = 200) {
  const job = await prisma.runnerJob.findFirst({ where: { id: jobId, userId } });
  if (!job) throw new Error("Runner job not found");
  const eventRows = await prisma.runnerJobEvent.findMany({
    where: { runnerJobId: jobId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return eventRows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    level: row.level,
    message: row.message,
    data: parseJson<Record<string, unknown>>(row.dataJson),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getRunnerJobForUser(userId: string, jobId: string) {
  const policy = await ensureRunnerPolicyForUser(userId);
  const row = await prisma.runnerJob.findFirst({ where: { id: jobId, userId } });
  if (!row) throw new Error("Runner job not found");
  return jobView(row, policy);
}

/**
 * Mark runners OFFLINE if their lastSeenAt exceeds the staleness threshold,
 * and requeue any jobs they had leased. Called during heartbeat tick.
 */
export async function sweepStaleRunners(userId: string): Promise<number> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const staleRunners = await prisma.runnerNode.findMany({
    where: {
      userId,
      status: "ONLINE",
      lastSeenAt: { lt: fiveMinAgo },
    },
    select: { id: true, name: true },
  });

  if (staleRunners.length === 0) return 0;

  const staleRunnerIds = staleRunners.map((r) => r.id);

  // Mark stale runners OFFLINE
  await prisma.runnerNode.updateMany({
    where: { id: { in: staleRunnerIds } },
    data: { status: "OFFLINE" },
  });

  // Find jobs leased/running on these dead runners
  const orphanedJobs = await prisma.runnerJob.findMany({
    where: {
      userId,
      runnerNodeId: { in: staleRunnerIds },
      status: { in: ["LEASED", "RUNNING"] },
    },
    select: { id: true, title: true, attempts: true, maxAttempts: true, runnerNodeId: true },
  });

  for (const job of orphanedJobs) {
    const canRetry = (job.attempts ?? 0) < (job.maxAttempts ?? 1);
    await prisma.runnerJob.update({
      where: { id: job.id },
      data: {
        status: canRetry ? "QUEUED" : "FAILED",
        runnerNodeId: canRetry ? null : job.runnerNodeId,
        leaseToken: null,
        leaseExpiresAt: null,
        errorMessage: canRetry
          ? "Runner went offline; re-queued for retry"
          : "Runner went offline and retry budget exhausted",
        finishedAt: canRetry ? null : new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        scope: "RUNNER_JOB",
        entityId: job.id,
        action: canRetry ? "REQUEUE_DEAD_RUNNER" : "FAIL_DEAD_RUNNER",
        summary: canRetry
          ? `Re-queued job "${job.title}" after runner went offline`
          : `Failed job "${job.title}" after runner went offline (retries exhausted)`,
      },
    }).catch(() => null);
  }

  for (const runner of staleRunners) {
    await prisma.auditLog.create({
      data: {
        userId,
        scope: "HEARTBEAT_RECOVERY",
        entityId: runner.id,
        action: "RUNNER_MARKED_OFFLINE",
        summary: `Marked runner "${runner.name}" offline (no heartbeat for 5+ minutes)`,
      },
    }).catch(() => null);
  }

  return staleRunners.length;
}
