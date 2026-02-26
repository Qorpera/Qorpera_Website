import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { appendRunnerJobEvents, authenticateRunnerBearer, listRunnerJobEventsForUser } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const events = await listRunnerJobEventsForUser(session.userId, id, 500);
    return NextResponse.json({ events });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to list events" }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    leaseToken?: string;
    events?: Array<{ eventType?: string; level?: string; message?: string; data?: Record<string, unknown> | null }>;
  };
  try {
    const result = await appendRunnerJobEvents({
      runnerId: runner.id,
      jobId: id,
      leaseToken: body.leaseToken,
      events: Array.isArray(body.events)
        ? body.events.map((e) => ({
            eventType: typeof e.eventType === "string" ? e.eventType : "log",
            level: typeof e.level === "string" ? e.level : "info",
            message: typeof e.message === "string" ? e.message : "",
            data: e.data ?? null,
          }))
        : [],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to append events" }, { status: 400 });
  }
}
