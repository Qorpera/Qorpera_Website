import { NextResponse } from "next/server";
import { authenticateRunnerBearer, heartbeatRunner } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    hostName?: string;
    osName?: string;
    runnerVersion?: string;
    capabilities?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  try {
    const updated = await heartbeatRunner({
      runnerId: runner.id,
      ip: request.headers.get("x-forwarded-for") ?? null,
      hostName: body.hostName ?? null,
      osName: body.osName ?? null,
      runnerVersion: body.runnerVersion ?? null,
      capabilities: body.capabilities ?? null,
      metadata: body.metadata ?? null,
    });
    return NextResponse.json({ ok: true, runner: updated, serverTime: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Heartbeat failed" }, { status: 503 });
  }
}
