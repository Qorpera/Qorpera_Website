import { prisma } from "@/lib/db";
import { getAppPreferences } from "@/lib/settings-store";
import { getInboxItems } from "@/lib/inbox-store";
import { getProjectsForUser, getRunsForUser, getTemplates } from "@/lib/workspace-store";
import { UI_AGENTS } from "@/lib/workforce-ui";
import {
  checkManagedGuardrails,
  getProviderApiKeyRuntime,
  recordManagedUsage,
} from "@/lib/connectors-store";
import { companySoulForAdvisor, getCompanySoul } from "@/lib/company-soul-store";
import { getChiefAdvisorSoulPackForUser } from "@/lib/agent-soul";
import { getModelRoute } from "@/lib/model-routing-store";
import { listBusinessLogs } from "@/lib/business-logs-store";
import { listBusinessFiles, backfillMissingExtracts } from "@/lib/business-files-store";
import { semanticSearchFiles, SemanticSearchResult } from "@/lib/embedding-store";
import { getPreferredUsername } from "@/lib/usernames";
import { listRunnersForUser } from "@/lib/runner-control-plane";
import { getPlanStatus } from "@/lib/plan-store";
import { AGENT_HIRE_CATALOG } from "@/lib/agent-catalog";
import { getAppliedPatches } from "@/lib/optimizer/optimizer-store";

export type AdvisorMode = "home" | "new_project";

export type AdvisorDelegation = {
  toAgent: string;
  title: string;
  instructions: string;
};

export type AdvisorHire = {
  agentKind: string;
  reason: string;
};

export type AdvisorStructuredReply = {
  answer: string;
  priority: "low" | "medium" | "high";
  suggestedAgents: string[];
  onboardingSteps: string[];
  recommendedTemplate?: string;
  ownerFocus?: string[];
  delegatedTasks?: AdvisorDelegation[];
  hireAgents?: AdvisorHire[];
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function clampText(text: string, max = 5000) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function extractDataSignals(context: unknown): { hasCompanySoul: boolean; hiredAgentCount: number; projectCount: number } {
  if (typeof context !== "object" || !context) return { hasCompanySoul: false, hiredAgentCount: 0, projectCount: 0 };
  const ctx = context as Record<string, unknown>;
  return {
    hasCompanySoul: Boolean(ctx.hasCompanySoul),
    hiredAgentCount: Array.isArray(ctx.hiredAgentKinds) ? ctx.hiredAgentKinds.length : 0,
    projectCount: typeof ctx.projectCount === "number" ? ctx.projectCount : 0,
  };
}

function extractPlanContext(context: unknown): { planName: string | null; tier: string | null; agentCap: number; hiredCount: number; slotsAvailable: number } | null {
  if (typeof context !== "object" || !context || !("planContext" in context)) return null;
  return (context as { planContext: { planName: string | null; tier: string | null; agentCap: number; hiredCount: number; slotsAvailable: number } | null }).planContext;
}

function extractAppliedOptimizations(context: unknown): string | null {
  if (
    typeof context === "object" &&
    context &&
    "appliedOptimizationPatches" in context &&
    typeof (context as { appliedOptimizationPatches?: string | null }).appliedOptimizationPatches === "string"
  ) {
    return (context as { appliedOptimizationPatches: string }).appliedOptimizationPatches;
  }
  return null;
}

function extractMaxTokens(context: unknown): number {
  if (typeof context === "object" && context && "maxAgentOutputTokens" in context) {
    const val = (context as { maxAgentOutputTokens?: number }).maxAgentOutputTokens;
    if (typeof val === "number") return val;
  }
  return 8192;
}

function extractJsonObject(input: string): string | null {
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return input.slice(first, last + 1);
}

/* ── Relevance-based retrieval helpers ─────────────────────────── */

const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","can","shall",
  "to","of","in","for","on","with","at","by","from","as","into","about","between",
  "through","during","before","after","above","below","it","its","this","that",
  "these","those","i","me","my","we","our","you","your","he","she","they","them",
  "their","what","which","who","when","where","how","why","all","each","every",
  "both","few","more","most","other","some","such","no","not","only","own","same",
  "so","than","too","very","just","also","and","or","but","if","then","else",
  "because","until","while","up","out","any","there","here","tell","know","show",
  "give","get","make","see","look","find","read","say","think","want","need",
]);

function extractSearchTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreRelevance(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const lower = text.toLowerCase();
  return terms.reduce((s, t) => s + (lower.includes(t) ? 1 : 0), 0);
}

type LogSummary = {
  title: string;
  category: string;
  source: string;
  author: string | null;
  relatedRef: string | null;
  createdAt: string;
  body: string;
};

