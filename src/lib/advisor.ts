import { prisma } from "@/lib/db";
import { getAppPreferences } from "@/lib/settings-store";
import { getInboxItems } from "@/lib/inbox-store";
import { ensureWorkspaceSeeded, getProjectsForUser, getRunsForUser, getTemplates } from "@/lib/workspace-store";
import { UI_AGENTS } from "@/lib/workforce-ui";
import {
  checkManagedGuardrails,
  getProviderApiKeyRuntime,
  recordManagedUsage,
} from "@/lib/connectors-store";
import { companySoulForAdvisor, getCompanySoul } from "@/lib/company-soul-store";
import { getAgentSoulBlueprintsForAdvisor, getChiefAdvisorSoulPackForUser } from "@/lib/agent-soul";
import { getModelRoute } from "@/lib/model-routing-store";
import { listBusinessLogs, summarizeBusinessLogsForAdvisor } from "@/lib/business-logs-store";
import { listBusinessFiles, summarizeBusinessFilesForAdvisor } from "@/lib/business-files-store";
import { postOllamaJson } from "@/lib/ollama";
import { getPreferredUsername } from "@/lib/usernames";
import { listRunnersForUser } from "@/lib/runner-control-plane";

export type AdvisorMode = "home" | "new_project";

export type AdvisorDelegation = {
  toAgent: string;
  title: string;
  instructions: string;
};

