import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { runAdvisorChat, type AdvisorMode, type AdvisorDelegation } from "@/lib/advisor";
import { appendAdvisorMessage, ensureAdvisorSession, syncAdvisorSessionToBusinessLog } from "@/lib/advisor-sessions-store";
import { verifySameOrigin } from "@/lib/request-security";
import { createDelegatedTask, executeDelegatedTask, type AgentTarget } from "@/lib/orchestration-store";

export const runtime = "nodejs";

const VALID_TARGETS = new Set<string>(["ASSISTANT", "PROJECT_MANAGER"]);

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

  const body = (await request.json().catch(() => ({}))) as Body;
  const mode = body.mode === "new_project" ? "new_project" : "home";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
  const message = (body.message ?? "").trim();
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const projectDescription = typeof body.projectDescription === "string" ? body.projectDescription.trim() : undefined;

  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const sessionRow = await ensureAdvisorSession(userId, sessionId, message);
  await appendAdvisorMessage({
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
        help:
          result.runtime.selectedProvider === "OLLAMA"
            ? [
                "Make sure Ollama is running (`ollama serve`).",
                `Pull the selected model first (\`ollama pull ${result.runtime.selectedModel ?? "your-model"}\`).`,
                "Keep the advisor model set to an installed Ollama model.",
              ]
            : [
                "Open Settings -> Model setup and add a valid cloud key.",
                "Or switch the advisor to Ollama (local open-source).",
                "Then try sending the message again.",
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

  await appendAdvisorMessage({
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
  });
}