type FileSummary = {
  name: string;
  category: string;
  source: string;
  mimeType: string | null;
  sizeBytes: number;
  author: string | null;
  relatedRef: string | null;
  createdAt: string;
  textExtract: string | null;
};

function buildSmartPayload(
  context: Record<string, unknown>,
  userMessage: string,
  opts: {
    mode: AdvisorMode;
    projectDescription?: string;
    history: ChatTurn[];
    charLimit: number;
    semanticResults?: SemanticSearchResult[];
  },
): string {
  const terms = extractSearchTerms(userMessage);
  const logs = (context.businessLogs ?? []) as LogSummary[];
  const files = (context.businessFiles ?? []) as FileSummary[];

  // --- Score & sort logs ---
  const scoredLogs = logs.map((log) => ({
    log,
    score: scoreRelevance(`${log.title} ${log.body}`, terms),
  }));
  scoredLogs.sort((a, b) => b.score - a.score || new Date(b.log.createdAt).getTime() - new Date(a.log.createdAt).getTime());

  const smartLogs: unknown[] = [];
  let relevantLogCount = 0;
  for (const { log, score } of scoredLogs) {
    if (score > 0) {
      // Relevant: generous content (up to 4000 chars)
      relevantLogCount++;
      smartLogs.push({
        ...log,
        body: log.body.length > 4000 ? log.body.slice(0, 4000) + "…" : log.body,
      });
    } else if (smartLogs.length < relevantLogCount + 25) {
      // Recent non-relevant: moderate content (up to 800 chars)
      smartLogs.push({
        ...log,
        body: log.body.length > 800 ? log.body.slice(0, 800) + "…" : log.body,
      });
    } else {
      // Rest: metadata only so advisor knows it exists
      smartLogs.push({
        title: log.title,
        category: log.category,
        source: log.source,
        createdAt: log.createdAt,
      });
    }
  }

  // --- Score & sort files ---
  // Build a semantic similarity map keyed by fileId (similarity > 0.3 threshold)
  const semanticMap = new Map<string, number>();
  if (opts.semanticResults && opts.semanticResults.length > 0) {
    for (const r of opts.semanticResults) {
      if (r.similarity > 0.3) semanticMap.set(r.fileId, r.similarity);
    }
  }

  // Look up fileId from context (businessFiles array may include id field)
  type FileSummaryWithId = FileSummary & { id?: string };
  const filesWithId = files as FileSummaryWithId[];

  const scoredFiles = filesWithId.map((file) => {
    const semanticSim = file.id ? (semanticMap.get(file.id) ?? null) : null;
    const keywordScore = scoreRelevance(`${file.name} ${file.textExtract ?? ""}`, terms);
    return {
      file,
      // Semantic wins when available; otherwise fall back to keyword
      score: semanticSim !== null ? semanticSim * 10 : keywordScore,
      isSemantic: semanticSim !== null,
    };
  });
  scoredFiles.sort((a, b) => b.score - a.score || new Date(b.file.createdAt).getTime() - new Date(a.file.createdAt).getTime());

  const smartFiles: unknown[] = [];
  let relevantFileCount = 0;
  for (const { file, score, isSemantic } of scoredFiles) {
    // A file is "relevant" if it has a keyword hit OR a semantic match above threshold
    const isRelevant = isSemantic || score > 0;
    if (isRelevant) {
      relevantFileCount++;
      // For semantic hits, inject the best-matching chunk as the excerpt
      const semanticExcerpt = isSemantic && file.id
        ? (opts.semanticResults?.find((r) => r.fileId === file.id)?.excerpt ?? null)
        : null;
      smartFiles.push({
        ...file,
        textExtract: semanticExcerpt
          ? semanticExcerpt
          : file.textExtract
            ? file.textExtract.length > 6000
              ? file.textExtract.slice(0, 6000) + "…"
              : file.textExtract
            : null,
      });
    } else if (smartFiles.length < relevantFileCount + 20) {
      smartFiles.push({
        ...file,
        textExtract: file.textExtract
          ? file.textExtract.length > 1500
            ? file.textExtract.slice(0, 1500) + "…"
            : file.textExtract
          : null,
      });
    } else {
      smartFiles.push({
        name: file.name,
        category: file.category,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt,
      });
    }
  }

  // Build payload with business context FIRST so it survives truncation
  const smartContext = { ...context, businessLogs: smartLogs, businessFiles: smartFiles };
  const payload = {
    businessContext: smartContext,
    mode: opts.mode,
    projectDescription: opts.projectDescription,
    message: userMessage,
    history: opts.history.slice(-8),
  };

  return clampText(JSON.stringify(payload), opts.charLimit);
}

