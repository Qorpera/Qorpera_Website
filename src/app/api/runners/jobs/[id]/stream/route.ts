import { requireUserId } from "@/lib/auth";
import { getRunnerJobForUser, listRunnerJobEventsForUser } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseComment(comment: string) {
  return encoder.encode(`: ${comment}\n\n`);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const { id } = await params;
  const signal = request.signal;

  let closed = false;
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const seenEventIds = new Set<string>();
      let lastJobFingerprint = "";

      const publishSnapshot = async () => {
        const job = await getRunnerJobForUser(userId, id);
        const fingerprint = JSON.stringify({
          status: job.status,
          updatedAt: job.updatedAt,
          attempts: job.attempts,
          errorMessage: job.errorMessage,
          approvedAt: job.approvedAt,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          result: job.result,
        });
        if (fingerprint !== lastJobFingerprint) {
          lastJobFingerprint = fingerprint;
          controller.enqueue(sseEvent("job", { job }));
        }
      };

      const publishNewEvents = async () => {
        const events = await listRunnerJobEventsForUser(userId, id, 500);
        const next = events.filter((event) => {
          if (seenEventIds.has(event.id)) return false;
          seenEventIds.add(event.id);
          return true;
        });
        if (next.length > 0) {
          controller.enqueue(sseEvent("events", { events: next }));
        }
      };

      const tick = async () => {
        if (closed || signal.aborted) return;
        try {
          await publishSnapshot();
          await publishNewEvents();
          controller.enqueue(sseComment("ping"));
        } catch (error) {
          controller.enqueue(sseEvent("error", {
            message: error instanceof Error ? error.message : "Failed to stream runner job",
          }));
        }
      };

      await tick();
      interval = setInterval(() => {
        void tick();
      }, 1200);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  signal.addEventListener("abort", () => {
    closed = true;
    if (interval) clearInterval(interval);
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
