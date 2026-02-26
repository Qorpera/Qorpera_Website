import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { listBusinessFiles } from "@/lib/business-files-store";
import { listBusinessLogs, createBusinessLog } from "@/lib/business-logs-store";
import { getProjectsForUser } from "@/lib/workspace-store";
import { getInboxItems } from "@/lib/inbox-store";
import { isUrlAllowedForServerFetch } from "@/lib/network-policy";
// NOTE: orchestration-store is NOT imported statically to avoid circular dependency:
//   orchestration-store → agentic-loop → tool-executor → orchestration-store
// Instead, createDelegatedTask is dynamically imported in handleDelegateTask().
import { bridgeDelegatedTaskToRunner, pollRunnerJobResult } from "@/lib/runner-bridge";
import type { ToolCallRequest } from "@/lib/agent-llm";
import type { ToolDefinitionView } from "@/lib/tool-registry";

export type ToolExecutionContext = {
  userId: string;
  delegatedTaskId: string;
  agentKind: string;
  requireApproval: boolean;
};

export type ToolExecutionResult = {
  output: string;
  status: "ok" | "error" | "approval_required";
  latencyMs: number;
};

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, unknown>;
    return {};
  } catch {
    throw new Error("Could not parse arguments as JSON");
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- In-process handlers ---

async function handleReadFile(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const fileId = String(args.file_id ?? "");
  if (!fileId) return "Error: file_id is required";

  const file = await prisma.businessFile.findFirst({
    where: { id: fileId, userId: ctx.userId },
  });
  if (!file) return `Error: File not found with id "${fileId}"`;

  if (file.textExtract) {
    return file.textExtract.slice(0, 8000);
  }

  try {
    const content = await readFile(file.storagePath, "utf8");
    return content.slice(0, 8000);
  } catch {
    return `File "${file.name}" exists but could not read content (binary or inaccessible)`;
  }
}

async function handleListFiles(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const limit = Math.min(Number(args.limit) || 20, 50);
  const files = await listBusinessFiles(ctx.userId, limit);

  const categoryFilter = typeof args.category === "string" ? args.category.toUpperCase() : null;
  const filtered = categoryFilter
    ? files.filter((f) => f.category === categoryFilter)
    : files;

  if (filtered.length === 0) return "No business files found.";

  const summary = filtered.slice(0, limit).map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  }));
  return JSON.stringify(summary, null, 2);
}

async function handleSearchBusinessLogs(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const limit = Math.min(Number(args.limit) || 10, 30);
  const logs = await listBusinessLogs(ctx.userId, 40);

  let filtered = logs;
  const query = typeof args.query === "string" ? args.query.toLowerCase() : null;
  const category = typeof args.category === "string" ? args.category.toUpperCase() : null;

  if (query) {
    filtered = filtered.filter(
      (l) => l.title.toLowerCase().includes(query) || l.body.toLowerCase().includes(query),
    );
  }
  if (category) {
    filtered = filtered.filter((l) => l.category === category);
  }

  if (filtered.length === 0) return "No matching business log entries found.";

  const summary = filtered.slice(0, limit).map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    source: l.source,
    createdAt: l.createdAt.toISOString(),
    bodyPreview: l.body.slice(0, 300),
  }));
  return JSON.stringify(summary, null, 2);
}

async function handleGetProjectDetails(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const slug = String(args.slug ?? "");
  if (!slug) return "Error: slug is required";

  const projects = await getProjectsForUser(ctx.userId);
  const project = projects.find((p) => p.slug === slug || p.id === slug);
  if (!project) return `Error: Project not found with slug "${slug}"`;

  return JSON.stringify({
    id: project.id,
    slug: project.slug,
    name: project.name,
    goal: project.goal,
    status: project.status,
    health: project.workforceHealth,
    board: project.board,
    artifacts: project.artifacts,
    timeline: project.timeline,
  }, null, 2);
}

async function handleListInboxItems(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const items = await getInboxItems(ctx.userId);
  const filter = typeof args.filter === "string" ? args.filter.toLowerCase() : null;

  let filtered = items;
  if (filter === "approvals") {
    filtered = filtered.filter((i) => i.type === "approval");
  } else if (filter === "open") {
    filtered = filtered.filter((i) => i.state === "open");
  }

  if (filtered.length === 0) return "No inbox items found.";

  const summary = filtered.map((i) => ({
    id: i.id,
    type: i.type,
    summary: i.summary,
    state: i.state ?? "open",
    stateLabel: i.stateLabel ?? "Open",
  }));
  return JSON.stringify(summary, null, 2);
}

