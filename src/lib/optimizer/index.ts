/**
 * Agent Optimizer — background job.
 *
 * Runs every 48h per user, optimizing ALL active agents in one pass.
 * Per agent:
 *  1. Researches latest agentic AI / prompt engineering papers
 *  2. Analyzes the target agent against best practices
 *  3. Generates typed actions (prompt_patch, soul_addition, automation_config, memory_seed)
 *  4. AUTO-APPLIES: HIGH priority actions
 *  5. LOGS:         MEDIUM and LOW as recommendations
 *  6. Creates a locked BusinessLogEntry with the full rundown
 *  7. Creates an InboxItem so the user sees what changed
 *
 * Triggered by the scheduler tick — never called from the UI.
 */

import { prisma } from "@/lib/db";
import {
  getProviderApiKeyRuntime,
  checkManagedGuardrails,
} from "@/lib/connectors-store";
import { getModelRoute } from "@/lib/model-routing-store";
import { getActivePlanForUser } from "@/lib/plan-store";
import { runResearch } from "./research-engine";
import { analyzeAgent } from "./prompt-analyzer";
import { reviewAgentWork } from "./work-reviewer";
import { executeAction } from "./action-executor";
import {
  createCycle,
  completeCycle,
  failCycle,
  isDue,
} from "./optimizer-store";
import { AGENT_ROTATION } from "./types";
import type { RotationAgent, OptimizationAction, AgentContext } from "./types";

// Interval based on how long the subscription has been active:
//   < 7 days  → 24h  (onboarding acceleration — daily)
//   7–30 days → 168h (weekly)
//   > 30 days → 336h (bi-weekly, settled business)
async function getIntervalHours(userId: string): Promise<number> {
  const sub = await getActivePlanForUser(userId).catch(() => null);
  if (!sub) return 168; // no active plan — default weekly
  const ageDays = (Date.now() - sub.createdAt.getTime()) / 86_400_000;
  if (ageDays < 7)  return 24;
  if (ageDays < 30) return 168;
  return 336;
}

const AGENT_NAMES: Record<RotationAgent, { name: string; role: string }> = {
  CHIEF_ADVISOR:         { name: "Chief Advisor",          role: "Business Advisor"         },
  ASSISTANT:             { name: "Mara",                   role: "Support Rep"              },
  SALES_REP:             { name: "Kai",                    role: "Sales Rep"                },
  CUSTOMER_SUCCESS:      { name: "Zoe",                    role: "CS Manager"               },
  MARKETING_COORDINATOR: { name: "Ava",                    role: "Marketing Coordinator"    },
  FINANCE_ANALYST:       { name: "Max",                    role: "Finance Analyst"          },
  OPERATIONS_MANAGER:    { name: "Jordan",                 role: "Operations Manager"       },
  EXECUTIVE_ASSISTANT:   { name: "Sam",                    role: "Executive Assistant"      },
  RESEARCH_ANALYST:      { name: "Nova",                   role: "Research Analyst"         },
};

// ── LLM caller factory (always uses best reasoning model available) ─
//
// Cost is covered by Qorpera — platform env keys are tried first so the
// user is never charged for optimizer runs. User keys are a fallback for
// self-hosted / dev deployments where platform keys are not configured.

type LlmCaller = (system: string, user: string) => Promise<string | null>;

// o-series models don't accept a temperature parameter
const OPENAI_REASONING_MODELS = new Set(["o3", "o3-mini", "o4-mini", "o1", "o1-mini", "o1-preview"]);

async function buildLlmCaller(userId: string): Promise<LlmCaller | null> {
  // 1. Qorpera platform key — Opus 4.6, cost covered by Qorpera
  const platformAnthropic = process.env.QORPERA_ANTHROPIC_API_KEY;
  if (platformAnthropic) return makeAnthropicCaller(platformAnthropic, "claude-opus-4-6");

  // 2. User's own keys (fallback for dev / self-hosted deployments)
  const anthropicRuntime = await getProviderApiKeyRuntime(userId, "ANTHROPIC").catch(() => null);
  if (anthropicRuntime?.apiKey) return makeAnthropicCaller(anthropicRuntime.apiKey, "claude-opus-4-6");

  const openaiRuntime = await getProviderApiKeyRuntime(userId, "OPENAI").catch(() => null);
  if (openaiRuntime?.apiKey) {
    if (openaiRuntime.mode === "MANAGED") {
      const ok = await checkManagedGuardrails(userId, "OPENAI").catch(() => ({ allowed: false }));
      if (!ok.allowed) { /* fall through */ }
      else return makeOpenAICaller(openaiRuntime.apiKey, "o4-mini");
    } else {
      return makeOpenAICaller(openaiRuntime.apiKey, "o4-mini");
    }
  }

  const googleRuntime = await getProviderApiKeyRuntime(userId, "GOOGLE").catch(() => null);
  if (googleRuntime?.apiKey) return makeGoogleCaller(googleRuntime.apiKey, "gemini-2.5-pro");

  return null;
}

