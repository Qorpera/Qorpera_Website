import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { runAdvisorChat, type AdvisorMode, type AdvisorDelegation, type AdvisorHire } from "@/lib/advisor";
import { appendAdvisorMessage, ensureAdvisorSession, syncAdvisorSessionToBusinessLog } from "@/lib/advisor-sessions-store";
import { verifySameOrigin } from "@/lib/request-security";
import { createDelegatedTask, executeDelegatedTask, type AgentTarget } from "@/lib/orchestration-store";
import { hireAgentWithinPlan, type HireAgentKind } from "@/lib/agent-hiring";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const VALID_TARGETS = new Set<string>([
  "ASSISTANT",
  "SALES_REP",
  "CUSTOMER_SUCCESS",
  "MARKETING_COORDINATOR",
  "FINANCE_ANALYST",
  "OPERATIONS_MANAGER",
  "EXECUTIVE_ASSISTANT",
]);

const VALID_HIRE_KINDS = new Set<string>([
  "ASSISTANT", "SALES_REP", "CUSTOMER_SUCCESS", "MARKETING_COORDINATOR",
  "FINANCE_ANALYST", "OPERATIONS_MANAGER", "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST",
]);

async function processHires(
  userId: string,
  hires: AdvisorHire[],
): Promise<Array<{ agentKind: string; title: string; created: boolean; error?: string }>> {
  const results: Array<{ agentKind: string; title: string; created: boolean; error?: string }> = [];
  for (const h of hires) {
    const kind = h.agentKind.toUpperCase();
    if (!VALID_HIRE_KINDS.has(kind)) continue;
    try {
      const result = await hireAgentWithinPlan(userId, kind as HireAgentKind);
      if (!result.ok) {
        results.push({ agentKind: kind, title: kind, created: false, error: result.error });
      } else {
        results.push({ agentKind: kind, title: result.job.title, created: result.created });
      }
    } catch (e: unknown) {
      results.push({ agentKind: kind, title: kind, created: false, error: e instanceof Error ? e.message : "Hire failed" });
    }
  }
  return results;
}

type Body = {
  mode?: AdvisorMode;
  sessionId?: string;
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  projectDescription?: string;
};

async function createAndExecuteTasks(
  userId: string,
  delegations: AdvisorDelegation[],
): Promise<Array<{ id: string; title: string; toAgent: string; error?: string }>> {
  const created: Array<{ id: string; title: string; toAgent: string; error?: string }> = [];

  for (const d of delegations) {
    const target = d.toAgent.toUpperCase();
    if (!VALID_TARGETS.has(target)) continue;

    try {
      const task = await createDelegatedTask(userId, {
        fromAgent: "CHIEF_ADVISOR",
        toAgentTarget: target as AgentTarget,
        title: d.title,
        instructions: d.instructions,
        triggerSource: "ADVISOR_CHAT",
      });
      created.push({ id: task.id, title: task.title, toAgent: target });

      // Fire-and-forget: execute immediately without blocking the response.
      // If this fails, the task stays QUEUED for the next scheduler tick.
      void executeDelegatedTask(userId, task.id).catch(() => {});
    } catch (e: unknown) {
      created.push({
        id: "",
        title: d.title,
        toAgent: target,
        error: e instanceof Error ? e.message : "Failed to create task",
      });
    }
  }
  return created;
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(userId, "chat");
  if (!rl.allowed) return rl.response!;

  const body = (await request.json().catch(() => ({}))) as Body;
  const mode = body.mode === "new_project" ? "new_project" : "home";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const message = (body.message ?? "").trim();
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const projectDescription = typeof body.projectDescription === "string" ? body.projectDescription.trim() : undefined;

  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const sessionRow = await ensureAdvisorSession(userId, sessionId, message);
  await appendAdvisorMessage({
    userId,
    sessionId: sessionRow.id,
    role: "user",
    content: message,
  });
  await syncAdvisorSessionToBusinessLog(userId, sessionRow.id);

  const result = await runAdvisorChat({
    userId,
    mode,
    userMessage: message,
    history,
    projectDescription,
  });

  if (result.source === "fallback" && result.runtime?.warning) {
    await syncAdvisorSessionToBusinessLog(userId, sessionRow.id);
    return NextResponse.json(
      {
        error: result.runtime.warning,
        sessionId: sessionRow.id,
        runtime: result.runtime,
        help: [
          "The managed API key for this provider may be temporarily unavailable.",
          "Contact support if this issue persists.",
        ],
      },
      { status: 503 },
    );
  }

  // Create and fire-and-forget execute any delegated tasks from the advisor.
  let delegatedTaskResults: Array<{ id: string; title: string; toAgent: string; error?: string }> = [];
  if (result.reply.delegatedTasks?.length) {
    delegatedTaskResults = await createAndExecuteTasks(userId, result.reply.delegatedTasks);
  }

  // Process any agent hires the advisor requested.
  let hireResults: Array<{ agentKind: string; title: string; created: boolean; error?: string }> = [];
  if (result.reply.hireAgents?.length) {
    hireResults = await processHires(userId, result.reply.hireAgents);
  }

  await appendAdvisorMessage({
    userId,
    sessionId: sessionRow.id,
    role: "assistant",
    content: result.reply.answer,
    source: result.source,
    modelName: result.runtime?.selectedModel ?? null,
  });
  await syncAdvisorSessionToBusinessLog(userId, sessionRow.id);

  return NextResponse.json({
    ok: true,
    sessionId: sessionRow.id,
    reply: result.reply,
    source: result.source,
    runtime: result.runtime,
    delegatedTasks: delegatedTaskResults.length ? delegatedTaskResults : undefined,
    hiredAgents: hireResults.length ? hireResults : undefined,
  });
}