function safeParseStructured(text: string): AdvisorStructuredReply | null {
  try {
    const candidate = extractJsonObject(text) ?? text;
    const parsed = JSON.parse(candidate) as Partial<AdvisorStructuredReply>;
    if (!parsed.answer || typeof parsed.answer !== "string") {
      return {
        answer: clampText(text.trim(), 2200),
        priority: "medium",
        suggestedAgents: [],
        onboardingSteps: [],
        ownerFocus: [],
      };
    }
    const delegatedTasks = Array.isArray((parsed as { delegatedTasks?: unknown }).delegatedTasks)
      ? ((parsed as { delegatedTasks: unknown[] }).delegatedTasks)
          .filter((t): t is { toAgent: string; title: string; instructions: string } =>
            typeof t === "object" && t !== null &&
            typeof (t as Record<string, unknown>).toAgent === "string" &&
            typeof (t as Record<string, unknown>).title === "string" &&
            typeof (t as Record<string, unknown>).instructions === "string",
          )
          .slice(0, 3)
          .map((t) => ({ toAgent: t.toAgent.toUpperCase(), title: t.title.slice(0, 240), instructions: t.instructions.slice(0, 12000) }))
      : undefined;

    const hireAgents = Array.isArray((parsed as { hireAgents?: unknown }).hireAgents)
      ? ((parsed as { hireAgents: unknown[] }).hireAgents)
          .filter((h): h is { agentKind: string; reason: string } =>
            typeof h === "object" && h !== null &&
            typeof (h as Record<string, unknown>).agentKind === "string",
          )
          .slice(0, 4)
          .map((h) => ({ agentKind: (h.agentKind as string).toUpperCase(), reason: typeof h.reason === "string" ? h.reason.slice(0, 200) : "" }))
      : undefined;

    return {
      answer: parsed.answer,
      priority:
        parsed.priority === "low" || parsed.priority === "medium" || parsed.priority === "high"
          ? parsed.priority
          : "medium",
      suggestedAgents: Array.isArray(parsed.suggestedAgents)
        ? parsed.suggestedAgents.filter((v): v is string => typeof v === "string").slice(0, 8)
        : [],
      onboardingSteps: Array.isArray(parsed.onboardingSteps)
        ? parsed.onboardingSteps.filter((v): v is string => typeof v === "string").slice(0, 10)
        : [],
      recommendedTemplate: typeof parsed.recommendedTemplate === "string" ? parsed.recommendedTemplate : undefined,
      ownerFocus: Array.isArray(parsed.ownerFocus)
        ? parsed.ownerFocus.filter((v): v is string => typeof v === "string").slice(0, 5)
        : [],
      ...(delegatedTasks?.length ? { delegatedTasks } : {}),
      ...(hireAgents?.length ? { hireAgents } : {}),
    };
  } catch {
    const plain = text.trim();
    if (!plain) return null;
    return {
      answer: clampText(plain, 2200),
      priority: "medium",
      suggestedAgents: [],
      onboardingSteps: [],
      ownerFocus: [],
    };
  }
}

async function buildRunnerContext(userId: string) {
  const [runners, pendingJobs] = await Promise.all([
    listRunnersForUser(userId),
    prisma.runnerJob.findMany({
      where: { userId, status: "NEEDS_APPROVAL" },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { id: true, title: true, jobType: true, riskLevel: true },
    }),
  ]);
  return {
    onlineRunnerCount: runners.filter((r) => r.status === "ONLINE").length,
    pendingApprovalCount: await prisma.runnerJob.count({ where: { userId, status: "NEEDS_APPROVAL" } }),
    pendingJobs: pendingJobs.map((j) => ({ id: j.id, title: j.title, jobType: j.jobType, riskLevel: j.riskLevel })),
  };
}