async function handleWebFetch(args: Record<string, unknown>): Promise<string> {
  const url = String(args.url ?? "");
  if (!url) return "Error: url is required";

  const policy = isUrlAllowedForServerFetch(url);
  if (!policy.allowed) return `Error: URL blocked - ${policy.reason}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return `Error: HTTP ${res.status} from ${url}`;

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const content = contentType.includes("html") ? stripHtml(text) : text.replace(/\s+/g, " ").trim();
    return content.slice(0, 6000);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return "Error: Request timed out (3s)";
    return `Error: Failed to fetch URL - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleDelegateTask(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const toAgent = String(args.to_agent ?? "").toUpperCase();
  const title = String(args.title ?? "");
  const instructions = String(args.instructions ?? "");

  if (!toAgent || !title || !instructions) {
    return "Error: to_agent, title, and instructions are all required";
  }
  if (!["ASSISTANT", "PROJECT_MANAGER", "CHIEF_ADVISOR"].includes(toAgent)) {
    return `Error: Invalid agent target "${toAgent}". Use ASSISTANT or PROJECT_MANAGER.`;
  }

  try {
    // Dynamic import to avoid circular dependency
    const { createDelegatedTask } = await import("@/lib/orchestration-store");
    const task = await createDelegatedTask(ctx.userId, {
      fromAgent: ctx.agentKind,
      toAgentTarget: toAgent as "ASSISTANT" | "PROJECT_MANAGER" | "CHIEF_ADVISOR",
      title,
      instructions,
      triggerSource: "DELEGATED",
      inputFromTaskId: ctx.delegatedTaskId || undefined,
    });
    return `Task created successfully. Task ID: ${task.id}`;
  } catch (e: unknown) {
    return `Error creating delegated task: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleCreateBusinessLog(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const title = String(args.title ?? "");
  const body = String(args.body ?? "");
  const category = typeof args.category === "string" ? args.category.toUpperCase() : undefined;

  if (!title || !body) return "Error: title and body are required";

  try {
    const entry = await createBusinessLog(ctx.userId, {
      title,
      body,
      category: category as "FINANCIAL" | "PROJECT" | "COLLABORATION" | "OPERATIONS" | "SALES" | "MARKETING" | "LEGAL" | "GENERAL" | undefined,
      source: "AGENT",
      authorLabel: ctx.agentKind.replaceAll("_", " "),
    });
    return `Business log entry created. ID: ${entry.id}`;
  } catch (e: unknown) {
    return `Error creating business log: ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleSendEmail(args: Record<string, unknown>): Promise<string> {
  const to = String(args.to ?? "");
  const subject = String(args.subject ?? "");
  const body = String(args.body ?? "");
  return `Email queued for approval.\nTo: ${to}\nSubject: ${subject}\nBody preview: ${body.slice(0, 200)}`;
}

async function handleCallWebhook(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const url = String(args.url ?? "").trim();
  const method = typeof args.method === "string" ? args.method.toUpperCase() : "POST";
  const payload = args.payload ?? {};

  if (!url) return "Error: url is required";

  // When approval is required, queue it — args are stored and executed after approval
  if (ctx.requireApproval) {
    return `Webhook queued for approval.\nURL: ${url}\nMethod: ${method}\nPayload preview: ${JSON.stringify(payload).slice(0, 200)}`;
  }

  const policy = isUrlAllowedForServerFetch(url);
  if (!policy.allowed) return `Error: URL blocked - ${policy.reason}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "User-Agent": "Zygenic-Agent/1.0" },
      body: method !== "GET" ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text().catch(() => "");
    if (!res.ok) return `Webhook returned HTTP ${res.status}: ${text.slice(0, 200)}`;
    return `Webhook delivered (HTTP ${res.status}). Response: ${text.slice(0, 300)}`;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return "Error: Webhook timed out after 10s";
    return `Error: Webhook failed - ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Runner-dispatched handlers ---

/**
 * Parse a command string into an array of [executable, ...args],
 * respecting single and double-quoted segments.
 */
function parseCommandToArray(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === " " && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

async function handleRunCommand(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const command = String(args.command ?? "");
  if (!command) return "Error: command is required";

  const cmdArray = parseCommandToArray(command);
  if (cmdArray.length === 0) return "Error: command is empty after parsing";

  try {
    const { getDecryptedSkillEnvVars } = await import("@/lib/skill-credentials-store");
    const skillEnv = await getDecryptedSkillEnvVars(ctx.userId);

    const job = await bridgeDelegatedTaskToRunner({
      userId: ctx.userId,
      delegatedTaskId: ctx.delegatedTaskId,
      title: `Agent command: ${command.slice(0, 80)}`,
      jobType: "command.exec",
      payload: {
        command: cmdArray,
        cwd: typeof args.cwd === "string" ? args.cwd : undefined,
        env: skillEnv,
      },
    });

    const result = await pollRunnerJobResult(ctx.userId, job.id, { timeoutMs: 30000 });
    if (result.ok) {
      const output = typeof result.result?.output === "string" ? result.result.output : JSON.stringify(result.result ?? {});
      return output.slice(0, 6000);
    }
    return `Command failed: ${result.errorMessage ?? result.status}`;
  } catch (e: unknown) {
    return `Runner error: ${e instanceof Error ? e.message : "Runner daemon not available"}`;
  }
}

async function handleWriteFile(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const filePath = String(args.path ?? "");
  const content = String(args.content ?? "");
  if (!filePath || !content) return "Error: path and content are required";

  try {
    const job = await bridgeDelegatedTaskToRunner({
      userId: ctx.userId,
      delegatedTaskId: ctx.delegatedTaskId,
      title: `Write file: ${filePath.slice(0, 80)}`,
      jobType: "file.write",
      payload: { path: filePath, content },
    });

    const result = await pollRunnerJobResult(ctx.userId, job.id, { timeoutMs: 15000 });
    if (result.ok) return `File written successfully: ${filePath}`;
    return `Write failed: ${result.errorMessage ?? result.status}`;
  } catch (e: unknown) {
    return `Runner error: ${e instanceof Error ? e.message : "Runner daemon not available"}`;
  }
}

// --- Dispatch ---

const IN_PROCESS_HANDLERS: Record<string, (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<string>> = {
  read_file: handleReadFile,
  list_files: handleListFiles,
  search_business_logs: handleSearchBusinessLogs,
  get_project_details: handleGetProjectDetails,
  list_inbox_items: handleListInboxItems,
  web_fetch: (args) => handleWebFetch(args),
  delegate_task: handleDelegateTask,
  create_business_log: handleCreateBusinessLog,
  send_email: (args) => handleSendEmail(args),
  call_webhook: handleCallWebhook,
};

const RUNNER_HANDLERS: Record<string, (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<string>> = {
  run_command: handleRunCommand,
  write_file: handleWriteFile,
};

export async function executeToolCall(
  call: ToolCallRequest,
  toolDef: ToolDefinitionView,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const start = Date.now();

  try {
    const args = parseArgs(call.arguments);

    if (toolDef.executionMode === "approval_required" || (ctx.requireApproval && toolDef.category === "external")) {
      const handler = IN_PROCESS_HANDLERS[call.name];
      const output = handler ? await handler(args, ctx) : `Tool "${call.name}" queued for approval.`;
      return { output, status: "approval_required", latencyMs: Date.now() - start };
    }

    if (toolDef.executionMode === "runner") {
      const handler = RUNNER_HANDLERS[call.name];
      if (!handler) {
        return { output: `No runner handler for tool "${call.name}"`, status: "error", latencyMs: Date.now() - start };
      }
      const output = await handler(args, ctx);
      return { output, status: "ok", latencyMs: Date.now() - start };
    }

    // in_process
    const handler = IN_PROCESS_HANDLERS[call.name];
    if (!handler) {
      const available = [...Object.keys(IN_PROCESS_HANDLERS), ...Object.keys(RUNNER_HANDLERS)].join(", ");
      return {
        output: `Unknown tool "${call.name}". Available tools: ${available}`,
        status: "error",
        latencyMs: Date.now() - start,
      };
    }

    const output = await handler(args, ctx);
    return { output, status: "ok", latencyMs: Date.now() - start };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown execution error";
    return { output: `Error executing tool "${call.name}": ${message}`, status: "error", latencyMs: Date.now() - start };
  }
}

export async function executeToolCallsParallel(
  calls: ToolCallRequest[],
  toolDefs: Map<string, ToolDefinitionView>,
  ctx: ToolExecutionContext,
  maxParallel = 4,
): Promise<Map<string, ToolExecutionResult>> {
  const results = new Map<string, ToolExecutionResult>();

  // Process in batches of maxParallel
  for (let i = 0; i < calls.length; i += maxParallel) {
    const batch = calls.slice(i, i + maxParallel);
    const promises = batch.map(async (call) => {
      const toolDef = toolDefs.get(call.name);
      if (!toolDef) {
        const available = [...toolDefs.keys()].join(", ");
        results.set(call.id, {
          output: `Unknown tool "${call.name}". Available tools: ${available}`,
          status: "error",
          latencyMs: 0,
        });
        return;
      }
      const result = await executeToolCall(call, toolDef, ctx);
      results.set(call.id, result);
    });
    await Promise.all(promises);
  }

  return results;
}
