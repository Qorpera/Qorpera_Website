import { type NextRequest } from "next/server";
import { requireUserId } from "@/lib/auth";
import { executeDelegatedTask } from "@/lib/orchestration-store";
import type { AgenticStreamEvent } from "@/lib/agentic-loop";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // taskId comes from query param since this is not a dynamic segment route
  const { searchParams } = request.nextUrl;
  const taskId = searchParams.get("taskId");
  if (!taskId) return new Response("taskId required", { status: 400 });

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: AgenticStreamEvent) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client disconnected — ignore
        }
      }

      try {
        await executeDelegatedTask(userId, taskId, send);
      } catch (e: unknown) {
        send({ type: "error", message: e instanceof Error ? e.message : "Execution failed" });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
