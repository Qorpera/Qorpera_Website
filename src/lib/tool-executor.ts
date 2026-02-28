import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getOrCreateSession, extractPageState } from "@/lib/browser-session";
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
    const result = await createCalendarEvent(token, summary, startDateTime, endDateTime, args.description ? String(args.description) : undefined);
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