function makeOpenAICaller(apiKey: string, model: string): LlmCaller {
  const isReasoningModel = OPENAI_REASONING_MODELS.has(model);
  return async (system, user) => {
    const body: Record<string, unknown> = {
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: user.slice(0, 40000) }] },
      ],
      max_output_tokens: 4096,
    };
    // Reasoning models don't accept temperature
    if (!isReasoningModel) body.temperature = 0.3;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000), // reasoning models can be slower
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
    return data?.output_text ?? data?.output?.flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("\n") ?? null;
  };
}

function makeAnthropicCaller(apiKey: string, model: string): LlmCaller {
  return async (system, user) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2024-10-22" },
      body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user.slice(0, 40000) }] }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { content?: Array<{ text?: string }> } | null;
    return data?.content?.map((c) => c.text ?? "").join("") ?? null;
  };
}

function makeGoogleCaller(apiKey: string, model: string): LlmCaller {
  return async (system, user) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user.slice(0, 40000) }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(120000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
  };
}

// ── Context builder for target agent ─────────────────────────────

async function buildAgentContext(userId: string, agentKind: RotationAgent): Promise<AgentContext> {
  const info = AGENT_NAMES[agentKind];

  const [config, memory] = await Promise.all([
    prisma.agentAutomationConfig.findUnique({
      where: { userId_agentTarget: { userId, agentTarget: agentKind } },
    }),
    prisma.agentMemory.findUnique({
      where: { userId_agentKind: { userId, agentKind } },
      include: {
        entries: {
          where: { topic: { in: ["optimizer_core_truth", "optimizer_boundary"] } },
          orderBy: { importance: "desc" },
          take: 20,
          select: { topic: true, content: true },
        },
      },
    }),
  ]);

  const truths = memory?.entries.filter((e) => e.topic === "optimizer_core_truth").map((e) => e.content) ?? [];
  const boundaries = memory?.entries.filter((e) => e.topic === "optimizer_boundary").map((e) => e.content) ?? [];

  return {
    agentKind,
    agentName: info.name,
    role: info.role,
    currentSoulTruths: truths,
    currentBoundaries: boundaries,
    currentConfig: {
      maxLoopIterations:                config?.maxLoopIterations ?? 3,
      maxRuntimeSeconds:                config?.maxRuntimeSeconds ?? 120,
      maxAgentCallsPerRun:              config?.maxAgentCallsPerRun ?? 6,
      requireApprovalForExternalActions: config?.requireApprovalForExternalActions ?? true,
      allowAgentDelegation:             config?.allowAgentDelegation ?? true,
      maxToolRetries:                   config?.maxToolRetries ?? 2,
    },
  };
}

// ── Business log + inbox ──────────────────────────────────────────

async function createUpdateLog(
  userId: string,
  cycleId: string,
  agentKind: RotationAgent,
  overallScore: number,
  appliedActions: OptimizationAction[],
  loggedActions: OptimizationAction[],
  synthesis: string,
  workReviewSummary: string,
  taskStats: { total: number; done: number; failed: number; review: number; paused: number },
) {
  const info = AGENT_NAMES[agentKind];

  const appliedLines = appliedActions.map((a, i) => {
    const label = a.type === "prompt_patch"
      ? `[prompt patch] ${(a as { sectionHeader: string }).sectionHeader}`
      : a.type === "soul_addition"
        ? `[soul ${(a as { field: string }).field}] "${(a as { content: string }).content.slice(0, 80)}..."`
        : a.type === "automation_config"
          ? `[config] ${(a as { field: string }).field} → ${String((a as { recommendedValue: unknown }).recommendedValue)}`
          : `[memory seed] ${(a as { title: string }).title}`;
    return `${i + 1}. ${label}\n   Basis: ${a.researchBasis}`;
  }).join("\n");

  const loggedLines = loggedActions.map((a, i) => {
    return `${i + 1}. [${a.type}] ${a.issue}\n   Priority: ${a.priority} · Basis: ${a.researchBasis}`;
  }).join("\n");

  const statsLine = taskStats.total > 0
    ? `${taskStats.done}/${taskStats.total} tasks done · ${taskStats.failed} failed · ${taskStats.review} pending review`
    : "No tasks in this period";

  const body = [
    `## ${info.name} (${info.role}) — Optimization Cycle`,
    ``,
    `**Score:** ${overallScore}/100`,
    ``,
    `### Work review (last 48 hours)`,
    `${statsLine}`,
    ``,
    workReviewSummary,
    ``,
    `### Research synthesis`,
    synthesis.slice(0, 500) + (synthesis.length > 500 ? "…" : ""),
    ``,
    appliedActions.length > 0
      ? `### Applied (HIGH priority — active now)\n\n${appliedLines}`
      : `### No HIGH priority changes this cycle`,
    ``,
    loggedActions.length > 0
      ? `### Logged (MEDIUM/LOW — for your awareness)\n\n${loggedLines}`
      : "",
  ].filter((l) => l !== undefined).join("\n").trim();

  const logEntry = await prisma.businessLogEntry.create({
    data: {
      userId,
      title: `System Update: ${info.name} agent optimized — ${appliedActions.length} improvement${appliedActions.length !== 1 ? "s" : ""} applied`,
      category: "OPERATIONS",
      source: "AGENT",
      authorLabel: "Qorpera Optimizer",
      relatedRef: `OPTIMIZER_UPDATE:${cycleId}`,
      locked: true,
      body,
    },
  });

  const impact = appliedActions.length > 0
    ? appliedActions.map((a) => a.type.replace("_", " ")).join(", ")
    : "no auto-applied changes this cycle";

  await prisma.inboxItem.create({
    data: {
      userId,
      type: "system_update",
      summary: `${info.name} upgraded — ${appliedActions.length} improvement${appliedActions.length !== 1 ? "s" : ""} applied`,
      impact,
      owner: "Optimizer",
      department: "System",
      state: "OPEN",
      stateLabel: "Open",
      sourceType: "OPTIMIZER",
      sourceId: cycleId,
      digest: body.slice(0, 2000),
    },
  });

  return logEntry;
}

