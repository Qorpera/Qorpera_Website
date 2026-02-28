/**
 * Event Orchestrator — processes queued WebhookEvents and evaluates task continuations.
 *
 * processWebhookEvents: Called by the scheduler tick to drain PENDING webhook events.
 * evaluateTaskContinuation: Called after a task completes to decide if follow-up work is needed.
 */

import { prisma } from "@/lib/db";
import { getModelRoute } from "@/lib/model-routing-store";
import { postOllamaJson } from "@/lib/ollama";
import { getProviderApiKeyRuntime } from "@/lib/connectors-store";
import { recordOllamaUsage } from "@/lib/ollama-usage-store";
import { summarizeCalendlyEvent, summarizeHubspotEvent } from "@/lib/webhook-validators";
import { createDelegatedTask, type AgentTarget } from "@/lib/orchestration-store";

// ── Constants ──────────────────────────────────────────────────────

const VALID_AGENT_TARGETS = new Set<string>([
  "EXECUTIVE_ASSISTANT",
  "SALES_REP",
  "CUSTOMER_SUCCESS",
  "MARKETING_COORDINATOR",
  "FINANCE_ANALYST",
  "OPERATIONS_MANAGER",
  "RESEARCH_ANALYST",
  "ASSISTANT",
  "CHIEF_ADVISOR",
  "SEO_SPECIALIST",
]);

const MAX_CHAIN_DEPTH = 3;

// ── Agent target normalizer ────────────────────────────────────────

function normalizeAgentTarget(raw: string): AgentTarget | null {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return VALID_AGENT_TARGETS.has(normalized) ? (normalized as AgentTarget) : null;
}

// ── Safe JSON extraction ───────────────────────────────────────────

function extractJsonArray(text: string): unknown[] {
  try {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start < 0 || end < start) return [];
    return JSON.parse(text.slice(start, end + 1)) as unknown[];
  } catch {
    return [];
  }
}

function extractJsonObject(text: string): Record<string, unknown> {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) return {};
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── LLM caller ────────────────────────────────────────────────────

async function callEventLlm(
  userId: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  try {
    const route = await getModelRoute(userId, "ADVISOR");

    if (route.provider === "OLLAMA") {
      const result = await postOllamaJson<{
        message?: { content?: string };
        response?: string;
        eval_count?: number;
        prompt_eval_count?: number;
      }>(
        "/api/chat",
        {
          model: route.modelName,
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          options: { temperature: 0.2, num_predict: 600 },
        },
        { timeoutMs: 60000 },
      );
      if (result.ok) {
        recordOllamaUsage(userId, {
          promptTokens: result.data.prompt_eval_count ?? 0,
          completionTokens: result.data.eval_count ?? 0,
        }).catch(() => {});
        return result.data.message?.content ?? result.data.response ?? null;
      }
      return null;
    }

    // OpenAI Responses API
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
    const apiKey = runtime.apiKey;
    if (!apiKey) return null;

    const model =
      route.provider === "OPENAI" ? route.modelName : (process.env.OPENAI_ADVISOR_MODEL ?? "gpt-4.1-mini");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] },
        ],
        max_output_tokens: 600,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    } | null;
    if (!data) return null;

    return (
      data.output_text ??
      data.output
        ?.flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text" || typeof c.text === "string")
        .map((c) => c.text ?? "")
        .join("\n") ??
      null
    );
  } catch {
    return null;
  }
}

// ── processWebhookEvents ──────────────────────────────────────────

const EVENT_SYSTEM_PROMPT = `You are Qorpera's event orchestrator. Decide which agent tasks to create for this business event.
Be conservative — only create tasks when clearly warranted.
Available agents: EXECUTIVE_ASSISTANT, SALES_REP, CUSTOMER_SUCCESS, MARKETING_COORDINATOR,
  FINANCE_ANALYST, OPERATIONS_MANAGER, RESEARCH_ANALYST, ASSISTANT
Respond ONLY with JSON array: [{toAgent, title, instructions}] or []. Maximum 3 tasks.`;

/**
 * Drain PENDING webhook events for a user, calling LLM to decide if tasks should be created.
 * Returns the number of events processed (PROCESSED or FAILED).
 */
