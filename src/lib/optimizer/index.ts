/**
 * Main orchestrator for the agent optimization loop.
 *
 * Each cycle:
 * 1. Runs web research on agentic AI + prompt engineering
 * 2. Synthesizes findings into actionable insights
 * 3. Scores the current agent prompt against best practices
 * 4. Generates specific prompt patches to apply
 * 5. Schedules the next cycle (24h default)
 *
 * Applied patches are stored per-user and injected into the live advisor prompt.
 */

import {
  getProviderApiKeyRuntime,
  checkManagedGuardrails,
} from "@/lib/connectors-store";
import { getModelRoute } from "@/lib/model-routing-store";
import { runResearch } from "./research-engine";
import { analyzePrompt } from "./prompt-analyzer";
import {
  createCycle,
  completeCycle,
  failCycle,
} from "./optimizer-store";

const LOOP_INTERVAL_HOURS = 24;

// Build a simple LLM caller using the user's configured provider
async function buildLlmCaller(userId: string) {
  const route = await getModelRoute(userId, "ADVISOR").catch(() => null);
  if (!route || route.provider === "OLLAMA") {
    // Try OpenAI as default for optimizer
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI").catch(() => null);
    if (!runtime?.apiKey) return null;

    if (runtime.mode === "MANAGED") {
      const ok = await checkManagedGuardrails(userId, "OPENAI").catch(() => ({ allowed: false }));
      if (!ok.allowed) return null;
    }

    return makeCaller("OPENAI", runtime.apiKey, "gpt-4.1-mini");
  }

  if (route.provider === "OPENAI") {
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI").catch(() => null);
    if (!runtime?.apiKey) return null;
    return makeCaller("OPENAI", runtime.apiKey, route.modelName);
  }

  if (route.provider === "ANTHROPIC") {
    const runtime = await getProviderApiKeyRuntime(userId, "ANTHROPIC").catch(() => null);
    if (!runtime?.apiKey) return null;
    return makeCaller("ANTHROPIC", runtime.apiKey, route.modelName);
  }

  if (route.provider === "GOOGLE") {
    const runtime = await getProviderApiKeyRuntime(userId, "GOOGLE").catch(() => null);
    if (!runtime?.apiKey) return null;
    return makeCaller("GOOGLE", runtime.apiKey, route.modelName);
  }

  return null;
}

type LlmCaller = (system: string, user: string) => Promise<string | null>;

function makeCaller(
  provider: "OPENAI" | "ANTHROPIC" | "GOOGLE",
  apiKey: string,
  model: string,
): LlmCaller {
  return async (system: string, user: string): Promise<string | null> => {
    if (provider === "OPENAI") {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: [{ type: "input_text", text: user.slice(0, 40000) }] },
          ],
          max_output_tokens: 4096,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as {
        output_text?: string;
        output?: Array<{ content?: Array<{ text?: string }> }>;
      } | null;
      return (
        data?.output_text ??
        data?.output?.flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("\n") ??
        null
      );
    }

    if (provider === "ANTHROPIC") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2024-10-22",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages: [{ role: "user", content: user.slice(0, 40000) }],
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as {
        content?: Array<{ text?: string }>;
      } | null;
      return data?.content?.map((c) => c.text ?? "").join("") ?? null;
    }

    if (provider === "GOOGLE") {
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
          signal: AbortSignal.timeout(60000),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      } | null;
      return (
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null
      );
    }

    return null;
  };
}