function advisorSystemPrompt(
  ownerUsername: string,
  chiefAdvisorSoulPrompt?: string | null,
  runnerContext?: { onlineRunnerCount: number; pendingApprovalCount: number } | null,
  recentlyOnboarded?: boolean,
  dataSignals?: { hasCompanySoul: boolean; hiredAgentCount: number; projectCount: number },
  planContext?: { planName: string | null; tier: string | null; agentCap: number; hiredCount: number; slotsAvailable: number } | null,
  appliedOptimizations?: string | null,
) {
  const runnerLines = runnerContext && runnerContext.onlineRunnerCount > 0
    ? ["", "RUNNER_CAPABILITIES", "When a runner is online you can ask to execute local commands or read/write files — these go through the runner approval queue."]
    : [];

  const signals = dataSignals ?? { hasCompanySoul: false, hiredAgentCount: 0, projectCount: 0 };
  const isEmptyWorkspace = !signals.hasCompanySoul || (signals.hiredAgentCount === 0 && signals.projectCount === 0);

  const planLines: string[] = [];
  if (planContext?.planName) {
    planLines.push(
      "",
      "PLAN_CONTEXT",
      `The user is on the ${planContext.planName} plan (${planContext.tier} tier).`,
      `Agent capacity: ${planContext.hiredCount}/${planContext.agentCap} slots used, ${planContext.slotsAvailable} available.`,
    );
    if (planContext.slotsAvailable > 0) {
      planLines.push(
        "The user has unused agent slots. When relevant, proactively recommend which agents to activate based on their Company Soul data (departments, goals, workflows).",
        "Example: \"Based on your mission and departments, I'd recommend activating the Sales Rep and Marketing Coordinator agents. You have N slots available.\"",
      );
    }
  } else {
    planLines.push(
      "",
      "PLAN_CONTEXT",
      "The user does not have an active plan. They can subscribe at /pricing to start hiring AI agents.",
    );
  }

  const onboardingLines = recentlyOnboarded || isEmptyWorkspace
    ? [
        "",
        "ONBOARDING_CONTEXT",
        ...(recentlyOnboarded ? ["This user just completed setup. Be welcoming."] : []),
        ...(!signals.hasCompanySoul ? ["Company Soul is empty or incomplete — ask the user to fill it in before making business-specific recommendations."] : []),
        ...(signals.hiredAgentCount === 0 && planContext?.planName ? ["No agents have been activated yet. Recommend agents based on Company Soul."] : []),
        ...(signals.hiredAgentCount === 0 && !planContext?.planName ? ["No agents have been hired yet. Suggest subscribing to a plan at /pricing."] : []),
        ...(signals.projectCount === 0 ? ["No projects exist yet. Suggest creating a first project or using a template."] : []),
      ]
    : [];

  return [
    "ROLE_IDENTITY",
    "You are Qorpera Business Advisor: the operator-level AI advisor for this business owner.",
    "You are not a generic chatbot. Your job is to improve business performance by prioritizing work, designing agent roles, and staging safe automation rollout.",
    chiefAdvisorSoulPrompt
      ? `You are the default advisor agent named Chief Advisor. Use this soul and memory as your operating identity:\n\n${chiefAdvisorSoulPrompt}`
      : "Operate as the default advisor agent for this workspace.",
    "",
    "CORE_MANDATE",
    "Optimize for business outcomes, speed of learning, and safe execution.",
    "Recommend the minimum viable agent workforce needed to move the business forward this week.",
    "Prefer specific actions over abstract advice.",
    "",
    "OPERATING_POLICY",
    "Use Company Soul as the source of truth for mission, goals, constraints, departments, approvals, and KPIs.",
    "Use Business Logs and business files as recent operational memory (facts, outputs, documents, financial updates, collaboration notes).",
    "Use inbox/review pressure, active runs, and project health to decide what matters now.",
    "Bias toward clearing bottlenecks and preserving approvals for risky external actions.",
    "If a critical assumption is missing, state it explicitly and make a safe default assumption.",
    "Do not give generic brainstorming lists when a prioritized recommendation is possible.",
    "",
    "GROUNDING RULES (CRITICAL — violations erode trust)",
    "Your knowledge of this business comes ONLY from the data fields in the businessContext JSON below.",
    "Do NOT invent, fabricate, or hallucinate any information. Specifically:",
    "- Do NOT invent recent activity, active workflows, anomalies, pending actions, or statistics that are not in the context data.",
    "- Do NOT describe agents as running, active, or operational unless there is evidence in 'runs' or 'recentSubmissions'.",
    "- Do NOT fabricate file contents. If a file's textExtract is null or truncated, say so — do not guess what it contains.",
    "- Do NOT make up timestamps, counts, or metrics. Only quote numbers that appear in the context.",
    "If Company Soul is empty or incomplete, say so directly — do not infer business details.",
    "If no agents are hired (agents list is empty), say so — do not describe agents as available.",
    "If businessLogs and businessFiles arrays are empty, the business has no recorded operational history yet.",
    "Business logs and files are ranked by relevance to the user's message — the most relevant entries appear first with full content. Other entries may have abbreviated or metadata-only content.",
    "Never conflate project templates (available options) with active projects (user-created work).",
    "When you don't know something, say \"I don't have that information yet\" rather than guessing.",
    "When the user asks you to read or summarize a file or log, use the actual body/textExtract content provided in the context. If the content is truncated, say so.",
    "",
    "DELEGATION",
    "You can delegate work to hired agents. When the user asks you to DO something (write, draft, research, analyze, plan, review, etc.), delegate it to the right agent.",
    "You may delegate to multiple agents in one response if the request spans domains.",
    "Only delegate when the user clearly wants work done — not for simple questions or advice.",
    "Write clear, specific instructions for the agent. Include all relevant context from the conversation.",
    "Only delegate to agents that appear in the agents list in the context. If no agents are hired, you cannot delegate.",
    "",
    "AGENT ROUTING TABLE — choose the best match:",
    "- ASSISTANT: General triage, research, drafting, data gathering. Delegates to specialists when needed. Use when no domain agent fits or for multi-step tasks that start with research.",
    "- SALES_REP: Prospect research, ICP scoring, personalized outreach drafts, pipeline logging. Hands off conversions to CS. Use for anything involving leads, prospecting, or sales pipeline.",
    "- CUSTOMER_SUCCESS: Customer health monitoring, churn risk assessment, renewal prep, retention outreach. Use for existing customer work, account reviews, or at-risk escalations.",
    "- MARKETING_COORDINATOR: Brand-voice content creation, campaign analysis (leads with business impact metrics), Figma design review. Use for content, campaigns, or brand work. Nothing publishes without approval.",
    "- FINANCE_ANALYST: Financial analysis with verification workflow, anomaly detection (flags >20% deviations), structured table output. Read-only — no external actions. Use for budgets, reporting, or number-crunching.",
    "- OPERATIONS_MANAGER: SOP maintenance (versioned), vendor SLA tracking, blocker identification with impact assessment, cross-team delegation. Use for process, ops, logistics, or vendor work.",
    "- EXECUTIVE_ASSISTANT: Inbox triage (Critical/Today/This Week/FYI), meeting briefs, action item tracking with owners and due dates. Use for admin, scheduling, triage, or executive prep. Treats all info as confidential.",
    "",
    "HIRING",
    "You can hire agents directly by including the 'hireAgents' field in your JSON response.",
    "CRITICAL: When the user explicitly asks to hire, add, activate, or set up an agent — you MUST include that agent in hireAgents. Do NOT just say you are hiring it in the answer field without also including it in hireAgents. The answer text alone does nothing; only hireAgents triggers the actual hire.",
    "Only hire agents from the hireableAgents list in the context. Do NOT include agents already in the agents list.",
    planContext && planContext.slotsAvailable > 0
      ? `There are ${planContext.slotsAvailable} open slot(s) on the current plan. You may hire up to ${planContext.slotsAvailable} more agent(s).`
      : planContext && planContext.agentCap > 0
        ? "The agent cap is full. Tell the user to deactivate an agent or upgrade the plan before hiring."
        : "No active plan detected — hiring is disabled. Tell the user to subscribe at /pricing.",
    "",
    "STYLE",
    "Lead with the action or recommendation — no preamble, no filler.",
    "Keep the 'answer' field to 1-3 sentences for simple questions, max 4-5 for complex ones. Let suggestedAgents, ownerFocus, and onboardingSteps carry the supporting detail.",
    "Sound like a sharp chief of staff, not a motivational coach. State what to do, why it matters (risk, throughput, cost, customer impact), and move on.",
    "Never repeat information that's already in the structured fields.",
    `When addressing the owner directly, call them @${ownerUsername}.`,
    "",
    "OUTPUT_CONTRACT",
    "Respond ONLY with valid JSON using this shape:",
    '{"answer":"string","priority":"low|medium|high","suggestedAgents":["..."],"onboardingSteps":["..."],"recommendedTemplate":"optional-template-slug","ownerFocus":["..."],"delegatedTasks":[{"toAgent":"ASSISTANT|SALES_REP|CUSTOMER_SUCCESS|MARKETING_COORDINATOR|FINANCE_ANALYST|OPERATIONS_MANAGER|EXECUTIVE_ASSISTANT","title":"short task title","instructions":"detailed instructions for the agent"}],"hireAgents":[{"agentKind":"AGENT_KIND","reason":"one-sentence reason"}]}',
    "delegatedTasks is optional — only include it when you are actually delegating work to an agent.",
    "hireAgents is optional — only include it when hiring is warranted and slots are available.",
    ...runnerLines,
    ...planLines,
    ...onboardingLines,
    ...(appliedOptimizations
      ? ["", "APPLIED_OPTIMIZATIONS", "The following evidence-based improvements have been validated and applied to enhance your performance:", appliedOptimizations]
      : []),
  ].join("\n");
}

