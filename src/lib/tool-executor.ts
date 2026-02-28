import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { extractTextFromBuffer } from "@/lib/text-extraction";
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

  // Fallback: try extracting text from raw bytes (covers .docx/.pdf uploaded before extraction was wired in)
  const ext = path.extname(file.name).toLowerCase();
  if (ext === ".docx" || ext === ".pdf") {
    try {
      const bytes = await readFile(file.storagePath);
      const extracted = await extractTextFromBuffer(file.name, bytes);
      if (extracted) return extracted.slice(0, 8000);
    } catch {
      // fall through to generic read
    }
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
  if (!["ASSISTANT", "CHIEF_ADVISOR", "SALES_REP", "CUSTOMER_SUCCESS", "MARKETING_COORDINATOR", "FINANCE_ANALYST", "OPERATIONS_MANAGER", "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST", "SEO_SPECIALIST"].includes(toAgent)) {
    return `Error: Invalid agent target "${toAgent}". Use ASSISTANT or another valid agent kind.`;
  }

  try {
    // Dynamic import to avoid circular dependency
    const { createDelegatedTask } = await import("@/lib/orchestration-store");
    const task = await createDelegatedTask(ctx.userId, {
      fromAgent: ctx.agentKind,
      toAgentTarget: toAgent as "ASSISTANT" | "CHIEF_ADVISOR",
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
      headers: { "Content-Type": "application/json", "User-Agent": "Qorpera-Agent/1.0" },
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

// --- Research tools (web_search, extract_content, quality_review) ---

async function handleWebSearch(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const query = String(args.query ?? "").trim();
  if (!query) return "Error: query is required";

  const apiKey = await getCachedSkillEnvVar(ctx.userId, "TAVILY_API_KEY");
  if (!apiKey) return "Error: TAVILY_API_KEY not set. Add it in Settings → Skills → Tavily Research.";

  const searchDepth = String(args.search_depth ?? "basic");
  const maxResults = Math.min(Number(args.max_results) || 5, 10);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return `Error: Tavily API returned HTTP ${res.status}`;

    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string }>;
    };

    const parts: string[] = [];
    if (data.answer) parts.push(`**Answer:** ${data.answer}\n`);
    if (data.results?.length) {
      parts.push("**Sources:**");
      for (const r of data.results) {
        parts.push(`- [${r.title}](${r.url}): ${r.content.slice(0, 300)}`);
      }
    }

    const output = parts.join("\n");
    return output.slice(0, 8000) || "No results found.";
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "TimeoutError") return "Error: Tavily search timed out (15s)";
    return `Error: Web search failed - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleExtractContent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const url = String(args.url ?? "").trim();
  if (!url) return "Error: url is required";

  const maxLength = Math.min(Number(args.max_length) || 8000, 12000);

  const apiKey = await getCachedSkillEnvVar(ctx.userId, "TAVILY_API_KEY");

  // Try Tavily Extract first if API key available
  if (apiKey) {
    try {
      const res = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, urls: [url] }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ url: string; raw_content: string }>;
        };
        const content = data.results?.[0]?.raw_content;
        if (content) return content.slice(0, maxLength);
      }
      // Fall through to basic fetch on failure
    } catch {
      // Fall through to basic fetch
    }
  }

  // Fallback: basic HTTP GET + stripHtml (same as handleWebFetch)
  return handleWebFetch({ url }).then((text) => text.slice(0, maxLength));
}

async function handleQualityReview(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const draft = String(args.draft ?? "").trim();
  if (!draft) return "Error: draft is required";

  const reviewFocus = String(args.review_focus ?? "all");
  const context = String(args.context ?? "");

  const systemPrompt = `You are a senior research quality reviewer. Evaluate the following research draft.
Focus: ${reviewFocus}. ${context ? `Context: ${context}.` : ""}

Provide:
1) Confidence score (0-100)
2) Factual accuracy assessment
3) Completeness gaps
4) Reasoning quality
5) Specific improvements needed