// ── Active agents ─────────────────────────────────────────────────

async function getActiveAgentsForUser(userId: string): Promise<RotationAgent[]> {
  const hired = await prisma.hiredJob.findMany({
    where: { userId, enabled: true },
    select: { agentKind: true },
  });
  const hiredKinds = new Set(hired.map((h) => h.agentKind as string));
  // CHIEF_ADVISOR is always active (not tracked via HiredJob)
  return AGENT_ROTATION.filter((a) => a === "CHIEF_ADVISOR" || hiredKinds.has(a));
}

// ── Main cycle (single agent) ─────────────────────────────────────

export async function runOptimizationCycle(
  userId: string,
  agentKind: RotationAgent,
  llmCaller: Awaited<ReturnType<typeof buildLlmCaller>>,
  intervalHours: number,
): Promise<{ cycleId: string; success: boolean; error?: string }> {
  if (!llmCaller) {
    return { cycleId: "", success: false, error: "No LLM provider available" };
  }

  const cycle = await createCycle(userId, agentKind);
  const cycleId = cycle.id;

  try {
    const tavilyApiKey = process.env.TAVILY_API_KEY ?? null;
    const agentInfo = AGENT_NAMES[agentKind];

    const [agentCtx, research, workReview] = await Promise.all([
      buildAgentContext(userId, agentKind),
      runResearch(llmCaller, tavilyApiKey).catch(() => []),
      reviewAgentWork(userId, agentKind, agentInfo.name, llmCaller).catch(() => null),
    ]);

    const { overallScore, dimensions, actions, synthesis } =
      await analyzeAgent(agentCtx, research, llmCaller);

    // Merge research-driven actions with empirical work-review actions
    const allActions = [...actions, ...(workReview?.actions ?? [])];
    const highActions  = allActions.filter((a) => a.priority === "high");
    const otherActions = allActions.filter((a) => a.priority !== "high");

    for (const action of highActions) {
      await executeAction(userId, cycleId, agentKind, action).catch((e) => {
        console.error(`[optimizer] Failed to execute action ${action.id}:`, e);
      });
    }

    const nextRunAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000);
    await completeCycle(cycleId, { research, synthesis, overallScore, dimensions, actions: allActions }, nextRunAt);
    await createUpdateLog(
      userId, cycleId, agentKind, overallScore,
      highActions, otherActions, synthesis,
      workReview?.reviewSummary ?? "No work review available.",
      workReview?.taskStats ?? { total: 0, done: 0, failed: 0, review: 0, paused: 0 },
    );

    return { cycleId, success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await failCycle(cycleId, msg).catch(() => {});
    return { cycleId, success: false, error: msg };
  }
}

// ── Scheduler hook ────────────────────────────────────────────────

async function runAllAgentCycles(userId: string): Promise<void> {
  const [llmCaller, agents, intervalHours] = await Promise.all([
    buildLlmCaller(userId),
    getActiveAgentsForUser(userId),
    getIntervalHours(userId),
  ]);

  if (!llmCaller) {
    console.error("[optimizer] No LLM provider available for user", userId);
    return;
  }

  for (const agent of agents) {
    await runOptimizationCycle(userId, agent, llmCaller, intervalHours).catch((e) => {
      console.error(`[optimizer] Cycle error for ${agent}:`, e);
    });
  }
}

export async function runOptimizerIfDue(userId: string): Promise<void> {
  const due = await isDue(userId);
  if (!due) return;
  // Fire and forget — scheduler tick doesn't wait
  runAllAgentCycles(userId).catch((e) => {
    console.error("[optimizer] Background run error:", e);
  });
}