export async function processWebhookEvents(userId: string, limit = 5): Promise<number> {
  const events = await prisma.webhookEvent.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let count = 0;

  for (const event of events) {
    // Mark PROCESSING first as dedup guard for overlapping ticks
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSING" },
    });

    try {
      const rawPayload = JSON.parse(event.payload) as Record<string, unknown>;

      const summary =
        event.provider === "calendly"
          ? summarizeCalendlyEvent(event.eventType, rawPayload)
          : summarizeHubspotEvent(
              event.eventType,
              rawPayload as Record<string, unknown> | Array<Record<string, unknown>>,
            );

      const userPrompt = `Provider: ${event.provider}\nEvent type: ${event.eventType}\nSummary: ${summary}\n\nDecide what agent tasks (if any) should be created.`;

      const llmText = await callEventLlm(userId, EVENT_SYSTEM_PROMPT, userPrompt);
      const drafts = llmText ? extractJsonArray(llmText) : [];

      let tasksCreated = 0;
      for (const draft of drafts.slice(0, 3)) {
        if (typeof draft !== "object" || draft === null) continue;
        const d = draft as Record<string, unknown>;
        const agentTarget = normalizeAgentTarget(String(d.toAgent ?? ""));
        const title = String(d.title ?? "").trim().slice(0, 240);
        const instructions = String(d.instructions ?? "").trim().slice(0, 12000);
        if (!agentTarget || !title || !instructions) continue;
        try {
          await createDelegatedTask(userId, {
            fromAgent: "EVENT_ORCHESTRATOR",
            toAgentTarget: agentTarget,
            title,
            instructions,
            triggerSource: `EVENT:${event.provider}:${event.eventType}`.slice(0, 60),
            dueLabel: "Now",
            webhookEventId: event.id,
            chainDepth: 0,
          });
          tasksCreated++;
        } catch {
          // Agent not hired or other task-level error — skip this draft
        }
      }

      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      count++;
      void tasksCreated; // used for audit; suppress lint warning
    } catch (err) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          errorMessage: (err instanceof Error ? err.message : String(err)).slice(0, 500),
        },
      });
      count++;
    }
  }

  return count;
}

// ── evaluateTaskContinuation ──────────────────────────────────────

const CONTINUATION_SYSTEM_PROMPT_TEMPLATE = (chainDepth: number) =>
  `You are Qorpera's task continuation evaluator. Decide if a completed task warrants follow-up.
Be very conservative — most tasks do NOT need follow-up.
Chain depth: ${chainDepth} (max allowed: ${MAX_CHAIN_DEPTH - 1}).
Respond ONLY with JSON: {shouldContinue: bool, tasks: [{toAgent, title, instructions}]}`;

/**
 * After a task completes, evaluate whether a follow-up task should be created.
 * Guard: chainDepth >= MAX_CHAIN_DEPTH → returns immediately without LLM call.
 */
export async function evaluateTaskContinuation(
  userId: string,
  task: {
    id: string;
    title: string;
    toAgentTarget: string;
    completionDigest: string | null;
    chainDepth: number;
  },
): Promise<void> {
  if (task.chainDepth >= MAX_CHAIN_DEPTH) return;

  const systemPrompt = CONTINUATION_SYSTEM_PROMPT_TEMPLATE(task.chainDepth);
  const userPrompt = [
    `Completed task: "${task.title}"`,
    `Agent: ${task.toAgentTarget}`,
    task.completionDigest ? `\nCompletion summary:\n${task.completionDigest.slice(0, 800)}` : "",
    "\nShould any follow-up tasks be created?",
  ]
    .filter(Boolean)
    .join("\n");

  const llmText = await callEventLlm(userId, systemPrompt, userPrompt);
  if (!llmText) return;

  const decision = extractJsonObject(llmText);
  if (!decision.shouldContinue) return;

  const drafts = Array.isArray(decision.tasks) ? (decision.tasks as unknown[]) : [];
  for (const draft of drafts.slice(0, 2)) {
    if (typeof draft !== "object" || draft === null) continue;
    const d = draft as Record<string, unknown>;
    const agentTarget = normalizeAgentTarget(String(d.toAgent ?? ""));
    const title = String(d.title ?? "").trim().slice(0, 240);
    const instructions = String(d.instructions ?? "").trim().slice(0, 12000);
    if (!agentTarget || !title || !instructions) continue;
    try {
      await createDelegatedTask(userId, {
        fromAgent: "EVENT_ORCHESTRATOR",
        toAgentTarget: agentTarget,
        title,
        instructions,
        triggerSource: "CONTINUATION",
        inputFromTaskId: task.id,
        chainDepth: task.chainDepth + 1,
      });
    } catch {
      // Agent not hired or delegation disabled — skip
    }
  }
}
