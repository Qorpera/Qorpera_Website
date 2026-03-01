import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getOrCreateSession, extractPageState } from "@/lib/browser-session";
import { prisma } from "@/lib/db";
import { extractTextFromBuffer } from "@/lib/text-extraction";
import { listBusinessFiles, getFileBuffer } from "@/lib/business-files-store";
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
      const bytes = await getFileBuffer(file.storagePath);
      const extracted = await extractTextFromBuffer(file.name, bytes);
      if (extracted) return extracted.slice(0, 8000);
    } catch {
      // fall through to generic read
    }
  }

  try {
    const bytes = await getFileBuffer(file.storagePath);
    return bytes.toString("utf8").slice(0, 8000);
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

// --- Browser automation handlers ---

async function handleBrowserNavigate(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const url = String(args.url ?? "").trim();
  if (!url) return "Error: url is required";

  try {
    const page = await getOrCreateSession(ctx.delegatedTaskId || ctx.userId);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(500);
    const state = await extractPageState(page);
    return JSON.stringify(state);
  } catch (e: unknown) {
    return `Error: browser_navigate failed - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleBrowserGetContent(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const format = String(args.format ?? "text");

  try {
    const page = await getOrCreateSession(ctx.delegatedTaskId || ctx.userId);
    const state = await extractPageState(page);

    if (format === "links") return JSON.stringify({ url: state.url, title: state.title, links: state.links });
    if (format === "inputs") return JSON.stringify({ url: state.url, title: state.title, inputs: state.inputs });
    if (format === "full") return JSON.stringify(state);
    // default: "text"
    return JSON.stringify({ url: state.url, title: state.title, text: state.text });
  } catch (e: unknown) {
    return `Error: browser_get_content failed - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleBrowserScreenshot(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  try {
    const page = await getOrCreateSession(ctx.delegatedTaskId || ctx.userId);
    const dir = path.join(process.cwd(), ".data", "screenshots");
    await mkdir(dir, { recursive: true });
    const filename = `${(ctx.delegatedTaskId || ctx.userId).slice(0, 16)}-${Date.now()}.png`;
    await page.screenshot({ path: path.join(dir, filename), fullPage: false });
    const state = await extractPageState(page);
    return JSON.stringify({ screenshot_saved: filename, ...state });
  } catch (e: unknown) {
    return `Error: browser_screenshot failed - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleBrowserClick(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const selector = typeof args.selector === "string" ? args.selector.trim() : "";
  const text = typeof args.text === "string" ? args.text.trim() : "";

  if (!selector && !text) return "Error: either text or selector is required";

  try {
    const page = await getOrCreateSession(ctx.delegatedTaskId || ctx.userId);

    if (selector) {
      await page.locator(selector).first().click({ timeout: 10_000 });
    } else {
      await page.getByText(text, { exact: false }).first().click({ timeout: 10_000 });
    }

    // Wait for navigation/load after click, but don't throw if it times out
    await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});

    const state = await extractPageState(page);
    return JSON.stringify(state);
  } catch (e: unknown) {
    return `Error: browser_click failed - ${e instanceof Error ? e.message : "unknown error"}`;
  }
}

async function handleBrowserType(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const selector = typeof args.selector === "string" ? args.selector.trim() : "";
  const text = String(args.text ?? "");
  const submit = args.submit === true;

  if (!text) return "Error: text is required";

  try {
    const page = await getOrCreateSession(ctx.delegatedTaskId || ctx.userId);
    const locator = page.locator(selector || "input:visible, textarea:visible").first();
    await locator.fill(text, { timeout: 10_000 });

    if (submit) {
      await locator.press("Enter");
      await page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
    }

    const state = await extractPageState(page);
    return JSON.stringify(state);
  } catch (e: unknown) {
    return `Error: browser_type failed - ${e instanceof Error ? e.message : "unknown error"}`;
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
    jira: "Jira",
    notion: "Notion",
    github: "GitHub",
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
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? "");
  const text = String(args.text ?? "");
  if (!channel || !text) return "Error: channel and text are required";
  try {
    const { postMessage } = await import("@/lib/integrations/slack");
    await postMessage(token, channel, text);
    return `Message sent to ${channel}.`;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
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

async function handleGoogleReadEmail(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const messageId = String(args.message_id ?? "");
  if (!messageId) return "Error: message_id is required";
  try {
    const { readEmail } = await import("@/lib/integrations/google");
    const result = await readEmail(token, messageId);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleSendEmail(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const to = String(args.to ?? "");
  const subject = String(args.subject ?? "");
  const body = String(args.body ?? "");
  if (!to || !subject || !body) return "Error: to, subject, and body are required";
  const threadId = args.thread_id ? String(args.thread_id) : undefined;
  const inReplyTo = args.in_reply_to ? String(args.in_reply_to) : undefined;
  try {
    const { sendEmail } = await import("@/lib/integrations/google");
    await sendEmail(token, to, subject, body, threadId, inReplyTo);
    return `Email sent to ${to}: "${subject}"`;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
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
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const summary = String(args.summary ?? "");
  const startDateTime = String(args.start_datetime ?? "");
  const endDateTime = String(args.end_datetime ?? "");
  if (!summary || !startDateTime || !endDateTime) return "Error: summary, start_datetime, and end_datetime are required";
  try {
    const { createCalendarEvent } = await import("@/lib/integrations/google");
    const attendees = Array.isArray(args.attendees) ? (args.attendees as string[]) : undefined;
    const result = await createCalendarEvent(token, summary, startDateTime, endDateTime, args.description ? String(args.description) : undefined, attendees);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
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
  const token = await getIntegrationToken(ctx.userId, "linear");
  if (!token) return integrationNotConnected("linear");
  const teamId = String(args.team_id ?? "");
  const title = String(args.title ?? "");
  if (!teamId || !title) return "Error: team_id and title are required";
  try {
    const { createIssue } = await import("@/lib/integrations/linear");
    const result = await createIssue(
      token,
      teamId,
      title,
      args.description ? String(args.description) : undefined,
      args.priority != null ? Number(args.priority) : undefined,
      args.assignee_id ? String(args.assignee_id) : undefined,
    );
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
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

// -- QuickBooks --

async function getQbContext(userId: string): Promise<{ token: string; realmId: string } | null> {
  const token = await getIntegrationToken(userId, "quickbooks");
  if (!token) return null;
  const conn = await (await import("@/lib/integrations/token-store")).getConnection(userId, "quickbooks");
  const meta = conn?.metadataJson ? (JSON.parse(conn.metadataJson) as Record<string, string>) : {};
  const realmId = meta.realm_id ?? "";
  if (!realmId) return null;
  return { token, realmId };
}

async function handleQuickbooksGetProfitLoss(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const qb = await getQbContext(ctx.userId);
  if (!qb) return integrationNotConnected("quickbooks");
  const today = new Date().toISOString().slice(0, 10);
  const startDate = args.start_date ? String(args.start_date) : `${today.slice(0, 4)}-01-01`;
  const endDate = args.end_date ? String(args.end_date) : today;
  try {
    const { getProfitAndLoss } = await import("@/lib/integrations/quickbooks");
    const result = await getProfitAndLoss(qb.token, qb.realmId, startDate, endDate);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleQuickbooksGetBalanceSheet(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const qb = await getQbContext(ctx.userId);
  if (!qb) return integrationNotConnected("quickbooks");
  try {
    const { getBalanceSheet } = await import("@/lib/integrations/quickbooks");
    const result = await getBalanceSheet(qb.token, qb.realmId, args.date ? String(args.date) : undefined);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleQuickbooksGetCashFlow(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const qb = await getQbContext(ctx.userId);
  if (!qb) return integrationNotConnected("quickbooks");
  const today = new Date().toISOString().slice(0, 10);
  const startDate = args.start_date ? String(args.start_date) : `${today.slice(0, 4)}-01-01`;
  const endDate = args.end_date ? String(args.end_date) : today;
  try {
    const { getCashFlow } = await import("@/lib/integrations/quickbooks");
    const result = await getCashFlow(qb.token, qb.realmId, startDate, endDate);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleQuickbooksListInvoices(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const qb = await getQbContext(ctx.userId);
  if (!qb) return integrationNotConnected("quickbooks");
  const maxResults = Math.min(Number(args.max_results) || 20, 50);
  try {
    const { listInvoices } = await import("@/lib/integrations/quickbooks");
    const result = await listInvoices(qb.token, qb.realmId, maxResults);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// -- Xero --

async function getXeroContext(userId: string): Promise<{ token: string; tenantId: string } | null> {
  const token = await getIntegrationToken(userId, "xero");
  if (!token) return null;
  const conn = await (await import("@/lib/integrations/token-store")).getConnection(userId, "xero");
  const meta = conn?.metadataJson ? (JSON.parse(conn.metadataJson) as Record<string, string>) : {};
  const tenantId = meta.tenant_id ?? "";
  if (!tenantId) return null;
  return { token, tenantId };
}

async function handleXeroGetProfitLoss(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const xero = await getXeroContext(ctx.userId);
  if (!xero) return integrationNotConnected("xero");
  try {
    const { getProfitAndLoss } = await import("@/lib/integrations/xero");
    const result = await getProfitAndLoss(
      xero.token,
      xero.tenantId,
      args.from_date ? String(args.from_date) : undefined,
      args.to_date ? String(args.to_date) : undefined,
    );
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleXeroGetBalanceSheet(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const xero = await getXeroContext(ctx.userId);
  if (!xero) return integrationNotConnected("xero");
  try {
    const { getBalanceSheet } = await import("@/lib/integrations/xero");
    const result = await getBalanceSheet(xero.token, xero.tenantId, args.date ? String(args.date) : undefined);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleXeroGetTrialBalance(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const xero = await getXeroContext(ctx.userId);
  if (!xero) return integrationNotConnected("xero");
  try {
    const { getTrialBalance } = await import("@/lib/integrations/xero");
    const result = await getTrialBalance(xero.token, xero.tenantId, args.date ? String(args.date) : undefined);
    return JSON.stringify(result, null, 2).slice(0, 12000);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleXeroListInvoices(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const xero = await getXeroContext(ctx.userId);
  if (!xero) return integrationNotConnected("xero");
  const type = args.type === "ACCPAY" ? "ACCPAY" : "ACCREC";
  try {
    const { listInvoices } = await import("@/lib/integrations/xero");
    const result = await listInvoices(xero.token, xero.tenantId, type);
    return JSON.stringify(result, null, 2).slice(0, 12000);
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

// --- GitHub ---

async function handleGithubListRepos(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github");
  if (!token) return integrationNotConnected("github");
  try {
    const { listRepos } = await import("@/lib/integrations/github");
    const limit = Math.min(Number(args.limit) || 20, 50);
    const repos = await listRepos(token, limit);
    return JSON.stringify(repos.map((r) => ({
      fullName: r.full_name, description: r.description, private: r.private,
      language: r.language, openIssues: r.open_issues_count, defaultBranch: r.default_branch,
    })), null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGithubListIssues(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github");
  if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? "");
  if (!repo) return "Error: repo is required (format: owner/repo)";
  const state = (args.state === "closed" || args.state === "all") ? args.state : "open";
  try {
    const { listIssues } = await import("@/lib/integrations/github");
    const limit = Math.min(Number(args.limit) || 20, 50);
    const issues = await listIssues(token, repo, state, limit);
    return JSON.stringify(issues.map((i) => ({
      number: i.number, title: i.title, state: i.state,
      labels: i.labels.map((l) => l.name),
      assignees: i.assignees.map((a) => a.login),
      createdAt: i.created_at, updatedAt: i.updated_at,
      body: i.body?.slice(0, 400),
    })), null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGithubCreateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github");
  if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? "");
  const title = String(args.title ?? "");
  if (!repo || !title) return "Error: repo and title are required";
  try {
    const { createIssue } = await import("@/lib/integrations/github");
    const labels = Array.isArray(args.labels) ? (args.labels as string[]) : undefined;
    const assignees = Array.isArray(args.assignees) ? (args.assignees as string[]) : undefined;
    const issue = await createIssue(token, repo, {
      title, body: args.body ? String(args.body) : undefined, labels, assignees,
    });
    return JSON.stringify({ number: issue.number, title: issue.title, url: issue.html_url }, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGithubListPRs(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github");
  if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? "");
  if (!repo) return "Error: repo is required (format: owner/repo)";
  const state = (args.state === "closed" || args.state === "all") ? args.state : "open";
  try {
    const { listPullRequests } = await import("@/lib/integrations/github");
    const limit = Math.min(Number(args.limit) || 20, 50);
    const prs = await listPullRequests(token, repo, state, limit);
    return JSON.stringify(prs.map((p) => ({
      number: p.number, title: p.title, state: p.state,
      author: p.user.login, head: p.head.ref, base: p.base.ref,
      createdAt: p.created_at, updatedAt: p.updated_at,
    })), null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Notion ---

async function handleNotionSearch(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion");
  if (!token) return integrationNotConnected("notion");
  const query = String(args.query ?? "");
  try {
    const { searchPages } = await import("@/lib/integrations/notion");
    const limit = Math.min(Number(args.limit) || 10, 20);
    const pages = await searchPages(token, query, limit);
    return JSON.stringify(pages, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleNotionReadPage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion");
  if (!token) return integrationNotConnected("notion");
  const pageId = String(args.page_id ?? "");
  if (!pageId) return "Error: page_id is required";
  try {
    const { readPage } = await import("@/lib/integrations/notion");
    const page = await readPage(token, pageId);
    return JSON.stringify(page, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleNotionCreatePage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion");
  if (!token) return integrationNotConnected("notion");
  const title = String(args.title ?? "");
  if (!title) return "Error: title is required";
  try {
    const { createPage } = await import("@/lib/integrations/notion");
    const result = await createPage(token, {
      parentPageId: args.parent_page_id ? String(args.parent_page_id) : undefined,
      parentDatabaseId: args.parent_database_id ? String(args.parent_database_id) : undefined,
      title,
      content: args.content ? String(args.content) : undefined,
    });
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleNotionAppendBlock(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion");
  if (!token) return integrationNotConnected("notion");
  const pageId = String(args.page_id ?? "");
  const content = String(args.content ?? "");
  if (!pageId || !content) return "Error: page_id and content are required";
  try {
    const { appendBlocks } = await import("@/lib/integrations/notion");
    const result = await appendBlocks(token, pageId, content);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Stripe Finance ---

async function handleStripeGetRevenue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { getRevenueOverview } = await import("@/lib/integrations/stripe-finance");
    const data = await getRevenueOverview(apiKey);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListCustomers(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listCustomers } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const customers = await listCustomers(apiKey, limit);
    return JSON.stringify(customers, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListSubscriptions(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listSubscriptions } = await import("@/lib/integrations/stripe-finance");
    const status = args.status === "all" ? "all" : "active";
    const limit = Math.min(Number(args.limit) || 20, 100);
    const subs = await listSubscriptions(apiKey, status, limit);
    return JSON.stringify(subs, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListInvoices(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listInvoices } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const invoices = await listInvoices(apiKey, limit);
    return JSON.stringify(invoices, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeGetCustomer(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  const customerId = String(args.customer_id ?? "");
  if (!customerId) return "Error: customer_id is required";
  try {
    const { getCustomer } = await import("@/lib/integrations/stripe-finance");
    const data = await getCustomer(apiKey, customerId);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeCreateCustomer(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { createCustomer } = await import("@/lib/integrations/stripe-finance");
    const data = await createCustomer(apiKey, {
      email: args.email ? String(args.email) : undefined,
      name: args.name ? String(args.name) : undefined,
      description: args.description ? String(args.description) : undefined,
    });
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeGetInvoice(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  const invoiceId = String(args.invoice_id ?? "");
  if (!invoiceId) return "Error: invoice_id is required";
  try {
    const { getInvoice } = await import("@/lib/integrations/stripe-finance");
    const data = await getInvoice(apiKey, invoiceId);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeCreateInvoice(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  const customerId = String(args.customer_id ?? "");
  if (!customerId) return "Error: customer_id is required";
  try {
    const { createInvoice } = await import("@/lib/integrations/stripe-finance");
    const data = await createInvoice(apiKey, customerId, args.description ? String(args.description) : undefined);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeGetSubscription(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  const subscriptionId = String(args.subscription_id ?? "");
  if (!subscriptionId) return "Error: subscription_id is required";
  try {
    const { getSubscription } = await import("@/lib/integrations/stripe-finance");
    const data = await getSubscription(apiKey, subscriptionId);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListCharges(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listCharges } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const data = await listCharges(apiKey, limit);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeGetBalanceTransactions(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { getBalanceTransactions } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const data = await getBalanceTransactions(apiKey, limit);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListProducts(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listProducts } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const data = await listProducts(apiKey, limit);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleStripeListPrices(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const apiKey = await getCachedSkillEnvVar(ctx.userId, "STRIPE_SECRET_KEY");
  if (!apiKey) return "Error: STRIPE_SECRET_KEY not configured. Add it in Settings → Skills.";
  try {
    const { listPrices } = await import("@/lib/integrations/stripe-finance");
    const limit = Math.min(Number(args.limit) || 20, 100);
    const data = await listPrices(apiKey, limit);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Expanded HubSpot ---

async function handleHubspotCreateDeal(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const properties = (typeof args.properties === "object" && args.properties !== null ? args.properties : {}) as Record<string, string>;
    const { createDeal } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await createDeal(token, properties), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotUpdateDeal(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const dealId = String(args.deal_id ?? "");
  if (!dealId) return "Error: deal_id is required";
  try {
    const properties = (typeof args.properties === "object" && args.properties !== null ? args.properties : {}) as Record<string, string>;
    const { updateDeal } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await updateDeal(token, dealId, properties), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotGetDeal(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const dealId = String(args.deal_id ?? "");
  if (!dealId) return "Error: deal_id is required";
  try {
    const { getDeal } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await getDeal(token, dealId), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotListPipelineStages(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const { listPipelineStages } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await listPipelineStages(token, args.pipeline_id ? String(args.pipeline_id) : "default"), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotCreateCompany(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const properties = (typeof args.properties === "object" && args.properties !== null ? args.properties : {}) as Record<string, string>;
    const { createCompany } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await createCompany(token, properties), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotSearchCompanies(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const { searchCompanies } = await import("@/lib/integrations/hubspot");
    const data = await searchCompanies(token, String(args.query ?? ""));
    const results = (data as Record<string, unknown>).results as unknown[] | undefined;
    return JSON.stringify(results?.slice(0, 20) ?? [], null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotListActivities(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const contactId = String(args.contact_id ?? "");
  if (!contactId) return "Error: contact_id is required";
  try {
    const { listActivities } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await listActivities(token, contactId), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotCreateEngagement(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const contactId = String(args.contact_id ?? "");
  const type = String(args.type ?? "NOTE").toUpperCase() as "NOTE" | "EMAIL" | "CALL" | "MEETING" | "TASK";
  const body = String(args.body ?? "");
  if (!contactId || !body) return "Error: contact_id and body are required";
  try {
    const { createEngagement } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await createEngagement(token, type, contactId, body), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotListContactLists(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args;
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  try {
    const { listContactLists } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await listContactLists(token), null, 2);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleHubspotGetCustomProperties(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "hubspot");
  if (!token) return integrationNotConnected("hubspot");
  const objectType = (args.object_type === "deals" || args.object_type === "companies") ? args.object_type : "contacts";
  try {
    const { getCustomProperties } = await import("@/lib/integrations/hubspot");
    return JSON.stringify(await getCustomProperties(token, objectType as "contacts" | "deals" | "companies"), null, 2).slice(0, 8000);
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Expanded Slack ---

async function handleSlackAddReaction(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? ""), timestamp = String(args.timestamp ?? ""), name = String(args.name ?? "");
  if (!channel || !timestamp || !name) return "Error: channel, timestamp, and name are required";
  try { const { addReaction } = await import("@/lib/integrations/slack"); await addReaction(token, channel, timestamp, name); return `Reaction :${name}: added.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackReplyToThread(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? ""), threadTs = String(args.thread_ts ?? ""), text = String(args.text ?? "");
  if (!channel || !threadTs || !text) return "Error: channel, thread_ts, and text are required";
  try { const { replyToThread } = await import("@/lib/integrations/slack"); await replyToThread(token, channel, threadTs, text); return `Reply sent to thread in ${channel}.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackCreateChannel(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const name = String(args.name ?? "");
  if (!name) return "Error: name is required";
  try { const { createChannel } = await import("@/lib/integrations/slack"); const data = await createChannel(token, name, args.is_private === true);
    const ch = (data as Record<string, unknown>).channel as { id?: string; name?: string } | undefined;
    return JSON.stringify({ id: ch?.id, name: ch?.name }, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackInviteToChannel(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? ""), userId = String(args.user_id ?? "");
  if (!channel || !userId) return "Error: channel and user_id are required";
  try { const { inviteToChannel } = await import("@/lib/integrations/slack"); await inviteToChannel(token, channel, userId); return `User invited to ${channel}.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackLookupUser(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const email = String(args.email ?? "");
  if (!email) return "Error: email is required";
  try { const { lookupUser } = await import("@/lib/integrations/slack"); const data = await lookupUser(token, email);
    return JSON.stringify((data as Record<string, unknown>).user ?? {}, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackListUsers(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args;
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  try { const { listUsers } = await import("@/lib/integrations/slack"); const data = await listUsers(token);
    type SlackUser = { id: string; name: string; real_name?: string; is_bot?: boolean };
    const members = (data as Record<string, unknown>).members as SlackUser[] | undefined;
    return JSON.stringify(members?.filter((m) => !m.is_bot).slice(0, 50).map((m) => ({ id: m.id, name: m.name, realName: m.real_name })) ?? [], null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackScheduleMessage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? ""), text = String(args.text ?? ""), postAt = Number(args.post_at ?? 0);
  if (!channel || !text || !postAt) return "Error: channel, text, and post_at (Unix timestamp) are required";
  try { const { scheduleMessage } = await import("@/lib/integrations/slack"); return JSON.stringify(await scheduleMessage(token, channel, text, postAt), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleSlackSetChannelTopic(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "slack");
  if (!token) return integrationNotConnected("slack");
  const channel = String(args.channel ?? ""), topic = String(args.topic ?? "");
  if (!channel || !topic) return "Error: channel and topic are required";
  try { const { setChannelTopic } = await import("@/lib/integrations/slack"); await setChannelTopic(token, channel, topic); return `Channel topic updated.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Expanded Linear ---

async function handleLinearListProjects(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args; const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  try { const { listProjects } = await import("@/lib/integrations/linear"); return JSON.stringify(await listProjects(token), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearCreateProject(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  const teamIds = Array.isArray(args.team_ids) ? (args.team_ids as string[]) : [String(args.team_id ?? "")];
  const name = String(args.name ?? "");
  if (!name || !teamIds[0]) return "Error: name and team_ids are required";
  try { const { createProject } = await import("@/lib/integrations/linear"); return JSON.stringify(await createProject(token, teamIds, name, args.description ? String(args.description) : undefined), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearListLabels(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args; const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  try { const { listLabels } = await import("@/lib/integrations/linear"); return JSON.stringify(await listLabels(token), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearCreateComment(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  const issueId = String(args.issue_id ?? ""), body = String(args.body ?? "");
  if (!issueId || !body) return "Error: issue_id and body are required";
  try { const { createComment } = await import("@/lib/integrations/linear"); return JSON.stringify(await createComment(token, issueId, body), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearListCycles(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  const teamId = String(args.team_id ?? "");
  if (!teamId) return "Error: team_id is required";
  try { const { listCycles } = await import("@/lib/integrations/linear"); return JSON.stringify(await listCycles(token, teamId), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearGetRoadmap(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args; const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  try { const { getRoadmap } = await import("@/lib/integrations/linear"); return JSON.stringify(await getRoadmap(token), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearUpdateProject(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  const projectId = String(args.project_id ?? ""); if (!projectId) return "Error: project_id is required";
  try { const input = (typeof args.input === "object" && args.input !== null ? args.input : {}) as Record<string, unknown>;
    const { updateProject } = await import("@/lib/integrations/linear"); return JSON.stringify(await updateProject(token, projectId, input), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleLinearGetIssueHistory(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "linear"); if (!token) return integrationNotConnected("linear");
  const issueId = String(args.issue_id ?? ""); if (!issueId) return "Error: issue_id is required";
  try { const { getIssueHistory } = await import("@/lib/integrations/linear"); return JSON.stringify(await getIssueHistory(token, issueId), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Expanded Notion ---

async function handleNotionQueryDatabase(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion"); if (!token) return integrationNotConnected("notion");
  const databaseId = String(args.database_id ?? ""); if (!databaseId) return "Error: database_id is required";
  try { const { queryDatabase } = await import("@/lib/integrations/notion");
    const filter = (typeof args.filter === "object" && args.filter !== null) ? args.filter as Record<string, unknown> : undefined;
    return JSON.stringify(await queryDatabase(token, databaseId, filter, undefined, Number(args.limit) || 20), null, 2).slice(0, 12000); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleNotionCreateDatabaseEntry(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion"); if (!token) return integrationNotConnected("notion");
  const databaseId = String(args.database_id ?? ""); if (!databaseId) return "Error: database_id is required";
  try { const properties = (typeof args.properties === "object" && args.properties !== null ? args.properties : {}) as Record<string, unknown>;
    const { createDatabaseEntry } = await import("@/lib/integrations/notion"); return JSON.stringify(await createDatabaseEntry(token, databaseId, properties), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleNotionUpdatePage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion"); if (!token) return integrationNotConnected("notion");
  const pageId = String(args.page_id ?? ""); if (!pageId) return "Error: page_id is required";
  try { const properties = (typeof args.properties === "object" && args.properties !== null ? args.properties : {}) as Record<string, unknown>;
    const { updatePage } = await import("@/lib/integrations/notion"); return JSON.stringify(await updatePage(token, pageId, properties), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleNotionDeletePage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "notion"); if (!token) return integrationNotConnected("notion");
  const pageId = String(args.page_id ?? ""); if (!pageId) return "Error: page_id is required";
  try { const { deletePage } = await import("@/lib/integrations/notion"); await deletePage(token, pageId); return `Page ${pageId} archived.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleNotionListDatabases(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args; const token = await getIntegrationToken(ctx.userId, "notion"); if (!token) return integrationNotConnected("notion");
  try { const { listDatabases } = await import("@/lib/integrations/notion"); return JSON.stringify(await listDatabases(token), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Expanded GitHub ---

async function handleGithubCreatePR(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), title = String(args.title ?? ""), head = String(args.head ?? ""), base = String(args.base || "main");
  if (!repo || !title || !head) return "Error: repo, title, and head are required";
  try { const { createPullRequest } = await import("@/lib/integrations/github");
    const pr = await createPullRequest(token, repo, { title, head, base, body: args.body ? String(args.body) : undefined, draft: args.draft === true });
    return JSON.stringify({ number: pr.number, title: pr.title, url: pr.html_url }, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubMergePR(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), pullNumber = Number(args.pull_number ?? 0);
  if (!repo || !pullNumber) return "Error: repo and pull_number are required";
  try { const mergeMethod = (args.merge_method === "squash" || args.merge_method === "rebase") ? args.merge_method : "merge";
    const { mergePullRequest } = await import("@/lib/integrations/github"); await mergePullRequest(token, repo, pullNumber, mergeMethod); return `PR #${pullNumber} merged.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubListWorkflowRuns(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""); if (!repo) return "Error: repo is required";
  try { const { listWorkflowRuns } = await import("@/lib/integrations/github");
    const data = await listWorkflowRuns(token, repo, Math.min(Number(args.limit) || 10, 20));
    return JSON.stringify(data.workflow_runs.map((r) => ({ id: r.id, name: r.name, status: r.status, conclusion: r.conclusion, createdAt: r.created_at })), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubTriggerWorkflow(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), workflowId = String(args.workflow_id ?? ""), ref = String(args.ref ?? "main");
  if (!repo || !workflowId) return "Error: repo and workflow_id are required";
  try { const inputs = (typeof args.inputs === "object" && args.inputs !== null ? args.inputs : undefined) as Record<string, string> | undefined;
    const { triggerWorkflow } = await import("@/lib/integrations/github"); await triggerWorkflow(token, repo, workflowId, ref, inputs); return `Workflow ${workflowId} triggered on ${ref}.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubAddLabel(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), issueNumber = Number(args.issue_number ?? 0);
  const labels = Array.isArray(args.labels) ? (args.labels as string[]) : [];
  if (!repo || !issueNumber || !labels.length) return "Error: repo, issue_number, and labels are required";
  try { const { addLabel } = await import("@/lib/integrations/github"); await addLabel(token, repo, issueNumber, labels); return `Labels added to #${issueNumber}: ${labels.join(", ")}`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubUpdateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), issueNumber = Number(args.issue_number ?? 0);
  if (!repo || !issueNumber) return "Error: repo and issue_number are required";
  try { const data: Record<string, unknown> = {};
    if (args.title) data.title = String(args.title); if (args.body) data.body = String(args.body); if (args.state) data.state = String(args.state);
    const { updateIssue } = await import("@/lib/integrations/github"); await updateIssue(token, repo, issueNumber, data as Parameters<typeof updateIssue>[3]); return `Issue #${issueNumber} updated.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubCreateComment(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), issueNumber = Number(args.issue_number ?? 0), body = String(args.body ?? "");
  if (!repo || !issueNumber || !body) return "Error: repo, issue_number, and body are required";
  try { const { createComment } = await import("@/lib/integrations/github"); const result = await createComment(token, repo, issueNumber, body);
    return JSON.stringify({ id: result.id, url: result.html_url }, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubListBranches(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""); if (!repo) return "Error: repo is required";
  try { const { listBranches } = await import("@/lib/integrations/github"); const branches = await listBranches(token, repo);
    return JSON.stringify(branches.map((b) => ({ name: b.name, protected: b.protected, sha: b.commit.sha })), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubGetCommit(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), ref = String(args.ref ?? "");
  if (!repo || !ref) return "Error: repo and ref are required";
  try { const { getCommit } = await import("@/lib/integrations/github"); const c = await getCommit(token, repo, ref);
    return JSON.stringify({ sha: c.sha, message: c.commit.message, author: c.commit.author.name, date: c.commit.author.date, stats: c.stats }, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleGithubCompareCommits(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "github"); if (!token) return integrationNotConnected("github");
  const repo = String(args.repo ?? ""), base = String(args.base ?? ""), head = String(args.head ?? "");
  if (!repo || !base || !head) return "Error: repo, base, and head are required";
  try { const { compareCommits } = await import("@/lib/integrations/github"); const data = await compareCommits(token, repo, base, head);
    return JSON.stringify({ status: data.status, aheadBy: data.ahead_by, behindBy: data.behind_by, totalCommits: data.total_commits,
      commits: data.commits.slice(0, 20).map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message })),
      files: data.files.slice(0, 30).map((f) => ({ file: f.filename, status: f.status, additions: f.additions, deletions: f.deletions })) }, null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Jira ---

async function getJiraContext(userId: string): Promise<{ token: string; cloudId: string } | null> {
  const token = await getIntegrationToken(userId, "jira");
  if (!token) return null;
  const conn = await (await import("@/lib/integrations/token-store")).getConnection(userId, "jira");
  const meta = conn?.metadataJson ? (JSON.parse(conn.metadataJson) as Record<string, string>) : {};
  if (!meta.cloud_id) return null;
  return { token, cloudId: meta.cloud_id };
}

async function handleJiraListProjects(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  void args; const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  try { const { listProjects } = await import("@/lib/integrations/jira"); return JSON.stringify(await listProjects(jira.token, jira.cloudId), null, 2).slice(0, 8000); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraListIssues(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  try { const { listIssues } = await import("@/lib/integrations/jira");
    return JSON.stringify(await listIssues(jira.token, jira.cloudId, String(args.jql ?? "order by updated DESC"), Number(args.limit) || 20), null, 2).slice(0, 8000); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraGetIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""); if (!key) return "Error: issue_key is required";
  try { const { getIssue } = await import("@/lib/integrations/jira"); return JSON.stringify(await getIssue(jira.token, jira.cloudId, key), null, 2).slice(0, 8000); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraCreateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const projectKey = String(args.project_key ?? ""), summary = String(args.summary ?? ""), issueType = String(args.issue_type ?? "Task");
  if (!projectKey || !summary) return "Error: project_key and summary are required";
  try { const { createIssue } = await import("@/lib/integrations/jira");
    return JSON.stringify(await createIssue(jira.token, jira.cloudId, projectKey, summary, issueType, args.description ? String(args.description) : undefined), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraUpdateIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""); if (!key) return "Error: issue_key is required";
  try { const fields = (typeof args.fields === "object" && args.fields !== null ? args.fields : {}) as Record<string, unknown>;
    const { updateIssue } = await import("@/lib/integrations/jira"); await updateIssue(jira.token, jira.cloudId, key, fields); return `Issue ${key} updated.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraAddComment(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""), body = String(args.body ?? "");
  if (!key || !body) return "Error: issue_key and body are required";
  try { const { addComment } = await import("@/lib/integrations/jira"); return JSON.stringify(await addComment(jira.token, jira.cloudId, key, body), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraTransitionIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""), transitionId = String(args.transition_id ?? "");
  if (!key || !transitionId) return "Error: issue_key and transition_id are required";
  try { const { transitionIssue } = await import("@/lib/integrations/jira"); await transitionIssue(jira.token, jira.cloudId, key, transitionId); return `Issue ${key} transitioned.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraListTransitions(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""); if (!key) return "Error: issue_key is required";
  try { const { listTransitions } = await import("@/lib/integrations/jira"); return JSON.stringify(await listTransitions(jira.token, jira.cloudId, key), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraAssignIssue(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const key = String(args.issue_key ?? ""), accountId = String(args.account_id ?? "");
  if (!key || !accountId) return "Error: issue_key and account_id are required";
  try { const { assignIssue } = await import("@/lib/integrations/jira"); await assignIssue(jira.token, jira.cloudId, key, accountId); return `Issue ${key} assigned.`; }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleJiraSearchUsers(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const jira = await getJiraContext(ctx.userId); if (!jira) return integrationNotConnected("jira");
  const query = String(args.query ?? ""); if (!query) return "Error: query is required";
  try { const { searchUsers } = await import("@/lib/integrations/jira"); return JSON.stringify(await searchUsers(jira.token, jira.cloudId, query), null, 2); }
  catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Google Docs / Sheets write ---

async function handleGoogleCreateDoc(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const title = String(args.title ?? "");
  if (!title) return "Error: title is required";
  try {
    const { createGoogleDoc } = await import("@/lib/integrations/google");
    const result = await createGoogleDoc(token, title, args.content ? String(args.content) : undefined);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleAppendDoc(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const documentId = String(args.document_id ?? "");
  const content = String(args.content ?? "");
  if (!documentId || !content) return "Error: document_id and content are required";
  try {
    const { appendToGoogleDoc } = await import("@/lib/integrations/google");
    const result = await appendToGoogleDoc(token, documentId, content);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleCreateSheet(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const title = String(args.title ?? "");
  if (!title) return "Error: title is required";
  const headers = Array.isArray(args.headers) ? (args.headers as string[]) : undefined;
  try {
    const { createGoogleSheet } = await import("@/lib/integrations/google");
    const result = await createGoogleSheet(token, title, headers);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

async function handleGoogleAppendSheetRows(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const token = await getIntegrationToken(ctx.userId, "google");
  if (!token) return integrationNotConnected("google");
  const spreadsheetId = String(args.spreadsheet_id ?? "");
  const sheetName = String(args.sheet_name ?? "Sheet1");
  const rows = args.rows as string[][] | undefined;
  if (!spreadsheetId || !rows?.length) return "Error: spreadsheet_id and rows are required";
  try {
    const { appendRowsToSheet } = await import("@/lib/integrations/google");
    const result = await appendRowsToSheet(token, spreadsheetId, sheetName, rows);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Agent-scheduled follow-up ---

async function handleScheduleFollowup(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const toAgent = String(args.to_agent ?? ctx.agentKind).toUpperCase();
  const title = String(args.title ?? "");
  const instructions = String(args.instructions ?? "");
  const scheduledForStr = String(args.scheduled_for ?? "");

  if (!title || !instructions) return "Error: title and instructions are required";

  let scheduledFor: Date | undefined;
  if (scheduledForStr) {
    scheduledFor = new Date(scheduledForStr);
    if (isNaN(scheduledFor.getTime())) return "Error: scheduled_for must be a valid ISO 8601 datetime";
    if (scheduledFor < new Date()) return "Error: scheduled_for must be in the future";
  } else {
    // Default to 24 hours from now
    scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  try {
    const { createDelegatedTask } = await import("@/lib/orchestration-store");
    const task = await createDelegatedTask(ctx.userId, {
      fromAgent: ctx.agentKind,
      toAgentTarget: toAgent as "ASSISTANT" | "CHIEF_ADVISOR",
      title,
      instructions,
      triggerSource: "SCHEDULED",
      scheduledFor,
      inputFromTaskId: ctx.delegatedTaskId || undefined,
    });
    return `Follow-up scheduled successfully. Task ID: ${task.id}. Scheduled for: ${scheduledFor.toISOString()}`;
  } catch (e) {
    return `Error scheduling follow-up: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- PDF generation tool ---

function wrapPdfText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function handleGeneratePdf(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const title = String(args.title ?? "").trim();
  const content = String(args.content ?? "").trim();
  const filenameArg = String(args.filename ?? "").trim();

  if (!title) return "Error: title is required";
  if (!content) return "Error: content is required";

  try {
    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 60;
    const textWidth = pageWidth - margin * 2;
    let page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Title
    const titleSize = 20;
    for (const line of wrapPdfText(title, boldFont, titleSize, textWidth)) {
      if (y - titleSize < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
      page.drawText(line, { x: margin, y: y - titleSize, size: titleSize, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= titleSize + 6;
    }
    y -= 12;

    // Horizontal rule
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 18;

    // Body
    const bodySize = 11;
    const lineH = bodySize + 5;
    for (const para of content.split("\n")) {
      if (para.trim() === "") { y -= lineH; continue; }

      const h1 = para.match(/^#\s+(.*)/);
      const h2 = para.match(/^##\s+(.*)/);
      if (h1) {
        y -= 6;
        for (const line of wrapPdfText(h1[1], boldFont, 15, textWidth)) {
          if (y - 15 < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
          page.drawText(line, { x: margin, y: y - 15, size: 15, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
          y -= 19;
        }
        y -= 4;
        continue;
      }
      if (h2) {
        y -= 4;
        for (const line of wrapPdfText(h2[1], boldFont, 13, textWidth)) {
          if (y - 13 < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
          page.drawText(line, { x: margin, y: y - 13, size: 13, font: boldFont, color: rgb(0.15, 0.15, 0.15) });
          y -= 17;
        }
        y -= 2;
        continue;
      }

      const bullet = para.match(/^[-*]\s+(.*)/);
      const indentX = bullet ? margin + 14 : margin;
      const lineText = bullet ? bullet[1] : para;
      const wrapped = wrapPdfText(lineText, font, bodySize, bullet ? textWidth - 14 : textWidth);
      if (bullet) {
        if (y - bodySize < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
        page.drawText("•", { x: margin, y: y - bodySize, size: bodySize, font, color: rgb(0.3, 0.3, 0.3) });
      }
      for (const line of wrapped) {
        if (y - bodySize < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
        page.drawText(line, { x: indentX, y: y - bodySize, size: bodySize, font, color: rgb(0.2, 0.2, 0.2) });
        y -= lineH;
      }
    }

    const pdfBytes = await doc.save();
    const { createBusinessFileFromUpload } = await import("@/lib/business-files-store");
    const safeTitle = title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 60);
    const filename = filenameArg || `${safeTitle || "document"}.pdf`;
    const file = await createBusinessFileFromUpload({
      userId: ctx.userId,
      fileName: filename,
      mimeType: "application/pdf",
      bytes: pdfBytes,
      category: "GENERAL",
      source: "AGENT",
      authorLabel: ctx.agentKind,
    });
    return `PDF generated successfully.\nFile: ${file.name}\nFile ID: ${file.id}\nPages: ${doc.getPageCount()}`;
  } catch (e) {
    return `Error generating PDF: ${e instanceof Error ? e.message : "unknown"}`;
  }
}

// --- Agent performance tool ---

async function handleAgentPerformance(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const agentKind = String(args.agent_kind ?? "").trim() || null;
  const days = Math.min(365, Math.max(1, Number(args.days ?? 30) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [tasks, toolCalls, submissions] = await Promise.all([
    prisma.delegatedTask.findMany({
      where: {
        userId: ctx.userId,
        createdAt: { gte: since },
        ...(agentKind ? { toAgentTarget: agentKind } : {}),
      },
      select: { toAgentTarget: true, status: true },
    }),
    prisma.delegatedTaskToolCall.findMany({
      where: {
        delegatedTask: {
          userId: ctx.userId,
          createdAt: { gte: since },
          ...(agentKind ? { toAgentTarget: agentKind } : {}),
        },
      },
      select: { toolName: true, latencyMs: true, status: true, delegatedTask: { select: { toAgentTarget: true } } },
    }),
    prisma.submission.findMany({
      where: { userId: ctx.userId, createdAt: { gte: since } },
      select: { agentKind: true, status: true },
    }),
  ]);

  const kinds = agentKind
    ? [agentKind]
    : [...new Set([...tasks.map((t) => t.toAgentTarget), ...submissions.map((s) => s.agentKind ?? "")])].filter(Boolean).sort();

  if (kinds.length === 0) return `No agent activity found in the last ${days} days.`;

  const lines: string[] = [`Agent Performance Report — last ${days} days\n${"─".repeat(48)}`];

  for (const kind of kinds) {
    const agentTasks = tasks.filter((t) => t.toAgentTarget === kind);
    const agentSubs = submissions.filter((s) => s.agentKind === kind);
    const agentCalls = toolCalls.filter((c) => c.delegatedTask.toAgentTarget === kind);

    const tasksDone = agentTasks.filter((t) => t.status === "DONE").length;
    const tasksFailed = agentTasks.filter((t) => t.status === "FAILED").length;
    const tasksTotal = agentTasks.length;
    const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

    const subsAccepted = agentSubs.filter((s) => s.status === "ACCEPTED").length;
    const subsTotal = agentSubs.length;
    const acceptanceRate = subsTotal > 0 ? Math.round((subsAccepted / subsTotal) * 100) : 0;

    const latencies = agentCalls.map((c) => c.latencyMs ?? 0).filter((l) => l > 0);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;

    const toolCounts = new Map<string, number>();
    for (const c of agentCalls) toolCounts.set(c.toolName, (toolCounts.get(c.toolName) ?? 0) + 1);
    const topTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n} (${c}x)`);

    lines.push(`\n${kind}`);
    lines.push(`  Tasks:       ${tasksTotal} total | ${tasksDone} done | ${tasksFailed} failed | ${completionRate}% completion rate`);
    lines.push(`  Submissions: ${subsTotal} total | ${subsAccepted} accepted | ${acceptanceRate}% acceptance rate`);
    if (avgLatency !== null) lines.push(`  Tool calls:  ${agentCalls.length} calls | avg ${avgLatency}ms latency`);
    if (topTools.length > 0) lines.push(`  Top tools:   ${topTools.join(", ")}`);
  }

  return lines.join("\n");
}

// --- SQL query tool ---

async function handleSqlQuery(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const connectionName = String(args.connection_name ?? "");
  const query = String(args.query ?? "").trim();
  if (!query) return "Error: query is required";

  // Safety check: only allow SELECT statements
  const normalizedQuery = query.replace(/\s+/g, " ").trim().toUpperCase();
  if (!normalizedQuery.startsWith("SELECT") && !normalizedQuery.startsWith("WITH")) {
    return "Error: Only SELECT (and WITH ... SELECT) queries are allowed for safety. No writes, DDL, or DML permitted.";
  }

  // Block dangerous keywords
  const blocked = ["DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "TRUNCATE", "EXEC", "EXECUTE", "--", "/*", "*/", ";"];
  // Allow semicolons only if it's the very last character (end of query)
  const queryWithoutTrailingSemicolon = query.trimEnd().replace(/;$/, "");
  for (const kw of blocked) {
    if (kw === ";" && !queryWithoutTrailingSemicolon.includes(";")) continue;
    if (normalizedQuery.includes(kw)) {
      return `Error: Query contains blocked keyword "${kw}". Only simple SELECT queries are allowed.`;
    }
  }

  // Look up database connection
  let connRow: { encryptedConnectionString: string; allowedTablesJson: string | null } | null = null;
  try {
    const rows = await prisma.$queryRaw<Array<{ encryptedConnectionString: string; allowedTablesJson: string | null }>>`
      SELECT "encryptedConnectionString", "allowedTablesJson"
      FROM "DatabaseConnection"
      WHERE "userId" = ${ctx.userId}
        AND "enabled" = true
        AND (${connectionName} = '' OR LOWER(name) = LOWER(${connectionName}))
      LIMIT 1
    `;
    connRow = rows[0] ?? null;
  } catch {
    return "Error: DatabaseConnection table not available. Run database migrations.";
  }

  if (!connRow) {
    return connectionName
      ? `Error: No database connection named "${connectionName}" found. Add one in Settings → Database Connections.`
      : "Error: No database connection configured. Add one in Settings → Database Connections.";
  }

  // Validate table names against allowlist if configured
  if (connRow.allowedTablesJson) {
    try {
      const allowedTables = JSON.parse(connRow.allowedTablesJson) as string[];
      // Simple table name extraction from FROM/JOIN clauses
      const tableMatches = query.matchAll(/(?:FROM|JOIN)\s+["']?(\w+)["']?/gi);
      for (const match of tableMatches) {
        const tableName = match[1];
        if (tableName && !allowedTables.includes(tableName.toLowerCase())) {
          return `Error: Table "${tableName}" is not in the allowed tables list for this connection.`;
        }
      }
    } catch {
      // Invalid JSON, skip validation
    }
  }

  // Decrypt connection string and execute query
  try {
    const { decryptSecret } = await import("@/lib/crypto-secrets");
    const connectionString = decryptSecret(connRow.encryptedConnectionString);

    // Use postgres package (dynamic import to avoid bundling issues)
    const { default: postgres } = await import("postgres");
    const sql = postgres(connectionString, { max: 1, ssl: "prefer", idle_timeout: 10 });
    try {
      const result = await sql.unsafe(query.replace(/;$/, ""));
      await sql.end();
      return JSON.stringify(result.slice(0, 200), null, 2);
    } catch (queryErr) {
      await sql.end({ timeout: 5 }).catch(() => null);
      return `Query error: ${queryErr instanceof Error ? queryErr.message : "unknown"}`;
    }
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : "Database connection failed"}`;
  }
}

// --- Semantic file search ---

async function handleSemanticSearchFiles(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const query = String(args.query ?? "").trim();
  const limit = Math.min(10, Math.max(1, Number(args.limit ?? 5) || 5));

  if (!query) return "Error: query is required";

  const { semanticSearchFiles } = await import("@/lib/embedding-store");
  const results = await semanticSearchFiles(ctx.userId, query, limit);

  if (results.length === 0) {
    return `No business files found matching: "${query}"`;
  }

  const lines = [`Found ${results.length} relevant file(s) for: "${query}"\n`];
  for (const r of results) {
    const sim = r.similarity > 0 ? ` (similarity: ${(r.similarity * 100).toFixed(0)}%)` : "";
    lines.push(`[${r.category}] ${r.name}${sim}`);
    if (r.excerpt) lines.push(`  Excerpt: ${r.excerpt}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

// --- Channel messaging (Phase 2B) ---

async function handleChannelSendMessage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const channelType = String(args.channel_type ?? "SLACK").toUpperCase() as import("@/lib/channels/types").ChannelTypeName;
  const contactId = String(args.contact_id ?? "");
  const content = String(args.content ?? "");
  if (!content) return "Error: content is required";
  try {
    const { getAdapter } = await import("@/lib/channels/channel-registry");
    const { findOrCreateConversation, recordOutboundMessage } = await import("@/lib/channels/conversation-store");
    const adapter = getAdapter(channelType);
    if (!adapter) return `Error: Channel ${channelType} is not configured`;
    const conversation = await findOrCreateConversation(ctx.userId, channelType, { externalContactId: contactId });
    const result = await adapter.send(ctx.userId, {
      channelType,
      conversationId: conversation.id,
      recipientId: contactId,
      contentText: content,
    });
    if (!result.ok) return `Error sending message: ${result.error ?? "unknown"}`;
    await recordOutboundMessage(conversation.id, { senderLabel: "agent", contentText: content, externalId: result.externalId ?? undefined });
    return `Message sent via ${channelType} to ${contactId}. External ID: ${result.externalId ?? "n/a"}`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleChannelReply(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const conversationId = String(args.conversation_id ?? "");
  const content = String(args.content ?? "");
  if (!conversationId || !content) return "Error: conversation_id and content are required";
  try {
    const { recordOutboundMessage } = await import("@/lib/channels/conversation-store");
    const { getAdapter } = await import("@/lib/channels/channel-registry");
    const conversation = await import("@/lib/db").then(m => m.prisma.channelConversation.findUnique({ where: { id: conversationId } }));
    if (!conversation || conversation.userId !== ctx.userId) return "Error: conversation not found";
    const chType = conversation.channelType as import("@/lib/channels/types").ChannelTypeName;
    const adapter = getAdapter(chType);
    if (!adapter) return `Error: Channel ${chType} is not configured`;
    const result = await adapter.send(ctx.userId, {
      channelType: chType,
      conversationId,
      recipientId: conversation.externalContactId ?? "",
      contentText: content,
      threadId: conversation.externalThreadId ?? undefined,
    });
    if (!result.ok) return `Error: ${result.error ?? "unknown"}`;
    await recordOutboundMessage(conversationId, { senderLabel: "agent", contentText: content, externalId: result.externalId ?? undefined });
    return `Reply sent via ${chType}`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleChannelListConversations(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const channelType = args.channel_type ? String(args.channel_type).toUpperCase() : undefined;
  const limit = Math.min(Number(args.limit ?? 10), 20);
  try {
    const { getActiveConversations } = await import("@/lib/channels/conversation-store");
    const conversations = await getActiveConversations(ctx.userId, {
      channelType: channelType as import("@/lib/channels/types").ChannelTypeName | undefined,
      limit,
    });
    if (conversations.length === 0) return "No active conversations found.";
    const lines = conversations.map((c) => {
      const lastMsg = c.messages[0];
      return `[${c.channelType}] ${c.externalContactId ?? c.externalThreadId ?? c.id} — agent: ${c.agentTarget ?? "unassigned"} — last: ${lastMsg?.contentText?.slice(0, 100) ?? "no messages"}`;
    });
    return `Active conversations (${conversations.length}):\n${lines.join("\n")}`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Agent-to-agent communication (Phase 3B) ---

async function handleSendAgentMessage(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const taskGroupId = String(args.task_group_id ?? "");
  const toAgent = String(args.to_agent ?? "");
  const content = String(args.content ?? "");
  const messageType = String(args.message_type ?? "INFO").toUpperCase();
  if (!taskGroupId || !toAgent || !content) return "Error: task_group_id, to_agent, and content are required";
  try {
    const { sendAgentMessage } = await import("@/lib/task-group-store");
    // Determine the current agent from context (the delegated task's toAgentTarget)
    const task = await import("@/lib/db").then(m => m.prisma.delegatedTask.findUnique({ where: { id: ctx.delegatedTaskId }, select: { toAgentTarget: true } }));
    const fromAgent = task?.toAgentTarget ?? "UNKNOWN";
    await sendAgentMessage({ taskGroupId, fromAgent, toAgent, messageType, content: content.slice(0, 10000) });
    return `Message sent to ${toAgent} (type: ${messageType})`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleReadAgentMessages(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const taskGroupId = String(args.task_group_id ?? "");
  const limit = Math.min(Number(args.limit ?? 10), 20);
  if (!taskGroupId) return "Error: task_group_id is required";
  try {
    const { getMessagesForAgent } = await import("@/lib/task-group-store");
    const task = await import("@/lib/db").then(m => m.prisma.delegatedTask.findUnique({ where: { id: ctx.delegatedTaskId }, select: { toAgentTarget: true } }));
    const agentKind = task?.toAgentTarget ?? "UNKNOWN";
    const messages = await getMessagesForAgent(taskGroupId, agentKind, limit);
    if (messages.length === 0) return "No messages in this task group.";
    return messages.reverse().map((m) =>
      `[${m.createdAt.toISOString().slice(0, 16)}] ${m.fromAgent}→${m.toAgent} (${m.messageType}): ${m.content.slice(0, 500)}`
    ).join("\n");
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleWriteWorkspace(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const taskGroupId = String(args.task_group_id ?? "");
  const key = String(args.key ?? "");
  const value = String(args.value ?? "");
  if (!taskGroupId || !key || !value) return "Error: task_group_id, key, and value are required";
  try {
    const { writeWorkspace } = await import("@/lib/task-group-store");
    const task = await import("@/lib/db").then(m => m.prisma.delegatedTask.findUnique({ where: { id: ctx.delegatedTaskId }, select: { toAgentTarget: true } }));
    const entry = await writeWorkspace(taskGroupId, key, value.slice(0, 20000), task?.toAgentTarget ?? "UNKNOWN");
    return `Workspace entry "${key}" written (version ${entry.version})`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleReadWorkspace(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const taskGroupId = String(args.task_group_id ?? "");
  const key = args.key ? String(args.key) : null;
  if (!taskGroupId) return "Error: task_group_id is required";
  try {
    if (key) {
      const { readWorkspace } = await import("@/lib/task-group-store");
      const entry = await readWorkspace(taskGroupId, key);
      if (!entry) return `No workspace entry found for key "${key}"`;
      return `[${key}] (by ${entry.writtenBy}, v${entry.version}): ${entry.value.slice(0, 4000)}`;
    }
    const { getWorkspaceSnapshot } = await import("@/lib/task-group-store");
    const snapshot = await getWorkspaceSnapshot(taskGroupId);
    const keys = Object.keys(snapshot);
    if (keys.length === 0) return "Workspace is empty.";
    return keys.map((k) => `[${k}] (by ${snapshot[k].writtenBy}, v${snapshot[k].version}): ${snapshot[k].value.slice(0, 500)}`).join("\n");
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

async function handleRequestAgentHelp(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const toAgent = String(args.to_agent ?? "");
  const title = String(args.title ?? "");
  const instructions = String(args.instructions ?? "");
  if (!toAgent || !title || !instructions) return "Error: to_agent, title, and instructions are required";
  try {
    const { createTaskGroup, sendAgentMessage, linkTaskToGroup } = await import("@/lib/task-group-store");
    const { createDelegatedTask: createTask } = await import("@/lib/orchestration-store");
    // Create or use existing group
    const group = await createTaskGroup(ctx.userId, `Help request: ${title.slice(0, 200)}`, ctx.delegatedTaskId);
    await linkTaskToGroup(ctx.delegatedTaskId, group.id);
    const task = await import("@/lib/db").then(m => m.prisma.delegatedTask.findUnique({ where: { id: ctx.delegatedTaskId }, select: { toAgentTarget: true } }));
    const fromAgent = task?.toAgentTarget ?? "UNKNOWN";
    await sendAgentMessage({ taskGroupId: group.id, fromAgent, toAgent, messageType: "REQUEST", content: instructions.slice(0, 8000) });
    const helpTask = await createTask(ctx.userId, {
      fromAgent,
      toAgentTarget: toAgent as import("@/lib/orchestration-store").AgentTarget,
      title: title.slice(0, 240),
      instructions: instructions.slice(0, 12000),
      triggerSource: "AGENT_REQUEST",
    });
    await linkTaskToGroup(helpTask.id, group.id);
    return `Help request sent to ${toAgent}. Task group: ${group.id}, task: ${helpTask.id}`;
  } catch (e) { return `Error: ${e instanceof Error ? e.message : "unknown"}`; }
}

// --- Data App Generation ---

const DATA_APP_SCHEMAS: Record<string, string> = {
  "rack-map": `{
  "racks": [
    {
      "id": "string",
      "label": "string (rack name/location)",
      "totalUnits": "number (typically 42)",
      "nodes": [
        {
          "id": "string",
          "label": "string (device name)",
          "rackUnit": "number (1-based, bottom-up U position)",
          "heightUnits": "number (how many U slots this spans, e.g. 1, 2, 4)",
          "status": "online | offline | warning | maintenance",
          "specs": "string (e.g. 'Dell R740 · 128GB · 2x Xeon')",
          "tags": ["string"]
        }
      ]
    }
  ]
}`,
  "table": `{
  "columns": [
    { "key": "string (field key)", "label": "string (display header)", "align": "left|center|right", "format": "text|number|currency|date|badge" }
  ],
  "rows": [ { "key1": "value1", "key2": "value2" } ],
  "groupByKey": "optional string (column key to group rows by)",
  "sortByKey": "optional string (column key for default sort)"
}`,
  "kpi-grid": `{
  "cards": [
    { "label": "string", "value": "string|number", "unit": "optional string", "trend": "up|down|flat", "tone": "teal|amber|rose|green|purple|slate" }
  ],
  "columns": "optional number (2|3|4, default 3)"
}`,
};

// ---------------------------------------------------------------------------
// Entity ontology handlers
// ---------------------------------------------------------------------------

async function handleLookupEntity(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const nameOrId = String(args.name_or_id ?? "").trim();
  if (!nameOrId) return "Error: name_or_id is required";

  const typeStr = args.type ? String(args.type).toUpperCase() : undefined;
  const validTypes = ["PERSON", "COMPANY", "DEAL", "PROJECT"];
  const type = typeStr && validTypes.includes(typeStr) ? (typeStr as "PERSON" | "COMPANY" | "DEAL" | "PROJECT") : undefined;

  const { getEntityContext, formatEntityContextForPrompt } = await import("@/lib/entity-store");
  const entityCtx = await getEntityContext(ctx.userId, nameOrId, type);
  if (!entityCtx) return `No entity found matching "${nameOrId}"`;
  return formatEntityContextForPrompt(entityCtx);
}

async function handleSearchEntities(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const query = String(args.query ?? "").trim();
  if (!query) return "Error: query is required";

  const typeStr = args.type ? String(args.type).toUpperCase() : undefined;
  const validTypes = ["PERSON", "COMPANY", "DEAL", "PROJECT"];
  const type = typeStr && validTypes.includes(typeStr) ? (typeStr as "PERSON" | "COMPANY" | "DEAL" | "PROJECT") : undefined;
  const limit = typeof args.limit === "number" ? args.limit : 20;

  const { searchEntities } = await import("@/lib/entity-store");
  const results = await searchEntities(ctx.userId, query, type, limit);
  if (results.length === 0) return `No entities found matching "${query}"`;
  return JSON.stringify(results, null, 2);
}

async function handleGenerateDataApp(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<string> {
  const appType = String(args.app_type ?? "").trim();
  const title = String(args.title ?? "").trim();
  const description = String(args.description ?? "").trim();
  const fileIds = Array.isArray(args.file_ids) ? (args.file_ids as string[]).slice(0, 5) : [];

  if (!appType || !DATA_APP_SCHEMAS[appType]) {
    return `Error: app_type must be one of: ${Object.keys(DATA_APP_SCHEMAS).join(", ")}`;
  }
  if (!title) return "Error: title is required";

  // Gather data context
  const contextParts: string[] = [];

  // Company soul
  try {
    const { getCompanySoul } = await import("@/lib/company-soul-store");
    const soul = await getCompanySoul(ctx.userId);
    const soulText = [
      soul.companyName && `Company: ${soul.companyName}`,
      soul.coreOffers && `Offers: ${soul.coreOffers}`,
      soul.toolsAndSystems && `Tools/Systems: ${soul.toolsAndSystems}`,
      soul.departments && `Departments: ${soul.departments}`,
    ].filter(Boolean).join("\n");
    if (soulText) contextParts.push(`COMPANY PROFILE:\n${soulText}`);
  } catch { /* no company soul */ }

  // Business files
  if (fileIds.length > 0) {
    for (const fid of fileIds) {
      const file = await prisma.businessFile.findFirst({ where: { id: fid, userId: ctx.userId } });
      if (file?.textExtract) {
        contextParts.push(`FILE "${file.name}":\n${file.textExtract.slice(0, 6000)}`);
      }
    }
  }

  // Recent business logs
  try {
    const { listBusinessLogs } = await import("@/lib/business-logs-store");
    const logs = await listBusinessLogs(ctx.userId, 10);
    if (logs.length > 0) {
      const logText = logs.map((l) => `- ${l.title}: ${(l.body ?? "").slice(0, 200)}`).join("\n");
      contextParts.push(`RECENT BUSINESS LOGS:\n${logText}`);
    }
  } catch { /* no logs */ }

  const combinedContext = contextParts.join("\n\n").slice(0, 24000);

  const systemPrompt = `You are a data visualization assistant. Generate structured JSON for a "${appType}" visualization.

The user wants: ${title}${description ? `\nDetails: ${description}` : ""}

You MUST output ONLY valid JSON conforming to this exact schema:
${DATA_APP_SCHEMAS[appType]}

Rules:
- Output raw JSON only. No markdown, no explanation, no code fences.
- Use real data from the provided context. If data is sparse, make reasonable inferences based on context.
- For rack-map: ensure rackUnit + heightUnits never exceed totalUnits. Use realistic specs.
- For table: include at least the columns that make sense for the data.
- For kpi-grid: derive meaningful metrics from the data provided.`;

  try {
    const { callAgentLlm } = await import("@/lib/agent-llm");
    const result = await callAgentLlm({
      userId: ctx.userId,
      agentKind: "CHIEF_ADVISOR",
      systemPrompt,
      userMessage: combinedContext || "Generate sample data based on common business scenarios.",
      maxOutputTokens: 4096,
    });

    if (result.error) return `Error generating data app: ${result.error}`;

    const raw = result.text.trim();
    // Extract JSON (handle potential markdown wrapping)
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return "Error: LLM did not return valid JSON";

    const jsonStr = raw.slice(jsonStart, jsonEnd + 1);
    // Validate it parses
    JSON.parse(jsonStr);

    const { createDataApp } = await import("@/lib/data-app-store");
    const app = await createDataApp(ctx.userId, {
      title,
      appType,
      dataJson: jsonStr,
      sourceContext: fileIds.length > 0 ? `files: ${fileIds.join(", ")}` : "business context",
    });

    return `Data app created successfully.\nTitle: ${app.title}\nType: ${appType}\nID: ${app.id}\nView it at: /data-apps/${app.id}`;
  } catch (e: unknown) {
    if (e instanceof SyntaxError) return "Error: LLM returned invalid JSON. Please try again.";
    return `Error generating data app: ${e instanceof Error ? e.message : "unknown error"}`;
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
  google_read_email: handleGoogleReadEmail,
  google_send_email: handleGoogleSendEmail,
  google_list_calendar_events: handleGoogleListCalendarEvents,
  google_create_calendar_event: handleGoogleCreateCalendarEvent,
  google_list_drive_files: handleGoogleListDriveFiles,
  google_read_drive_file: handleGoogleReadDriveFile,
  // Linear
  linear_list_issues: handleLinearListIssues,
  linear_create_issue: handleLinearCreateIssue,
  linear_update_issue: handleLinearUpdateIssue,
  // QuickBooks
  quickbooks_get_profit_loss: handleQuickbooksGetProfitLoss,
  quickbooks_get_balance_sheet: handleQuickbooksGetBalanceSheet,
  quickbooks_get_cash_flow: handleQuickbooksGetCashFlow,
  quickbooks_list_invoices: handleQuickbooksListInvoices,
  // Xero
  xero_get_profit_loss: handleXeroGetProfitLoss,
  xero_get_balance_sheet: handleXeroGetBalanceSheet,
  xero_get_trial_balance: handleXeroGetTrialBalance,
  xero_list_invoices: handleXeroListInvoices,
  // Calendly
  calendly_list_event_types: handleCalendlyListEventTypes,
  calendly_list_scheduled_events: handleCalendlyListScheduledEvents,
  calendly_get_event_invitees: handleCalendlyGetEventInvitees,
  calendly_create_scheduling_link: handleCalendlyCreateSchedulingLink,
  // Browser automation
  browser_navigate: handleBrowserNavigate,
  browser_get_content: handleBrowserGetContent,
  browser_screenshot: handleBrowserScreenshot,
  browser_click: handleBrowserClick,
  browser_type: handleBrowserType,
  // GitHub
  github_list_repos: handleGithubListRepos,
  github_list_issues: handleGithubListIssues,
  github_create_issue: handleGithubCreateIssue,
  github_list_prs: handleGithubListPRs,
  // Notion
  notion_search: handleNotionSearch,
  notion_read_page: handleNotionReadPage,
  notion_create_page: handleNotionCreatePage,
  notion_append_block: handleNotionAppendBlock,
  // Stripe Finance
  stripe_get_revenue: handleStripeGetRevenue,
  stripe_list_customers: handleStripeListCustomers,
  stripe_list_subscriptions: handleStripeListSubscriptions,
  stripe_list_invoices: handleStripeListInvoices,
  stripe_get_customer: handleStripeGetCustomer,
  stripe_create_customer: handleStripeCreateCustomer,
  stripe_get_invoice: handleStripeGetInvoice,
  stripe_create_invoice: handleStripeCreateInvoice,
  stripe_get_subscription: handleStripeGetSubscription,
  stripe_list_charges: handleStripeListCharges,
  stripe_get_balance_transactions: handleStripeGetBalanceTransactions,
  stripe_list_products: handleStripeListProducts,
  stripe_list_prices: handleStripeListPrices,
  // HubSpot expanded
  hubspot_create_deal: handleHubspotCreateDeal,
  hubspot_update_deal: handleHubspotUpdateDeal,
  hubspot_get_deal: handleHubspotGetDeal,
  hubspot_list_pipeline_stages: handleHubspotListPipelineStages,
  hubspot_create_company: handleHubspotCreateCompany,
  hubspot_search_companies: handleHubspotSearchCompanies,
  hubspot_list_activities: handleHubspotListActivities,
  hubspot_create_engagement: handleHubspotCreateEngagement,
  hubspot_list_contact_lists: handleHubspotListContactLists,
  hubspot_get_custom_properties: handleHubspotGetCustomProperties,
  // Slack expanded
  slack_add_reaction: handleSlackAddReaction,
  slack_reply_to_thread: handleSlackReplyToThread,
  slack_create_channel: handleSlackCreateChannel,
  slack_invite_to_channel: handleSlackInviteToChannel,
  slack_lookup_user: handleSlackLookupUser,
  slack_list_users: handleSlackListUsers,
  slack_schedule_message: handleSlackScheduleMessage,
  slack_set_channel_topic: handleSlackSetChannelTopic,
  // Linear expanded
  linear_list_projects: handleLinearListProjects,
  linear_create_project: handleLinearCreateProject,
  linear_list_labels: handleLinearListLabels,
  linear_create_comment: handleLinearCreateComment,
  linear_list_cycles: handleLinearListCycles,
  linear_get_roadmap: handleLinearGetRoadmap,
  linear_update_project: handleLinearUpdateProject,
  linear_get_issue_history: handleLinearGetIssueHistory,
  // Notion expanded
  notion_query_database: handleNotionQueryDatabase,
  notion_create_database_entry: handleNotionCreateDatabaseEntry,
  notion_update_page: handleNotionUpdatePage,
  notion_delete_page: handleNotionDeletePage,
  notion_list_databases: handleNotionListDatabases,
  // GitHub expanded
  github_create_pr: handleGithubCreatePR,
  github_merge_pr: handleGithubMergePR,
  github_list_workflow_runs: handleGithubListWorkflowRuns,
  github_trigger_workflow: handleGithubTriggerWorkflow,
  github_add_label: handleGithubAddLabel,
  github_update_issue: handleGithubUpdateIssue,
  github_create_comment: handleGithubCreateComment,
  github_list_branches: handleGithubListBranches,
  github_get_commit: handleGithubGetCommit,
  github_compare_commits: handleGithubCompareCommits,
  // Jira
  jira_list_projects: handleJiraListProjects,
  jira_list_issues: handleJiraListIssues,
  jira_get_issue: handleJiraGetIssue,
  jira_create_issue: handleJiraCreateIssue,
  jira_update_issue: handleJiraUpdateIssue,
  jira_add_comment: handleJiraAddComment,
  jira_transition_issue: handleJiraTransitionIssue,
  jira_list_transitions: handleJiraListTransitions,
  jira_assign_issue: handleJiraAssignIssue,
  jira_search_users: handleJiraSearchUsers,
  // Google Docs / Sheets write
  google_create_doc: handleGoogleCreateDoc,
  google_append_doc: handleGoogleAppendDoc,
  google_create_sheet: handleGoogleCreateSheet,
  google_append_sheet_rows: handleGoogleAppendSheetRows,
  // Agent-scheduled follow-up
  schedule_followup: handleScheduleFollowup,
  // SQL query
  sql_query: handleSqlQuery,
  // PDF generation
  generate_pdf: handleGeneratePdf,
  // Agent performance
  agent_performance: handleAgentPerformance,
  // Semantic RAG search over business files
  semantic_search_files: handleSemanticSearchFiles,
  // Channel messaging (Phase 2B)
  channel_send_message: handleChannelSendMessage,
  channel_reply: handleChannelReply,
  channel_list_conversations: handleChannelListConversations,
  // Agent-to-agent communication (Phase 3B)
  send_agent_message: handleSendAgentMessage,
  read_agent_messages: handleReadAgentMessages,
  write_workspace: handleWriteWorkspace,
  read_workspace: handleReadWorkspace,
  request_agent_help: handleRequestAgentHelp,
  // Data Apps
  generate_data_app: handleGenerateDataApp,
  // Entity ontology
  lookup_entity: handleLookupEntity,
  search_entities: handleSearchEntities,
};

const RUNNER_HANDLERS: Record<string, (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<string>> = {
  run_command: handleRunCommand,
  write_file: handleWriteFile,
};

const ENTITY_EXTRACTION_PREFIXES = ["hubspot_", "google_", "slack_", "linear_"];

function maybeExtractEntities(
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  ctx: ToolExecutionContext,
): void {
  if (!ENTITY_EXTRACTION_PREFIXES.some((p) => toolName.startsWith(p))) return;
  void import("@/lib/entity-extractor").then(({ extractEntitiesFromToolOutput }) =>
    extractEntitiesFromToolOutput(ctx.userId, toolName, args, output, ctx.delegatedTaskId).catch(() => {}),
  ).catch(() => {});
}

export async function executeToolCall(
  call: ToolCallRequest,
  toolDef: ToolDefinitionView,
  ctx: ToolExecutionContext,
): Promise<ToolExecutionResult> {
  const start = Date.now();

  try {
    const args = parseArgs(call.arguments);

    if (toolDef.executionMode === "approval_required" || (ctx.requireApproval && toolDef.category === "external")) {
      // Check if a user-defined auto-approval rule matches before requiring human approval.
      const { checkAutoApproval } = await import("@/lib/auto-approval-store");
      const autoApprovedBy = await checkAutoApproval(ctx.userId, call.name, args).catch(() => null);
      if (!autoApprovedBy) {
        // Do NOT execute the action here — store it for deferred execution after human approval.
        // The actual call fires in pending-actions-executor.ts once the inbox item is approved.
        return {
          output: `Action "${call.name}" is pending human approval. It will execute once approved in the Inbox.`,
          status: "approval_required",
          latencyMs: Date.now() - start,
        };
      }
      // Falls through to normal in_process execution below
    }

    if (toolDef.executionMode === "runner") {
      const handler = RUNNER_HANDLERS[call.name];
      if (!handler) {
        return { output: `No runner handler for tool "${call.name}"`, status: "error", latencyMs: Date.now() - start };
      }
      const output = await handler(args, ctx);
      maybeExtractEntities(call.name, args, output, ctx);
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
    maybeExtractEntities(call.name, args, output, ctx);
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