export async function buildAdvisorContext(userId: string) {
  const [projects, runs, inboxItems, prefs, agents, submissions, companySoul, chiefAdvisorSoul, businessLogs, businessFiles, owner, runnerContext, hiredJobs, planStatus, appliedOptimizationPatches] = await Promise.all([
    getProjectsForUser(userId),
    getRunsForUser(userId),
    getInboxItems(userId),
    getAppPreferences(userId),
    prisma.agent.findMany({ orderBy: { kind: "asc" } }),
    prisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    getCompanySoul(userId),
    getChiefAdvisorSoulPackForUser(userId),
    listBusinessLogs(userId, 200, { excludeChatLogs: true }),
    listBusinessFiles(userId, 100),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true, onboardedAt: true } }),
    buildRunnerContext(userId).catch(() => null),
    prisma.hiredJob.findMany({ where: { userId, enabled: true }, select: { agentKind: true }, distinct: ["agentKind"] }),
    getPlanStatus(userId),
    getAppliedPatches(userId, "CHIEF_ADVISOR").catch(() => null),
  ]);

  // Backfill text extracts for files uploaded before extraction was enabled
  await backfillMissingExtracts(businessFiles);

  // Check if the user was onboarded within the last 24 hours
  const recentlyOnboarded = owner?.onboardedAt
    ? Date.now() - new Date(owner.onboardedAt).getTime() < 24 * 60 * 60 * 1000
    : false;
  const ownerUsername = getPreferredUsername({ email: owner?.email, username: owner?.username });

  const inboxSummary = {
    approvals: inboxItems.filter((i) => i.type === "approval" && i.state !== "approved").length,
    incidents: inboxItems.filter((i) => i.type === "incident" && i.state !== "paused").length,
    drafts: inboxItems.filter((i) => i.type === "draft").length,
  };

  // Only include agents that the user has actually hired
  const hiredKinds = new Set(hiredJobs.map((j) => j.agentKind));
  const hiredAgents = UI_AGENTS.filter((a) => hiredKinds.has(a.kind));

  // Agents available to hire (not yet hired)
  const slotsAvailable = Math.max(0, (planStatus.agentCap ?? 0) - (planStatus.hiredCount ?? 0));
  const hireableAgents = AGENT_HIRE_CATALOG
    .filter((a) => !hiredKinds.has(a.kind as Parameters<typeof hiredKinds.has>[0]))
    .map((a) => ({ kind: a.kind, title: a.title, subtitle: a.subtitle }));

  const soulData = companySoulForAdvisor(companySoul);
  const hasCompanySoul = Boolean(soulData.companyName || soulData.mission);

  return {
    owner: { username: ownerUsername },
    hasCompanySoul,
    hiredAgentKinds: Array.from(hiredKinds),
    slotsAvailable,
    hireableAgents,
    maxAgentOutputTokens: prefs.maxAgentOutputTokens,
    projectCount: projects.length,
    businessLogCount: businessLogs.length,
    businessFileCount: businessFiles.length,
    projects: projects.map((p) => ({
      name: p.name,
      goal: p.goal,
      health: p.workforceHealth,
      taskCounts: p.board.map((c) => ({ column: c.title, count: c.cards.length })),
      recentTimeline: p.timeline.slice(0, 4),
    })),
    runs,
    inboxSummary,
    agents: hiredAgents.map((a) => ({
      kind: a.kind,
      name: agents.find((db) => db.kind === a.kind)?.name ?? a.name,
      username: agents.find((db) => db.kind === a.kind)?.username ?? a.username,
      role: a.role,
      capabilities: a.capabilities,
      autonomy: a.autonomy,
    })),
    recentSubmissions: submissions.map((s) => ({
      title: s.title,
      status: s.status,
      agentKind: s.agentKind,
    })),
    companySoul: soulData,
    businessLogs: businessLogs.map((row) => ({
      title: row.title,
      category: row.category,
      source: row.source,
      author: row.authorLabel,
      relatedRef: row.relatedRef,
      createdAt: row.createdAt.toISOString(),
      body: row.body,
    })),
    businessFiles: businessFiles.map((row) => ({
      name: row.name,
      category: row.category,
      source: row.source,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      author: row.authorLabel,
      relatedRef: row.relatedRef,
      createdAt: row.createdAt.toISOString(),
      textExtract: row.textExtract,
    })),
    // chiefAdvisorSoul prompt is injected into system prompt directly — not duplicated in context JSON
    chiefAdvisorSoulPromptText: chiefAdvisorSoul?.promptText ?? null,
    appliedOptimizationPatches: appliedOptimizationPatches ?? null,
    runnerState: runnerContext
      ? {
          onlineRunnerCount: runnerContext.onlineRunnerCount,
          pendingApprovalCount: runnerContext.pendingApprovalCount,
          pendingJobs: runnerContext.pendingJobs,
        }
      : null,
    recentlyOnboarded,
    planContext: planStatus.plan
      ? {
          planName: planStatus.plan.name,
          tier: planStatus.plan.tier,
          agentCap: planStatus.agentCap,
          hiredCount: planStatus.hiredCount,
          slotsAvailable: planStatus.agentCap - planStatus.hiredCount,
        }
      : null,
  };
}