Be concise and actionable.`;

  try {
    const { callAgentLlm } = await import("@/lib/agent-llm");
    const result = await callAgentLlm({
      userId: ctx.userId,
      agentKind: "CHIEF_ADVISOR",
      systemPrompt,
      userMessage: `Draft to review:\n\n${draft.slice(0, 10000)}`,
      maxOutputTokens: 2048,
    });
    return result.text || "Quality review returned no output.";
  } catch (e: unknown) {
    return `Quality review degraded (cloud model unavailable): ${e instanceof Error ? e.message : "unknown error"}. Proceed with caution — manual review recommended.`;
  }
}

// --- Figma helpers ---

// Short-lived cache for decrypted skill env vars (avoids redundant DB decryption within a single task run)
const _skillEnvCache = new Map<string, { value: string | null; expiresAt: number }>();
const SKILL_ENV_CACHE_TTL_MS = 60_000; // 1 minute

async function getCachedSkillEnvVar(userId: string, varName: string): Promise<string | null> {
  const key = `${userId}:${varName}`;
  const cached = _skillEnvCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const { getDecryptedSkillEnvVar } = await import("@/lib/skill-credentials-store");
  const value = await getDecryptedSkillEnvVar(userId, varName);
  _skillEnvCache.set(key, { value, expiresAt: Date.now() + SKILL_ENV_CACHE_TTL_MS });
  return value;
}

type FigmaColor = { r: number; g: number; b: number; a: number };

function figmaColorToRgba(c: FigmaColor): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r},${g},${b},${c.a.toFixed(2)})`;
}

function extractFigmaDesignSummary(data: Record<string, unknown>, isNodeRequest: boolean): Record<string, unknown> {
  if (isNodeRequest) {
    const nodes = data.nodes as Record<string, { document: Record<string, unknown> }> | undefined;
    if (!nodes) return { error: "No nodes in response" };
    const firstKey = Object.keys(nodes)[0];
    if (!firstKey) return { error: "Empty nodes object" };
    const doc = nodes[firstKey]?.document ?? {};

    const fills = (doc.fills as Array<{ type: string; color?: FigmaColor }> | undefined) ?? [];
    const colors = fills
      .filter((f) => f.type === "SOLID" && f.color)
      .map((f) => figmaColorToRgba(f.color!));

    const style = doc.style as Record<string, unknown> | undefined;
    const typography = style
      ? { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight }
      : undefined;

    const bbox = doc.absoluteBoundingBox as { x: number; y: number; width: number; height: number } | undefined;
    const children = (doc.children as Array<{ name: string }> | undefined) ?? [];

    return {
      name: doc.name,
      type: doc.type,
      boundingBox: bbox,
      colors,
      ...(typography ? { typography } : {}),
      children: children.map((c) => c.name),
    };
  }

  // File-level summary
  const styles = data.styles as Record<string, { name: string; styleType: string }> | undefined;
  const styleList = styles
    ? Object.values(styles).map((s) => ({ name: s.name, styleType: s.styleType }))
    : [];

  const doc = data.document as { children?: Array<{ name: string }> } | undefined;
  const pages = doc?.children?.map((c) => c.name) ?? [];

  return {
    name: data.name,
    lastModified: data.lastModified,
    styles: styleList,
    pages,
  };
}