export type AdvisorStructuredReply = {
  answer: string;
  priority: "low" | "medium" | "high";
  suggestedAgents: string[];
  onboardingSteps: string[];
  recommendedTemplate?: string;
  ownerFocus?: string[];
  delegatedTasks?: AdvisorDelegation[];
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function clampText(text: string, max = 5000) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function extractMaxTokens(context: unknown): number {
  if (typeof context === "object" && context && "preferences" in context) {
    const prefs = (context as { preferences?: { maxAgentOutputTokens?: number } }).preferences;
    if (typeof prefs?.maxAgentOutputTokens === "number") return prefs.maxAgentOutputTokens;
  }
  return 8192;
}

function extractJsonObject(input: string): string | null {
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return input.slice(first, last + 1);
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

function advisorSystemPrompt(ownerUsername: string, chiefAdvisorSoulPrompt?: string | null, runnerContext?: { onlineRunnerCount: number; pendingApprovalCount: number } | null) {
  const runnerLines = runnerContext && runnerContext.onlineRunnerCount > 0
    ? ["", "RUNNER_CAPABILITIES", "When a runner is online you can ask to execute local commands or read/write files — these go through the runner approval queue."]
    : [];
  return [
    "ROLE_IDENTITY",
    "You are Zygenic Business Advisor: the operator-level AI advisor for this business owner.",
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
    "DELEGATION",
    "You can delegate work to hired agents. When the user asks you to DO something (write, draft, research, analyze, plan, review, etc.), delegate it to the right agent.",
    "Available agent targets: ASSISTANT (general tasks, research, drafts, support), PROJECT_MANAGER (project plans, coordination, ops).",
    "Only delegate when the user clearly wants work done — not for simple questions or advice.",
    "Write clear, specific instructions for the agent. Include all relevant context from the conversation.",
    "",
    "STYLE",
    "Be concise, direct, and operational. Sound like a sharp chief of staff / operator, not a motivational coach.",
    "Explain why a recommendation matters in business terms (risk, throughput, cost, customer impact).",
    `When addressing the owner directly, call them @${ownerUsername}.`,
    "",
    "OUTPUT_CONTRACT",
    "Respond ONLY with valid JSON using this shape:",
    '{"answer":"string","priority":"low|medium|high","suggestedAgents":["..."],"onboardingSteps":["..."],"recommendedTemplate":"optional-template-slug","ownerFocus":["..."],"delegatedTasks":[{"toAgent":"ASSISTANT|PROJECT_MANAGER","title":"short task title","instructions":"detailed instructions for the agent"}]}',
    "delegatedTasks is optional — only include it when you are actually delegating work to an agent.",
    ...runnerLines,
  ].join("\n");
}

export async function buildAdvisorContext(userId: string) {
  await ensureWorkspaceSeeded(userId);
  const [projects, templates, runs, inboxItems, prefs, agents, submissions, companySoul, agentSoulBlueprints, chiefAdvisorSoul, businessLogs, businessFiles, owner, runnerContext] = await Promise.all([
    getProjectsForUser(userId),
    getTemplates(),
    getRunsForUser(userId),
    getInboxItems(userId),
    getAppPreferences(userId),
    prisma.agent.findMany({ orderBy: { kind: "asc" } }),
    prisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    getCompanySoul(userId),
    getAgentSoulBlueprintsForAdvisor(userId),
    getChiefAdvisorSoulPackForUser(userId),
    listBusinessLogs(userId, 20),
    listBusinessFiles(userId, 30),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } }),
    buildRunnerContext(userId).catch(() => null),
  ]);
  const ownerUsername = getPreferredUsername({ email: owner?.email, username: owner?.username });

  const inboxSummary = {
    approvals: inboxItems.filter((i) => i.type === "approval" && i.state !== "approved").length,
    incidents: inboxItems.filter((i) => i.type === "incident" && i.state !== "paused").length,
    drafts: inboxItems.filter((i) => i.type === "draft").length,
  };

  return {
    owner: { username: ownerUsername },
    projects: projects.map((p) => ({
      name: p.name,
      goal: p.goal,
      health: p.workforceHealth,
      taskCounts: p.board.map((c) => ({ column: c.title, count: c.cards.length })),
      recentTimeline: p.timeline.slice(0, 4),
    })),
    templates: templates.map((t) => ({ name: t.name, slug: t.slug, agents: t.agents, workflow: t.workflow })),
    runs,
    inboxSummary,
    preferences: prefs,
    agents: UI_AGENTS.map((a) => ({
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
    companySoul: companySoulForAdvisor(companySoul),
    businessLogs: summarizeBusinessLogsForAdvisor(businessLogs),
    businessFiles: summarizeBusinessFilesForAdvisor(businessFiles),
    chiefAdvisorSoul: chiefAdvisorSoul
      ? {
          agentName: chiefAdvisorSoul.agentName,
          role: chiefAdvisorSoul.role,
          companyAnchors: chiefAdvisorSoul.companyAnchors.slice(0, 8),
          operatingMemory: chiefAdvisorSoul.operatingMemory.slice(0, 12),
          promptText: chiefAdvisorSoul.promptText,
        }
      : null,
    agentSoulBlueprints,
    runnerState: runnerContext
      ? {
          onlineRunnerCount: runnerContext.onlineRunnerCount,
          pendingApprovalCount: runnerContext.pendingApprovalCount,
          pendingJobs: runnerContext.pendingJobs,
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
  let suggestedAgents = ["Analyst", "Ops Reviewer"];
  let focus = ["Clear approval gates for external actions", "Define success metric for the first 2 weeks"];

  if (mentionsSupport) {
    recommendedTemplate = "customer-support-triage";
    suggestedAgents = ["Support Rep", "QA Reviewer", "Escalation Coordinator"];
    focus = ["Reduce backlog by urgency", "Keep outbound messages approval-gated", "Measure first-response time and CSAT"];
  } else if (mentionsSales) {
    recommendedTemplate = "outbound-sales-research";
    suggestedAgents = ["Researcher", "Prospector", "Sales Ops"];
    focus = ["Avoid automatic sends at first", "Define ICP and scoring rules", "Audit enrichment quality daily"];
  } else if (mentionsFinance) {
    recommendedTemplate = "contract-review-redlines";
    suggestedAgents = ["Legal Analyst", "Redline Drafter", "Approver"];
    focus = ["No irreversible external actions", "Escalate low-confidence clauses", "Track turnaround time"];
  } else if (mentionsContent) {
    recommendedTemplate = "content-pipeline";
    suggestedAgents = ["Strategist", "Writer", "Editor"];
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
    "chiefAdvisorSoul" in context &&
    typeof (context as { chiefAdvisorSoul?: { promptText?: string | null } }).chiefAdvisorSoul?.promptText === "string"
      ? (context as { chiefAdvisorSoul: { promptText: string } }).chiefAdvisorSoul.promptText
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
  const systemPrompt = advisorSystemPrompt(ownerUsername, chiefAdvisorSoulPrompt, runnerCtx);

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
              text: clampText(
                JSON.stringify(
                  {
                    mode,
                    projectDescription,
                    message: userMessage,
                    history: history.slice(-8),
                    businessContext: context,
                  },
                  null,
                  2,
                ),
                32000,
              ),
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

async function callOllamaAdvisor({
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
  const route = await getModelRoute(userId, "ADVISOR");
  if (route.provider !== "OLLAMA") return null;

  const chiefAdvisorSoulPrompt =
    typeof context === "object" &&
    context &&
    "chiefAdvisorSoul" in context &&
    typeof (context as { chiefAdvisorSoul?: { promptText?: string | null } }).chiefAdvisorSoul?.promptText === "string"
      ? (context as { chiefAdvisorSoul: { promptText: string } }).chiefAdvisorSoul.promptText
      : null;
  const ownerUsername =
    typeof context === "object" &&
    context &&
    "owner" in context &&
    typeof (context as { owner?: { username?: string } }).owner?.username === "string"
      ? (context as { owner: { username: string } }).owner.username
      : "owner";
  const runnerCtxOllama =
    typeof context === "object" &&
    context &&
    "runnerState" in context
      ? (context as { runnerState?: { onlineRunnerCount: number; pendingApprovalCount: number } | null }).runnerState
      : null;
  const systemPrompt = advisorSystemPrompt(ownerUsername, chiefAdvisorSoulPrompt, runnerCtxOllama);

  const userPayload = clampText(
    JSON.stringify(
      { mode, projectDescription, message: userMessage, history: history.slice(-8), businessContext: context },
      null,
      2,
    ),
    18000,
  );

  const chatResult = await postOllamaJson<{ message?: { content?: string }; response?: string }>(
    "/api/chat",
    {
      model: route.modelName,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
      options: { temperature: 0.4, num_predict: extractMaxTokens(context) },
    },
    { timeoutMs: 90000 },
  );

  if (chatResult.ok) {
    const text = chatResult.data.message?.content ?? chatResult.data.response;
    const parsed = text ? safeParseStructured(text) : null;
    if (parsed) return parsed;
  }

  const generateResult = await postOllamaJson<{ response?: string; message?: { content?: string } }>(
    "/api/generate",
    {
      model: route.modelName,
      stream: false,
      prompt: `${systemPrompt}\n\nUSER INPUT JSON:\n${userPayload}`,
      format: "json",
      options: { temperature: 0.4, num_predict: extractMaxTokens(context) },
    },
    { timeoutMs: 90000 },
  );
  if (!generateResult.ok) {
    const chatError = chatResult.ok ? null : chatResult.error;
    const reason = [chatError, generateResult.error].filter(Boolean).join(" | ");
    throw new Error(reason || `Ollama request failed for model "${route.modelName}"`);
  }
  const generatedText = generateResult.data.response ?? generateResult.data.message?.content;
  if (!generatedText) return null;
  return safeParseStructured(generatedText);
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

  const cloudReply = await (async () => {
    if (selectedRoute.provider === "OLLAMA") {
      return callOllamaAdvisor({
        userId: input.userId,
        mode: input.mode,
        userMessage: input.userMessage,
        projectDescription: input.projectDescription,
        history: input.history ?? [],
        context,
      });
    }
    return callOpenAIAdvisor({
      userId: input.userId,
      mode: input.mode,
      userMessage: input.userMessage,
      projectDescription: input.projectDescription,
      history: input.history ?? [],
      context,
    });
  })().catch((e: unknown) => {
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

  const source =
    cloudReply && selectedRoute.provider === "OLLAMA"
      ? ("ollama" as const)
      : cloudReply && selectedRoute.provider === "OPENAI"
        ? ("openai" as const)
        : ("fallback" as const);

  const warning =
    source === "fallback" && selectedRoute.provider === "OLLAMA"
      ? `Ollama route failed for model "${selectedRoute.modelName}". ${providerError ? `Ollama said: ${providerError}` : "Check that Ollama is running and the model is pulled."}`
      : source === "fallback" && selectedRoute.provider === "OPENAI"
        ? `OpenAI route failed for model "${selectedRoute.modelName}". ${providerError ? `OpenAI said: ${providerError}` : "Check your cloud key in Settings or switch to Ollama."}`
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