function heuristicAdvisorReply({
  mode,
  userMessage,
  projectDescription,
  ownerUsername,
}: {
  mode: AdvisorMode;
  userMessage: string;
  projectDescription?: string;
  ownerUsername: string;
}): AdvisorStructuredReply {
  const text = `${userMessage} ${projectDescription ?? ""}`.toLowerCase();
  const mentionsSupport = /(support|ticket|customer|inbox|triage|csat)/.test(text);
  const mentionsSales = /(sales|outbound|lead|prospect|crm)/.test(text);
  const mentionsFinance = /(finance|contract|invoice|redline|vendor)/.test(text);
  const mentionsContent = /(content|blog|draft|publish|campaign)/.test(text);

  let recommendedTemplate = "weekly-kpi-report";
  let suggestedAgents = ["FINANCE_ANALYST", "OPERATIONS_MANAGER"];
  let focus = ["Clear approval gates for external actions", "Define success metric for the first 2 weeks"];

  if (mentionsSupport) {
    recommendedTemplate = "customer-support-triage";
    suggestedAgents = ["CUSTOMER_SUCCESS", "ASSISTANT", "EXECUTIVE_ASSISTANT"];
    focus = ["Reduce backlog by urgency", "Keep outbound messages approval-gated", "Measure first-response time and CSAT"];
  } else if (mentionsSales) {
    recommendedTemplate = "outbound-sales-research";
    suggestedAgents = ["SALES_REP", "ASSISTANT", "OPERATIONS_MANAGER"];
    focus = ["Avoid automatic sends at first", "Define ICP and scoring rules", "Audit enrichment quality daily"];
  } else if (mentionsFinance) {
    recommendedTemplate = "contract-review-redlines";
    suggestedAgents = ["FINANCE_ANALYST", "ASSISTANT", "OPERATIONS_MANAGER"];
    focus = ["No irreversible external actions", "Escalate low-confidence clauses", "Track turnaround time"];
  } else if (mentionsContent) {
    recommendedTemplate = "content-pipeline";
    suggestedAgents = ["MARKETING_COORDINATOR", "ASSISTANT", "EXECUTIVE_ASSISTANT"];
    focus = ["Human approval before publish", "Enforce source attribution", "Keep workflow stages explicit"];
  }

  return {
    answer:
      mode === "new_project"
        ? `@${ownerUsername}, start with a safe template, then narrow scope to one measurable outcome for week one. I’d set approvals on all external actions until the first successful run cycle is reviewed.`
        : `@${ownerUsername}, your highest-leverage move is to clear review bottlenecks first, then expand automation in the busiest workflow. I’d prioritize approvals and one high-volume project with clear success metrics.`,
    priority: "high",
    suggestedAgents,
    onboardingSteps: [
      "Define the project goal in one sentence",
      "Choose a template and keep default safety permissions",
      "Set autonomy to Execute with approval",
      "Run one pilot batch and review outcomes in Inbox",
      "Promote only proven steps to broader automation",
    ],
    recommendedTemplate,
    ownerFocus: focus,
  };
}