async function handleFigmaGetDesign(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getCachedSkillEnvVar(ctx.userId, "FIGMA_ACCESS_TOKEN");
  if (!token) return "Error: FIGMA_ACCESS_TOKEN not set. Add it in Settings → Skills → Figma Design.";

  const fileKey = String(args.file_key ?? "");
  if (!fileKey) return "Error: file_key is required";

  const nodeId = args.node_id ? String(args.node_id) : null;
  const url = nodeId
    ? `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&depth=2`
    : `https://api.figma.com/v1/files/${fileKey}?depth=2`;

  try {
    const res = await fetch(url, {
      headers: { "X-Figma-Token": token },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `Error: Figma API ${res.status} ${res.statusText}`;
    const data = (await res.json()) as Record<string, unknown>;
    const summary = extractFigmaDesignSummary(data, !!nodeId);
    return JSON.stringify(summary).slice(0, 6000);
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "TimeoutError") return "Error: Figma API request timed out (8s)";
    return `Error: ${e instanceof Error ? e.message : "Figma API request failed"}`;
  }
}

async function handleFigmaGetImage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getCachedSkillEnvVar(ctx.userId, "FIGMA_ACCESS_TOKEN");
  if (!token) return "Error: FIGMA_ACCESS_TOKEN not set. Add it in Settings → Skills → Figma Design.";

  const fileKey = String(args.file_key ?? "");
  const nodeId = String(args.node_id ?? "");
  if (!fileKey) return "Error: file_key is required";
  if (!nodeId) return "Error: node_id is required";

  const format = String(args.format ?? "png");
  const scale = Number(args.scale ?? 1);
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=${format}&scale=${scale}`;

  try {
    const res = await fetch(url, {
      headers: { "X-Figma-Token": token },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `Error: Figma API ${res.status} ${res.statusText}`;
    const data = (await res.json()) as { images?: Record<string, string> };
    const imageUrl = data.images?.[nodeId];
    if (!imageUrl) return "Error: No image returned for that node ID";
    return imageUrl;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "TimeoutError") return "Error: Figma API request timed out (8s)";
    return `Error: ${e instanceof Error ? e.message : "Figma API request failed"}`;
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

// --- Integration tool handlers ---

async function getIntegrationToken(userId: string, provider: string): Promise<string | null> {
  const { getAccessToken } = await import("@/lib/integrations/token-store");
  return getAccessToken(userId, provider);
}

function integrationNotConnected(provider: string): string {
  const labels: Record<string, string> = {
    hubspot: "HubSpot",
    slack: "Slack",
    google: "Google Workspace",
    linear: "Linear",
  };
  return `Error: ${labels[provider] ?? provider} not connected. Go to Settings → Integrations to connect.`;
}

// -- HubSpot --

async function handleHubspotSearchContacts(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const { searchContacts } = await import("@/lib/integrations/hubspot");
    const data = await searchContacts(token, String(args.query ?? ""));
    const results = (data as Record<string, unknown>).results as unknown[] | undefined;
    return JSON.stringify(results?.slice(0, 10) ?? [], null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleHubspotCreateContact(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const properties = (typeof args.properties === "object" && args.properties !== null
      ? args.properties
      : {}) as Record<string, string>;
    const { createContact } = await import("@/lib/integrations/hubspot");
    const result = await createContact(token, properties);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleHubspotUpdateContact(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const contactId = String(args.contact_id ?? "");
  if (!contactId) return "Error: contact_id is required";
  try {
    const properties = (typeof args.properties === "object" && args.properties !== null
      ? args.properties
      : {}) as Record<string, string>;
    const { updateContact } = await import("@/lib/integrations/hubspot");
    const result = await updateContact(token, contactId, properties);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleHubspotListDeals(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args;
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const { listDeals } = await import("@/lib/integrations/hubspot");
    const data = await listDeals(token);
    const results = (data as Record<string, unknown>).results as unknown[] | undefined;
    return JSON.stringify(results?.slice(0, 20) ?? [], null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleHubspotCreateNote(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const body = String(args.body ?? "");
  if (!body) return "Error: body is required";
  try {
    const { createNote } = await import("@/lib/integrations/hubspot");
    const result = await createNote(token, body, args.contact_id ? String(args.contact_id) : undefined);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// -- Slack --

async function handleSlackListChannels(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args;
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  try {
    const { listChannels } = await import("@/lib/integrations/slack");
    const data = await listChannels(token);
    type SlackChannel = { id: string; name: string; is_private?: boolean; num_members?: number };
    const channels = (data as Record<string, unknown>).channels as SlackChannel[] | undefined;
    return JSON.stringify(
      channels?.slice(0, 50).map((c) => ({ id: c.id, name: c.name, is_private: c.is_private, members: c.num_members })) ?? [],
      null, 2,
    );
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleSlackPostMessage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const channel = String(args.channel ?? "");
  const text = String(args.text ?? "");
  if (!channel || !text) return "Error: channel and text are required";
  return `Slack message queued for approval.\nChannel: ${channel}\nMessage: ${text.slice(0, 300)}`;
}

// -- Google --

async function handleGoogleListEmails(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const maxResults = Math.min(Number(args.max_results) || 10, 20);
  try {
    const { listEmails } = await import("@/lib/integrations/google");
    const data = await listEmails(token, maxResults);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleSendEmail(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const to = String(args.to ?? "");
  const subject = String(args.subject ?? "");
  const body = String(args.body ?? "");
  if (!to || !subject || !body) return "Error: to, subject, and body are required";
  return `Gmail send queued for approval.\nTo: ${to}\nSubject: ${subject}\nBody preview: ${body.slice(0, 300)}`;
}

async function handleGoogleListCalendarEvents(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const daysAhead = Math.min(Number(args.days_ahead) || 7, 30);
  try {
    const { listCalendarEvents } = await import("@/lib/integrations/google");
    const data = await listCalendarEvents(token, daysAhead);
    type CalEvent = { id: string; summary?: string; start?: Record<string, string>; end?: Record<string, string> };
    const items = (data as Record<string, unknown>).items as CalEvent[] | undefined;
    return JSON.stringify(items?.slice(0, 20) ?? [], null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleCreateCalendarEvent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const summary = String(args.summary ?? "");
  const startDateTime = String(args.start_datetime ?? "");
  const endDateTime = String(args.end_datetime ?? "");
  if (!summary || !startDateTime || !endDateTime) return "Error: summary, start_datetime, and end_datetime are required";
  return `Calendar event creation queued for approval.\nTitle: ${summary}\nStart: ${startDateTime}\nEnd: ${endDateTime}`;
}

async function handleGoogleListDriveFiles(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  try {
    const { listDriveFiles } = await import("@/lib/integrations/google");
    const data = await listDriveFiles(token, args.query ? String(args.query) : undefined);
    type DriveFile = { id: string; name: string; mimeType: string; modifiedTime?: string; size?: string };
    const files = (data as Record<string, unknown>).files as DriveFile[] | undefined;
    return JSON.stringify(files?.slice(0, 20) ?? [], null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleReadDriveFile(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const fileId = String(args.file_id ?? "");
  if (!fileId) return "Error: file_id is required";
  try {
    const { getDriveFile } = await import("@/lib/integrations/google");
    const result = await getDriveFile(token, fileId, args.mime_type ? String(args.mime_type) : undefined);
    return result.content.slice(0, 8000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// -- Linear --

async function handleLinearListIssues(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear");
  if (!token) return integrationNotConnected("linear");
  try {
    const { listIssues } = await import("@/lib/integrations/linear");
    const data = await listIssues(
      token,
      args.team_id ? String(args.team_id) : undefined,
      Math.min(Number(args.first) || 20, 50),
    );
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleLinearCreateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const teamId = String(args.team_id ?? "");
  const title = String(args.title ?? "");
  if (!teamId || !title) return "Error: team_id and title are required";
  return `Linear issue creation queued for approval.\nTeam: ${teamId}\nTitle: ${title}\nDescription: ${String(args.description ?? "").slice(0, 300)}`;
}

async function handleLinearUpdateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear");
  if (!token) return integrationNotConnected("linear");
  const issueId = String(args.issue_id ?? "");
  if (!issueId) return "Error: issue_id is required";
  try {
    const { updateIssue } = await import("@/lib/integrations/linear");
    const input = (typeof args.input === "object" && args.input !== null
      ? args.input
      : {}) as Record<string, unknown>;
    const result = await updateIssue(token, issueId, input);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Calendly ---

async function handleCalendlyListEventTypes(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "calendly");
  if (!token) return integrationNotConnected("calendly");
  try {
    const conn = await (await import("@/lib/integrations/token-store")).getConnection(ctx.userId, "calendly");
    const metadata = conn?.metadataJson ? (JSON.parse(conn.metadataJson) as Record<string, string>) : {};
    const userUri = metadata.user_uri;
    if (!userUri) return "Error: Calendly user URI not found. Try reconnecting Calendly in Settings → Integrations.";
    const { listEventTypes } = await import("@/lib/integrations/calendly");
    const data = await listEventTypes(token, userUri);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleCalendlyListScheduledEvents(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "calendly");
  if (!token) return integrationNotConnected("calendly");
  try {
    const conn = await (await import("@/lib/integrations/token-store")).getConnection(ctx.userId, "calendly");
    const metadata = conn?.metadataJson ? (JSON.parse(conn.metadataJson) as Record<string, string>) : {};
    const userUri = metadata.user_uri;
    if (!userUri) return "Error: Calendly user URI not found. Try reconnecting Calendly in Settings → Integrations.";
    const { listScheduledEvents } = await import("@/lib/integrations/calendly");
    const daysAhead = Math.min(Number(args.days_ahead) || 30, 90);
    const status = args.status === "canceled" ? "canceled" : "active";
    const data = await listScheduledEvents(token, userUri, status, daysAhead);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleCalendlyGetEventInvitees(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "calendly");
  if (!token) return integrationNotConnected("calendly");
  const eventUuid = String(args.event_uuid ?? "");
  if (!eventUuid) return "Error: event_uuid is required";
  try {
    const { getEventInvitees } = await import("@/lib/integrations/calendly");
    const data = await getEventInvitees(token, eventUuid);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleCalendlyCreateSchedulingLink(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "calendly");
  if (!token) return integrationNotConnected("calendly");
  const eventTypeUri = String(args.event_type_uri ?? "");
  if (!eventTypeUri) return "Error: event_type_uri is required";
  try {
    const { createSchedulingLink } = await import("@/lib/integrations/calendly");
    const maxEventCount = Math.min(Number(args.max_event_count) || 1, 10);
    const data = await createSchedulingLink(token, eventTypeUri, maxEventCount);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
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
  figma_get_design: handleFigmaGetDesign,
  figma_get_image: handleFigmaGetImage,
  web_search: handleWebSearch,
  extract_content: handleExtractContent,
  quality_review: handleQualityReview,
  // HubSpot
  hubspot_search_contacts: handleHubspotSearchContacts,
  hubspot_create_contact: handleHubspotCreateContact,
  hubspot_update_contact: handleHubspotUpdateContact,
  hubspot_list_deals: handleHubspotListDeals,
  hubspot_create_note: handleHubspotCreateNote,
  // Slack
  slack_list_channels: handleSlackListChannels,
  slack_post_message: handleSlackPostMessage,
  // Google
  google_list_emails: handleGoogleListEmails,
  google_send_email: handleGoogleSendEmail,
  google_list_calendar_events: handleGoogleListCalendarEvents,
  google_create_calendar_event: handleGoogleCreateCalendarEvent,
  google_list_drive_files: handleGoogleListDriveFiles,
  google_read_drive_file: handleGoogleReadDriveFile,
  // Linear
  linear_list_issues: handleLinearListIssues,
  linear_create_issue: handleLinearCreateIssue,
  linear_update_issue: handleLinearUpdateIssue,
  // Calendly
  calendly_list_event_types: handleCalendlyListEventTypes,
  calendly_list_scheduled_events: handleCalendlyListScheduledEvents,
  calendly_get_event_invitees: handleCalendlyGetEventInvitees,
  calendly_create_scheduling_link: handleCalendlyCreateSchedulingLink,
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
