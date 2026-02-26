import { NextResponse } from "next/server";
import { authenticateRunnerBearer, heartbeatRunner, pollRunnerJobs } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { limit?: number; leaseSeconds?: number };

  try {
    await heartbeatRunner({
      runnerId: runner.id,
      ip: request.headers.get("x-forwarded-for") ?? null,
    });
    const result = await pollRunnerJobs({
      runnerId: runner.id,
      limit: body.limit,
      leaseSeconds: body.leaseSeconds,
    });
    return NextResponse.json({ ok: true, ...result, serverTime: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to poll jobs" }, { status: 503 });
  }
}