async function callOpenAIAdvisor({
  userId,
  mode,
  userMessage,
  projectDescription,
  history,
  context,
}: {
  userId: string;
  mode: AdvisorMode;
  userMessage: string;
  projectDescription?: string;
  history: ChatTurn[];
  context: unknown;
}): Promise<AdvisorStructuredReply | null> {
  const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
  const apiKey = runtime.apiKey;
  if (!apiKey) return null;

  if (runtime.mode === "MANAGED") {
    const guardrails = await checkManagedGuardrails(userId, "OPENAI");
    if (!guardrails.allowed) return null;
  }

  const route = await getModelRoute(userId, "ADVISOR");
  const model = route.provider === "OPENAI" ? route.modelName : process.env.OPENAI_ADVISOR_MODEL ?? "gpt-4.1-mini";
  const chiefAdvisorSoulPrompt =
    typeof context === "object" &&
    context &&
    "chiefAdvisorSoulPromptText" in context &&
    typeof (context as { chiefAdvisorSoulPromptText?: string | null }).chiefAdvisorSoulPromptText === "string"
      ? (context as { chiefAdvisorSoulPromptText: string }).chiefAdvisorSoulPromptText
      : null;
  const ownerUsername =
    typeof context === "object" &&
    context &&
    "owner" in context &&
    typeof (context as { owner?: { username?: string } }).owner?.username === "string"
      ? (context as { owner: { username: string } }).owner.username
      : "owner";
  const runnerCtx =
    typeof context === "object" &&
    context &&
    "runnerState" in context
      ? (context as { runnerState?: { onlineRunnerCount: number; pendingApprovalCount: number } | null }).runnerState
      : null;
  const isRecentlyOnboarded =
    typeof context === "object" &&
    context &&
    "recentlyOnboarded" in context
      ? Boolean((context as { recentlyOnboarded?: boolean }).recentlyOnboarded)
      : false;
  const dataSignals = extractDataSignals(context);
  const planCtx = extractPlanContext(context);
  const appliedOpts = extractAppliedOptimizations(context);
  const systemPrompt = advisorSystemPrompt(ownerUsername, chiefAdvisorSoulPrompt, runnerCtx, isRecentlyOnboarded, dataSignals, planCtx, appliedOpts);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildSmartPayload(context as Record<string, unknown>, userMessage, {
                mode,
                projectDescription,
                history,
                charLimit: 120_000,
              }),
            },
          ],
        },
      ],
      max_output_tokens: extractMaxTokens(context),
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { error?: { message?: string; type?: string; code?: string } }
      | null;
    const message = err?.error?.message?.trim();
    const code = err?.error?.code?.trim();
    const type = err?.error?.type?.trim();
    throw new Error(
      [message, code ? `code=${code}` : null, type ? `type=${type}` : null]
        .filter(Boolean)
        .join(" | ") || `OpenAI request failed (${response.status})`,
    );
  }
  const data = (await response.json().catch(() => null)) as
    | {
        output_text?: string;
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
      }
    | null;
  if (!data) return null;

  const text =
    data.output_text ??
    data.output
      ?.flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text" || typeof c.text === "string")
      .map((c) => c.text ?? "")
      .join("\n");

  if (!text) return null;
  if (runtime.mode === "MANAGED") {
    await recordManagedUsage(userId, "OPENAI", { requestCount: 1, estimatedUsd: 0.02 });
  }
  return safeParseStructured(text);
}