// Get the current advisor system prompt text for analysis
// We reconstruct it using a minimal representation
function getAdvisorPromptSnapshot(): string {
  // Return the known structure as a representative sample for analysis
  // The real prompt is dynamic, but this gives the analyzer the static skeleton
  return `ROLE_IDENTITY
You are Qorpera Business Advisor: the operator-level AI advisor for this business owner.
You are not a generic chatbot. Your job is to improve business performance by prioritizing work, designing agent roles, and staging safe automation rollout.
Operate as the default advisor agent for this workspace.

CORE_MANDATE
Optimize for business outcomes, speed of learning, and safe execution.
Recommend the minimum viable agent workforce needed to move the business forward this week.
Prefer specific actions over abstract advice.

OPERATING_POLICY
Use Company Soul as the source of truth for mission, goals, constraints, departments, approvals, and KPIs.
Use Business Logs and business files as recent operational memory (facts, outputs, documents, financial updates, collaboration notes).
Use inbox/review pressure, active runs, and project health to decide what matters now.
Bias toward clearing bottlenecks and preserving approvals for risky external actions.
If a critical assumption is missing, state it explicitly and make a safe default assumption.
Do not give generic brainstorming lists when a prioritized recommendation is possible.

GROUNDING RULES (CRITICAL — violations erode trust)
Your knowledge of this business comes ONLY from the data fields in the businessContext JSON below.
Do NOT invent, fabricate, or hallucinate any information. Specifically:
- Do NOT invent recent activity, active workflows, anomalies, pending actions, or statistics that are not in the context data.
- Do NOT describe agents as running, active, or operational unless there is evidence in 'runs' or 'recentSubmissions'.
- Do NOT fabricate file contents. If a file's textExtract is null or truncated, say so — do not guess what it contains.
- Do NOT make up timestamps, counts, or metrics. Only quote numbers that appear in the context.
If Company Soul is empty or incomplete, say so directly — do not infer business details.
If no agents are hired (agents list is empty), say so — do not describe agents as available.
If businessLogs and businessFiles arrays are empty, the business has no recorded operational history yet.

DELEGATION
You can delegate work to hired agents. When the user asks you to DO something (write, draft, research, analyze, plan, review, etc.), delegate it to the right agent.
You may delegate to multiple agents in one response if the request spans domains.
Only delegate when the user clearly wants work done — not for simple questions or advice.
Write clear, specific instructions for the agent. Include all relevant context from the conversation.
Only delegate to agents that appear in the agents list in the context. If no agents are hired, you cannot delegate.

AGENT ROUTING TABLE — choose the best match:
- ASSISTANT: General triage, research, drafting, data gathering. Delegates to specialists when needed.
- SALES_REP: Prospect research, ICP scoring, personalized outreach drafts, pipeline logging.
- CUSTOMER_SUCCESS: Customer health monitoring, churn risk assessment, renewal prep, retention outreach.
- MARKETING_COORDINATOR: Brand-voice content creation, campaign analysis, Figma design review.
- FINANCE_ANALYST: Financial analysis with verification workflow, anomaly detection, structured table output.
- OPERATIONS_MANAGER: SOP maintenance, vendor SLA tracking, blocker identification, cross-team delegation.
- EXECUTIVE_ASSISTANT: Inbox triage, meeting briefs, action item tracking with owners and due dates.

HIRING
You can hire agents directly. Use the 'hireAgents' field when the user asks to activate, add, or set up a new agent.
Only hire agents from the hireableAgents list in the context.

STYLE
Lead with the action or recommendation — no preamble, no filler.
Keep the 'answer' field to 1-3 sentences for simple questions, max 4-5 for complex ones.
Sound like a sharp chief of staff, not a motivational coach.
Never repeat information that's already in the structured fields.

OUTPUT_CONTRACT
Respond ONLY with valid JSON using the specified shape.
delegatedTasks is optional — only include it when you are actually delegating work to an agent.
hireAgents is optional — only include it when hiring is warranted and slots are available.`;
}

export async function runOptimizationCycle(
  userId: string,
  agentKind: string = "CHIEF_ADVISOR",
): Promise<{ cycleId: string; success: boolean; error?: string }> {
  const cycle = await createCycle(userId, agentKind);
  const cycleId = cycle.id;

  try {
    const llmCaller = await buildLlmCaller(userId);
    if (!llmCaller) {
      await failCycle(cycleId, "No LLM provider available. Configure an API key in Settings > Connectors.");
      return { cycleId, success: false, error: "No LLM provider available" };
    }

    // Check for Tavily API key in env
    const tavilyApiKey = process.env.TAVILY_API_KEY ?? null;

    // Step 1: Research
    const research = await runResearch(llmCaller, tavilyApiKey).catch((e) => {
      console.error("[optimizer] Research failed:", e);
      return [];
    });

    // Step 2: Analyze current prompt
    const currentPrompt = getAdvisorPromptSnapshot();
    const { overallScore, dimensions, improvements, synthesis } =
      await analyzePrompt(currentPrompt, research, llmCaller);

    // Step 3: Persist
    const nextRunAt = new Date(Date.now() + LOOP_INTERVAL_HOURS * 60 * 60 * 1000);
    await completeCycle(cycleId, { research, synthesis, overallScore, dimensions, improvements }, nextRunAt);

    return { cycleId, success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await failCycle(cycleId, msg).catch(() => {});
    return { cycleId, success: false, error: msg };
  }
}
