import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillMeta = {
  name: string;
  displayName: string;
  description: string;
  shortDescription: string;
  enabled: boolean;
  isSystem: boolean;
  path: string;
  hasScripts: boolean;
  hasReferences: boolean;
  skillMdContent: string;
};

export type SkillRequirements = {
  type: "self-contained" | "openai-api" | "github-cli" | "mcp-required" | "platform-deploy" | "external-api";
  envVars?: string[];
  cliTools?: string[];
  mcpServers?: string[];
  systemPackages?: string[];
  notes?: string;
};

export type CatalogSkill = {
  name: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string;
  category: "deployment" | "development" | "integration" | "productivity" | "security" | "media";
  requirements: SkillRequirements;
  source: "openai" | "anthropic";
  installed: boolean;
  enabled: boolean;
};

// ---------------------------------------------------------------------------
// Built-in catalog — openai/skills curated skills (fetched 2026-02-24)
// ---------------------------------------------------------------------------

const CURATED_CATALOG: Omit<CatalogSkill, "installed" | "enabled">[] = [
  // --- openai/skills curated catalog ---
  { name: "cloudflare-deploy", displayName: "Cloudflare Deploy", shortDescription: "Deploy Workers, Pages, and platform services on Cloudflare", defaultPrompt: "Deploy this app to Cloudflare (Workers or Pages) and return URL, config, and required env vars.", category: "deployment", source: "openai", requirements: { type: "platform-deploy", cliTools: ["npx"], notes: "Requires Cloudflare account; uses wrangler via npx" } },
  { name: "develop-web-game", displayName: "Develop Web Game", shortDescription: "Web game dev + Playwright test loop", defaultPrompt: "Build and iterate a playable web game in this workspace, validating changes with a Playwright loop.", category: "development", source: "openai", requirements: { type: "self-contained" } },
  { name: "doc", displayName: "Word Docs", shortDescription: "Edit and review docx files", defaultPrompt: "Edit or review this .docx file and return the updated file plus a concise change summary.", category: "productivity", source: "openai", requirements: { type: "self-contained", cliTools: ["python3"], systemPackages: ["python3-docx"] } },
  { name: "figma-implement-design", displayName: "Figma Implement Design", shortDescription: "Turn Figma designs into production-ready code", defaultPrompt: "Implement this Figma design in this codebase, matching layout, states, and responsive behavior.", category: "development", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Figma MCP"], notes: "Requires Figma MCP server with OAuth" } },
  { name: "figma", displayName: "Figma", shortDescription: "Use Figma MCP for design-to-code work", defaultPrompt: "Use Figma MCP to inspect the target design and translate it into implementable UI decisions.", category: "integration", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Figma MCP"], notes: "Requires Figma MCP server with OAuth" } },
  { name: "gh-address-comments", displayName: "GitHub Address Comments", shortDescription: "Address comments in a GitHub PR review", defaultPrompt: "Address all actionable GitHub PR review comments in this branch and summarize the updates.", category: "integration", source: "openai", requirements: { type: "github-cli", cliTools: ["gh"], notes: "Requires gh CLI authenticated" } },
  { name: "gh-fix-ci", displayName: "GitHub Fix CI", shortDescription: "Debug failing GitHub Actions CI", defaultPrompt: "Inspect failing GitHub Actions checks in this repo, summarize root cause, and propose a focused fix plan.", category: "integration", source: "openai", requirements: { type: "github-cli", cliTools: ["gh"], notes: "Requires gh CLI authenticated" } },
  { name: "imagegen", displayName: "Image Gen", shortDescription: "Generate and edit images using OpenAI", defaultPrompt: "Generate or edit images for this task and return the final prompt plus selected outputs.", category: "media", source: "openai", requirements: { type: "openai-api", envVars: ["OPENAI_API_KEY"], cliTools: ["python3"] } },
  { name: "jupyter-notebook", displayName: "Jupyter Notebooks", shortDescription: "Create Jupyter notebooks for experiments and tutorials", defaultPrompt: "Create a Jupyter notebook for this task with clear sections, runnable cells, and concise takeaways.", category: "development", source: "openai", requirements: { type: "self-contained", cliTools: ["python3"] } },
  { name: "linear", displayName: "Linear", shortDescription: "Manage Linear issues in Codex", defaultPrompt: "Use Linear context to triage or update relevant issues for this task, with clear next actions.", category: "integration", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Linear MCP"], notes: "Requires Linear MCP server with OAuth" } },
  { name: "netlify-deploy", displayName: "Netlify Deploy", shortDescription: "Deploy web projects to Netlify with the Netlify CLI", defaultPrompt: "Deploy this project to Netlify and return the preview URL, build settings, and any required fixes.", category: "deployment", source: "openai", requirements: { type: "platform-deploy", cliTools: ["netlify"], notes: "Requires Netlify CLI and auth token" } },
  { name: "notion-knowledge-capture", displayName: "Notion Knowledge Capture", shortDescription: "Capture conversations into structured Notion pages", defaultPrompt: "Capture this conversation into structured Notion pages with decisions, action items, and owners when known.", category: "productivity", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Notion MCP"], notes: "Requires Notion MCP server with OAuth" } },
  { name: "notion-meeting-intelligence", displayName: "Notion Meeting Intelligence", shortDescription: "Prep meetings with Notion context and tailored agendas", defaultPrompt: "Prepare this meeting from Notion context with a brief, agenda, decisions needed, and open questions.", category: "productivity", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Notion MCP"], notes: "Requires Notion MCP server with OAuth" } },
  { name: "notion-research-documentation", displayName: "Notion Research & Documentation", shortDescription: "Research Notion content and produce briefs/reports", defaultPrompt: "Research this topic in Notion and produce a sourced brief with clear recommendations.", category: "productivity", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Notion MCP"], notes: "Requires Notion MCP server with OAuth" } },
  { name: "notion-spec-to-implementation", displayName: "Notion Spec to Implementation", shortDescription: "Turn Notion specs into implementation plans and tasks", defaultPrompt: "Turn this Notion spec into an implementation plan with milestones, tasks, and dependencies.", category: "productivity", source: "openai", requirements: { type: "mcp-required", mcpServers: ["Notion MCP"], notes: "Requires Notion MCP server with OAuth" } },
  { name: "openai-docs", displayName: "OpenAI Docs", shortDescription: "Reference the official OpenAI Developer docs", defaultPrompt: "Look up official OpenAI docs for this task and answer with concise, cited guidance.", category: "development", source: "openai", requirements: { type: "external-api", notes: "Uses MCP auto-auth; no user API key required" } },
  { name: "pdf", displayName: "PDF Skill", shortDescription: "Create, edit, and review PDFs", defaultPrompt: "Create, edit, or review this PDF and summarize the key output or changes.", category: "productivity", source: "openai", requirements: { type: "self-contained", cliTools: ["python3"], systemPackages: ["poppler-utils"] } },
  { name: "playwright", displayName: "Playwright CLI Skill", shortDescription: "Automate real browsers from the terminal", defaultPrompt: "Automate this browser workflow with Playwright and produce a reliable script with run steps.", category: "development", source: "openai", requirements: { type: "self-contained", cliTools: ["npx"] } },
  { name: "render-deploy", displayName: "Render Deploy", shortDescription: "Deploy applications to Render via Blueprints or MCP", defaultPrompt: "Deploy this application to Render and provide service URL, env vars, and next checks.", category: "deployment", source: "openai", requirements: { type: "platform-deploy", notes: "Requires Render account; uses render.yaml or MCP" } },
  { name: "screenshot", displayName: "Screenshot Capture", shortDescription: "Capture screenshots", defaultPrompt: "Capture the right screenshot for this task (target, area, and output path).", category: "productivity", source: "openai", requirements: { type: "self-contained" } },
  { name: "security-best-practices", displayName: "Security Best Practices", shortDescription: "Security reviews and secure-by-default guidance", defaultPrompt: "Review this codebase for security best practices and suggest secure-by-default improvements.", category: "security", source: "openai", requirements: { type: "self-contained" } },
  { name: "security-ownership-map", displayName: "Security Ownership Map", shortDescription: "Map maintainers, bus factor, and sensitive code ownership", defaultPrompt: "Build a security ownership map for this repository and identify bus-factor risks in sensitive code.", category: "security", source: "openai", requirements: { type: "self-contained" } },
  { name: "security-threat-model", displayName: "Security Threat Model", shortDescription: "Repo-grounded threat modeling and abuse-path analysis", defaultPrompt: "Create a repository-grounded threat model for this codebase with prioritized abuse paths and mitigations.", category: "security", source: "openai", requirements: { type: "self-contained" } },
  { name: "sentry", displayName: "Sentry (Read-only Observability)", shortDescription: "Read-only Sentry observability", defaultPrompt: "Investigate this issue in read-only Sentry data and report likely root cause, impact, and next steps.", category: "integration", source: "openai", requirements: { type: "external-api", envVars: ["SENTRY_AUTH_TOKEN"], notes: "Requires Sentry auth token for API access" } },
  { name: "sora", displayName: "Sora Video Generation", shortDescription: "Generate and manage Sora videos", defaultPrompt: "Plan and generate a Sora video for this request, then iterate with concrete prompt edits.", category: "media", source: "openai", requirements: { type: "openai-api", envVars: ["OPENAI_API_KEY"], cliTools: ["python3"], notes: "Requires Sora tier API access" } },
  { name: "speech", displayName: "Speech Generation", shortDescription: "Generate narrated audio from text", defaultPrompt: "Generate spoken audio for this text with the right voice style, pacing, and output format.", category: "media", source: "openai", requirements: { type: "openai-api", envVars: ["OPENAI_API_KEY"], cliTools: ["python3"] } },
  { name: "spreadsheet", displayName: "Spreadsheet Skill", shortDescription: "Create, edit, and analyze spreadsheets", defaultPrompt: "Create or update a spreadsheet for this task with the right formulas, structure, and formatting.", category: "productivity", source: "openai", requirements: { type: "self-contained", cliTools: ["python3"] } },
  { name: "transcribe", displayName: "Audio Transcribe", shortDescription: "Transcribe audio with optional speaker diarization", defaultPrompt: "Transcribe this audio or video, include speaker labels when possible, and provide a clean summary.", category: "media", source: "openai", requirements: { type: "openai-api", envVars: ["OPENAI_API_KEY"], cliTools: ["python3"] } },
  { name: "vercel-deploy", displayName: "Vercel Deploy", shortDescription: "Deploy apps and agents with zero configuration on Vercel", defaultPrompt: "Create a Vercel deployment for this project and share the URL.", category: "deployment", source: "openai", requirements: { type: "platform-deploy", cliTools: ["npx"], notes: "Requires Vercel account; uses vercel CLI via npx" } },
  { name: "yeet", displayName: "Yeet", shortDescription: "Stage, commit, and open PR", defaultPrompt: "Prepare this branch for review: stage intended changes, write a focused commit, and open a PR.", category: "deployment", source: "openai", requirements: { type: "github-cli", cliTools: ["gh"], notes: "Requires gh CLI authenticated" } },
  // --- Built-in connectors (configured via Settings → Connectors, not installed from GitHub) ---
  { name: "connector-email", displayName: "Email Connector", shortDescription: "Send emails via Resend, SendGrid, or Postmark after inbox approval", defaultPrompt: "Draft an email to [recipient] about [topic] and queue it for approval.", category: "integration", source: "openai", requirements: { type: "external-api", notes: "Configure API key in Settings → Connectors. Agents draft emails; you approve before sending." } },
  { name: "connector-webhook", displayName: "Outbound Webhook", shortDescription: "Trigger HTTP webhooks to Zapier, Make, n8n, or any endpoint after approval", defaultPrompt: "Trigger a webhook to notify [URL] with [payload] after this task completes.", category: "integration", source: "openai", requirements: { type: "external-api", notes: "No API key needed. Configure target URLs per-task. Webhooks require inbox approval before firing." } },
  // --- anthropics/skills catalog ---
  { name: "mcp-builder", displayName: "MCP Builder", shortDescription: "Build production-quality MCP servers in TypeScript or Python", defaultPrompt: "Build an MCP server for this API or service following the 4-phase process: research, implement, review, and create evaluations.", category: "development", source: "anthropic", requirements: { type: "self-contained", cliTools: ["npx"], notes: "Recommended: TypeScript with Zod schemas or Python with FastMCP" } },
  { name: "internal-comms", displayName: "Internal Comms", shortDescription: "Write 3P updates, status reports, newsletters, incident reports, and leadership updates", defaultPrompt: "Write an internal communication for this update using the appropriate format and tone.", category: "productivity", source: "anthropic", requirements: { type: "self-contained" } },
  { name: "doc-coauthoring", displayName: "Doc Co-Authoring", shortDescription: "Collaborative 3-stage workflow for PRDs, RFCs, proposals, and decision docs", defaultPrompt: "Co-author this document through context gathering, section-by-section drafting, and reader testing.", category: "productivity", source: "anthropic", requirements: { type: "self-contained" } },
  { name: "skill-creator", displayName: "Skill Creator", shortDescription: "Design, test, and benchmark new skills with a full evaluation pipeline", defaultPrompt: "Create a new skill for this capability: interview requirements, write SKILL.md, build test cases, and run benchmarks.", category: "development", source: "anthropic", requirements: { type: "self-contained" } },
  { name: "webapp-testing", displayName: "Web App Testing", shortDescription: "Playwright-based frontend testing with server lifecycle management", defaultPrompt: "Test this web application's frontend behavior, capture screenshots, and report any failures.", category: "development", source: "anthropic", requirements: { type: "self-contained", cliTools: ["python3", "npx"] } },
  { name: "frontend-design", displayName: "Frontend Design", shortDescription: "Production-grade UI with opinionated design thinking and distinctive aesthetics", defaultPrompt: "Design and build this UI with a clear aesthetic point-of-view: typography, color, motion, and spatial composition.", category: "development", source: "anthropic", requirements: { type: "self-contained" } },
  { name: "pptx", displayName: "PowerPoint", shortDescription: "Create and edit PowerPoint presentations", defaultPrompt: "Create or edit a PowerPoint presentation for this content and return the final file.", category: "productivity", source: "anthropic", requirements: { type: "self-contained", cliTools: ["python3"], systemPackages: ["python3-pptx"] } },
  { name: "xlsx", displayName: "Excel", shortDescription: "Create and analyze Excel spreadsheets with formulas and charts", defaultPrompt: "Create or update an Excel spreadsheet for this task with the right formulas, structure, and charts.", category: "productivity", source: "anthropic", requirements: { type: "self-contained", cliTools: ["python3"], systemPackages: ["openpyxl"] } },
  { name: "theme-factory", displayName: "Theme Factory", shortDescription: "Generate cohesive CSS design system themes and token sets", defaultPrompt: "Generate a complete design system theme for this brand with color tokens, typography scale, and component styles.", category: "development", source: "anthropic", requirements: { type: "self-contained" } },
  { name: "web-artifacts-builder", displayName: "Web Artifacts Builder", shortDescription: "Build interactive web demos, data visualizations, and embeddable artifacts", defaultPrompt: "Build an interactive web artifact for this content — self-contained HTML/JS ready to embed or share.", category: "development", source: "anthropic", requirements: { type: "self-contained" } },
  // --- Agent tool integrations ---
  { name: "figma-design", displayName: "Figma Design", shortDescription: "Read brand tokens, components, and frames from Figma files", defaultPrompt: "Use figma_get_design to read brand colors and typography from the Figma brand guide before generating any on-brand visuals, emails, or content.", category: "integration", source: "anthropic", requirements: { type: "external-api", envVars: ["FIGMA_ACCESS_TOKEN"], notes: "Personal Access Token from Figma account settings → Security → Personal access tokens. Works on all Figma plans including free." } },
  { name: "tavily-research", displayName: "Tavily Research", shortDescription: "Web search and content extraction for research agents", defaultPrompt: "Use web_search and extract_content tools to research topics thoroughly.", category: "integration", source: "anthropic", requirements: { type: "external-api", envVars: ["TAVILY_API_KEY"], notes: "API key from tavily.com. Free tier: 1000 searches/month. Used by Research Analyst agent for web search and content extraction." } },
];

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function skillsDir(): string {
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  return path.join(codexHome, "skills");
}

function openClawConfigPath(): string {
  return path.join(os.homedir(), ".openclaw", "openclaw.json");
}

const SKILLS_REPO = "openai/skills";
const CURATED_PATH = "skills/.curated";
const ANTHROPIC_SKILLS_REPO = "anthropics/skills";
const ANTHROPIC_SKILLS_PATH = "skills";
const SKILLS_REF = "main";

// ---------------------------------------------------------------------------
// YAML-like frontmatter parser (avoids js-yaml dependency)
// ---------------------------------------------------------------------------

function parseSkillMd(content: string): { frontmatter: Record<string, string>; body: string } {
  const fm: Record<string, string> = {};
  if (!content.startsWith("---")) return { frontmatter: fm, body: content };

  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) return { frontmatter: fm, body: content };

  const fmBlock = content.slice(4, endIdx);
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) fm[key] = value;
  }

  const body = content.slice(endIdx + 4).trim();
  return { frontmatter: fm, body };
}

function parseOpenAiYaml(content: string): { displayName?: string; shortDescription?: string } {
  const result: { displayName?: string; shortDescription?: string } = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("display_name:")) {
      result.displayName = trimmed.slice("display_name:".length).trim().replace(/^["']|["']$/g, "");
    } else if (trimmed.startsWith("short_description:")) {
      result.shortDescription = trimmed.slice("short_description:".length).trim().replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// openclaw.json helpers
// ---------------------------------------------------------------------------

type OpenClawConfig = {
  skills?: {
    entries?: Record<string, { enabled: boolean }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

async function readOpenClawConfig(): Promise<OpenClawConfig> {
  try {
    const raw = await fs.readFile(openClawConfigPath(), "utf-8");
    return JSON.parse(raw) as OpenClawConfig;
  } catch {
    return {};
  }
}

async function writeOpenClawConfig(config: OpenClawConfig): Promise<void> {
  const configPath = openClawConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

function getEnabledSkillsMap(config: OpenClawConfig): Record<string, { enabled: boolean }> {
  return config.skills?.entries ?? {};
}

// ---------------------------------------------------------------------------
// Directory helpers
// ---------------------------------------------------------------------------

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GitHub download helpers
// ---------------------------------------------------------------------------

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = { "User-Agent": "qorpera-skill-install" };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers["Authorization"] = `token ${token}`;
  return fetch(url, { headers });
}

// ---------------------------------------------------------------------------
// Installed skills discovery
// ---------------------------------------------------------------------------

/** Scan ~/.codex/skills/ for all installed skill directories. */
export async function discoverSkills(): Promise<SkillMeta[]> {
  const root = skillsDir();
  if (!(await dirExists(root))) return [];

  const enabledMap = getEnabledSkillsMap(await readOpenClawConfig());
  const skills: SkillMeta[] = [];

  const topEntries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of topEntries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".system") continue;
    const skillDir = path.join(root, entry.name);
    const meta = await readSkillDir(skillDir, entry.name, false, enabledMap);
    if (meta) skills.push(meta);
  }

  const systemDir = path.join(root, ".system");
  if (await dirExists(systemDir)) {
    const systemEntries = await fs.readdir(systemDir, { withFileTypes: true });
    for (const entry of systemEntries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(systemDir, entry.name);
      const meta = await readSkillDir(skillDir, entry.name, true, enabledMap);
      if (meta) skills.push(meta);
    }
  }

  return skills;
}

async function readSkillDir(
  skillDir: string,
  dirName: string,
  isSystem: boolean,
  enabledMap: Record<string, { enabled: boolean }>,
): Promise<SkillMeta | null> {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!(await fileExists(skillMdPath))) return null;

  const rawMd = await fs.readFile(skillMdPath, "utf-8");
  const { frontmatter, body } = parseSkillMd(rawMd);

  const name = (frontmatter.name as string) || dirName;

  let displayName = name;
  let shortDescription = "";
  const yamlPath = path.join(skillDir, "agents", "openai.yaml");
  if (await fileExists(yamlPath)) {
    const yamlContent = await fs.readFile(yamlPath, "utf-8");
    const parsed = parseOpenAiYaml(yamlContent);
    if (parsed.displayName) displayName = parsed.displayName;
    if (parsed.shortDescription) shortDescription = parsed.shortDescription;
  }

  const description = (frontmatter.description as string) || shortDescription || "";
  if (!shortDescription) shortDescription = description.slice(0, 120);

  const enabled = enabledMap[name]?.enabled ?? false;

  return {
    name,
    displayName,
    description,
    shortDescription,
    enabled,
    isSystem,
    path: skillDir,
    hasScripts: await dirExists(path.join(skillDir, "scripts")),
    hasReferences: await dirExists(path.join(skillDir, "references")),
    skillMdContent: body,
  };
}

// ---------------------------------------------------------------------------
// Catalog — available skills from openai/skills
// ---------------------------------------------------------------------------

/** Get the curated skills catalog, enriched with installed/enabled state. */
export async function getCatalog(): Promise<CatalogSkill[]> {
  const installed = await discoverSkills();
  const installedNames = new Set(installed.map((s) => s.name));
  const enabledMap = getEnabledSkillsMap(await readOpenClawConfig());

  return CURATED_CATALOG.map((c) => ({
    ...c,
    source: c.source,
    installed: installedNames.has(c.name),
    enabled: enabledMap[c.name]?.enabled ?? false,
  }));
}

/**
 * Fetch a live skill listing from GitHub API (optional — falls back to built-in catalog).
 * Returns directory names from openai/skills .curated path.
 */
export async function fetchLiveCatalogNames(): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${SKILLS_REPO}/contents/${CURATED_PATH}?ref=${SKILLS_REF}`;
    const res = await githubFetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ name: string; type: string }>;
    return data.filter((d) => d.type === "dir").map((d) => d.name).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Install a skill from the openai/skills repo
// ---------------------------------------------------------------------------

/**
 * Recursively download a directory from GitHub Contents API.
 * Fetches only the files for the specific skill rather than the entire repo.
 */
async function downloadGitHubDir(repo: string, repoPath: string, destDir: string): Promise<void> {
  const url = `https://api.github.com/repos/${repo}/contents/${repoPath}?ref=${SKILLS_REF}`;
  const res = await githubFetch(url);
  if (!res.ok) {
    throw new Error(`GitHub API error: HTTP ${res.status} for ${repoPath}`);
  }

  const entries = (await res.json()) as Array<{
    name: string;
    type: string;
    download_url: string | null;
    path: string;
  }>;

  await fs.mkdir(destDir, { recursive: true });

  for (const entry of entries) {
    const entryDest = path.join(destDir, entry.name);
    if (entry.type === "dir") {
      await downloadGitHubDir(repo, entry.path, entryDest);
    } else if (entry.type === "file" && entry.download_url) {
      const fileRes = await githubFetch(entry.download_url);
      if (!fileRes.ok) {
        throw new Error(`Failed to download ${entry.path}: HTTP ${fileRes.status}`);
      }
      const content = Buffer.from(await fileRes.arrayBuffer());
      await fs.writeFile(entryDest, content);
    }
  }
}

/**
 * Install a curated skill by downloading its files from the GitHub Contents API
 * to ~/.codex/skills/{skillName}.
 */
export async function installSkill(skillName: string): Promise<{ ok: boolean; error?: string }> {
  // Validate name
  if (!skillName || /[\/\\]/.test(skillName) || skillName === "." || skillName === "..") {
    return { ok: false, error: "Invalid skill name" };
  }

  const dest = path.join(skillsDir(), skillName);
  if (await dirExists(dest)) {
    return { ok: false, error: `Skill "${skillName}" is already installed` };
  }

  // Determine source repo from catalog entry
  const catalogEntry = CURATED_CATALOG.find((c) => c.name === skillName);
  const isAnthropic = catalogEntry?.source === "anthropic";
  const repo = isAnthropic ? ANTHROPIC_SKILLS_REPO : SKILLS_REPO;
  const basePath = isAnthropic ? ANTHROPIC_SKILLS_PATH : CURATED_PATH;

  try {
    const repoPath = `${basePath}/${skillName}`;

    // Verify the skill exists by checking the directory listing
    const checkUrl = `https://api.github.com/repos/${repo}/contents/${repoPath}?ref=${SKILLS_REF}`;
    const checkRes = await githubFetch(checkUrl);
    if (!checkRes.ok) {
      return { ok: false, error: `Skill "${skillName}" not found in curated catalog` };
    }

    // Download the skill directory recursively
    await downloadGitHubDir(repo, repoPath, dest);

    // Verify SKILL.md was downloaded
    if (!(await fileExists(path.join(dest, "SKILL.md")))) {
      await fs.rm(dest, { recursive: true, force: true });
      return { ok: false, error: `Skill "${skillName}" has no SKILL.md` };
    }

    // Auto-enable in openclaw.json
    await setSkillEnabled(skillName, true);

    return { ok: true };
  } catch (err: unknown) {
    // Cleanup partial download on error
    await fs.rm(dest, { recursive: true, force: true }).catch(() => {});
    return { ok: false, error: err instanceof Error ? err.message : "Install failed" };
  }
}

// ---------------------------------------------------------------------------
// Enable/disable
// ---------------------------------------------------------------------------

/** Toggle a skill enabled/disabled in openclaw.json. */
export async function setSkillEnabled(skillName: string, enabled: boolean): Promise<void> {
  const config = await readOpenClawConfig();
  if (!config.skills) config.skills = {};
  if (!config.skills.entries) config.skills.entries = {};
  config.skills.entries[skillName] = { enabled };
  await writeOpenClawConfig(config);
}

// ---------------------------------------------------------------------------
// Uninstall
// ---------------------------------------------------------------------------

/** Remove a skill from ~/.codex/skills/ and disable it in openclaw.json. */
export async function uninstallSkill(skillName: string): Promise<{ ok: boolean; error?: string }> {
  if (!skillName || /[\/\\]/.test(skillName) || skillName === "." || skillName === "..") {
    return { ok: false, error: "Invalid skill name" };
  }

  const dest = path.join(skillsDir(), skillName);
  if (!(await dirExists(dest))) {
    return { ok: false, error: `Skill "${skillName}" is not installed` };
  }

  try {
    await fs.rm(dest, { recursive: true, force: true });
    // Disable in config
    await setSkillEnabled(skillName, false);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Uninstall failed" };
  }
}

// ---------------------------------------------------------------------------
// Skill environment variables — DB-backed (encrypted), process.env fallback
// ---------------------------------------------------------------------------

/**
 * Returns env var keys with their set/unset status for the given user.
 * Checks DB credentials (via skill-credentials-store) first, then process.env.
 * Never returns actual values.
 */
export async function getSkillEnvVarStatus(
  userId: string,
): Promise<Array<{ key: string; isSet: boolean; keyLast4: string | null; isManaged: boolean }>> {
  const { getSkillCredentialStatus } = await import("@/lib/skill-credentials-store");
  const allVars = new Set<string>();
  for (const skill of CURATED_CATALOG) {
    for (const v of skill.requirements.envVars ?? []) {
      allVars.add(v);
    }
  }
  const varNames = [...allVars].sort();
  const statuses = await getSkillCredentialStatus(userId, varNames);
  return statuses.map((s) => ({ key: s.varName, isSet: s.isSet, keyLast4: s.keyLast4, isManaged: s.isManaged }));
}

/**
 * Get all decrypted skill env vars for a user (DB + process.env fallback).
 * SERVER-SIDE ONLY — never expose to client.
 */
export async function getSkillEnvVars(userId: string): Promise<Record<string, string>> {
  const { getDecryptedSkillEnvVars } = await import("@/lib/skill-credentials-store");
  const dbVars = await getDecryptedSkillEnvVars(userId);

  // Merge with process.env, DB takes precedence
  const allVars = new Set<string>();
  for (const skill of CURATED_CATALOG) {
    for (const v of skill.requirements.envVars ?? []) {
      allVars.add(v);
    }
  }
  const merged: Record<string, string> = {};
  for (const varName of allVars) {
    const val = dbVars[varName] ?? process.env[varName];
    if (val) merged[varName] = val;
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Readiness checks
// ---------------------------------------------------------------------------

export type SkillReadiness = {
  name: string;
  ready: boolean;
  missing: string[];
  notes?: string;
};

/** Check readiness for each installed + enabled skill. */
export async function checkSkillReadiness(userId: string): Promise<SkillReadiness[]> {
  const skills = await discoverSkills();
  const catalog = await getCatalog();
  const skillEnv = await getSkillEnvVars(userId);
  const results: SkillReadiness[] = [];

  for (const skill of skills) {
    if (!skill.enabled) continue;
    const catEntry = catalog.find((c) => c.name === skill.name);
    const req = catEntry?.requirements;
    if (!req) {
      results.push({ name: skill.name, ready: true, missing: [] });
      continue;
    }

    const missing: string[] = [];

    // Check env vars
    for (const envVar of req.envVars ?? []) {
      if (!skillEnv[envVar] && !process.env[envVar]) {
        missing.push(`env:${envVar}`);
      }
    }

    // Check CLI tools
    for (const tool of req.cliTools ?? []) {
      if (!(await isCliToolAvailable(tool))) {
        missing.push(`cli:${tool}`);
      }
    }

    // MCP skills — not supported in runner
    if (req.type === "mcp-required") {
      missing.push("mcp:not_supported");
    }

    results.push({
      name: skill.name,
      ready: missing.length === 0,
      missing,
      notes: req.notes,
    });
  }

  return results;
}

async function isCliToolAvailable(tool: string): Promise<boolean> {
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("which", [tool]);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Exported path helpers
// ---------------------------------------------------------------------------

/** Return the skills directory path for use by other modules. */
export function getSkillsDir(): string {
  return skillsDir();
}

// ---------------------------------------------------------------------------
// Prompt injection (enhanced)
// ---------------------------------------------------------------------------

export type SkillInjection = {
  name: string;
  content: string;
  skillDir: string;
  scripts: string[];
  envReady: string[];
};

/** Get enhanced skill content for all enabled, non-system skills (for prompt injection). */
export async function getEnabledSkillContents(userId: string): Promise<SkillInjection[]> {
  const skills = await discoverSkills();
  const catalog = await getCatalog();
  const skillEnv = await getSkillEnvVars(userId);
  const MAX_PER_SKILL = 4000;

  const results: SkillInjection[] = [];

  for (const s of skills) {
    if (!s.enabled || s.isSystem || !s.skillMdContent) continue;

    const catEntry = catalog.find((c) => c.name === s.name);
    const reqEnvVars = catEntry?.requirements?.envVars ?? [];

    // Discover scripts
    const scriptsDir = path.join(s.path, "scripts");
    let scripts: string[] = [];
    if (await dirExists(scriptsDir)) {
      const entries = await fs.readdir(scriptsDir);
      scripts = entries.filter((e) => !e.startsWith("."));
    }

    // Check which required env vars are available
    const envReady = reqEnvVars.filter((v) => Boolean(skillEnv[v] || process.env[v]));

    const content = s.skillMdContent.length > MAX_PER_SKILL
      ? s.skillMdContent.slice(0, MAX_PER_SKILL) + "\n[...truncated]"
      : s.skillMdContent;

    results.push({
      name: s.name,
      content,
      skillDir: s.path,
      scripts,
      envReady,
    });
  }

  // Merge user-created custom skills from DB
  try {
    const { getEnabledCustomSkills } = await import("@/lib/custom-skills-store");
    const customSkills = await getEnabledCustomSkills(userId);
    for (const cs of customSkills) {
      const content = cs.content.length > MAX_PER_SKILL
        ? cs.content.slice(0, MAX_PER_SKILL) + "\n[...truncated]"
        : cs.content;
      results.push({
        name: `custom:${cs.name}`,
        content,
        skillDir: "(custom skill)",
        scripts: [],
        envReady: [],
      });
    }
  } catch {
    // custom skills not available
  }

  return results;
}