export async function runAdvisorChat(input: {
  userId: string;
  mode: AdvisorMode;
  userMessage: string;
  history?: ChatTurn[];
  projectDescription?: string;
}) {
  const context = await buildAdvisorContext(input.userId);
  const selectedRoute = await getModelRoute(input.userId, "ADVISOR");
  let providerError: string | null = null;

  const cloudReply = await callOpenAIAdvisor({
    userId: input.userId,
    mode: input.mode,
    userMessage: input.userMessage,
    projectDescription: input.projectDescription,
    history: input.history ?? [],
    context,
  }).catch((e: unknown) => {
    providerError = e instanceof Error ? e.message : "Provider request failed";
    return null;
  });

  const reply =
    cloudReply ??
    heuristicAdvisorReply({
      mode: input.mode,
      userMessage: input.userMessage,
      projectDescription: input.projectDescription,
      ownerUsername:
        typeof context === "object" &&
        context &&
        "owner" in context &&
        typeof (context as { owner?: { username?: string } }).owner?.username === "string"
          ? (context as { owner: { username: string } }).owner.username
          : "owner",
    });

  // Normalize recommended template to existing slugs if the model returns a display name.
  if (reply.recommendedTemplate) {
    const templates = await getTemplates();
    const bySlug = new Set(templates.map((t) => t.slug));
    if (!bySlug.has(reply.recommendedTemplate)) {
      const matched = templates.find((t) => t.name.toLowerCase() === reply.recommendedTemplate?.toLowerCase());
      if (matched) reply.recommendedTemplate = matched.slug;
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      scope: "ADVISOR",
      entityId: input.mode,
      action: "CHAT",
      summary: `Advisor chat (${input.mode}): ${input.userMessage.slice(0, 120)}`,
      metadata: JSON.stringify({
        mode: input.mode,
        recommendedTemplate: reply.recommendedTemplate,
        priority: reply.priority,
      }),
    },
  });

  const source = cloudReply ? ("openai" as const) : ("fallback" as const);

  const warning =
    source === "fallback"
      ? `${selectedRoute.provider} route failed for model "${selectedRoute.modelName}". ${providerError ?? "Check that your managed API key is configured."}`
      : null;

  return {
    reply,
    context,
    source,
    runtime: {
      selectedProvider: selectedRoute.provider,
      selectedModel: selectedRoute.modelName,
      warning,
    },
  };
}
