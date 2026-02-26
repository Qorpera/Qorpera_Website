import { NextResponse } from "next/server";
import { authenticateRunnerBearer, renewRunnerJobLease } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { leaseToken?: string; leaseSeconds?: number };
  if (!body.leaseToken) return NextResponse.json({ error: "leaseToken is required" }, { status: 400 });

  try {
    const job = await renewRunnerJobLease({
      runnerId: runner.id,
      jobId: id,
      leaseToken: body.leaseToken,
      leaseSeconds: body.leaseSeconds,
    });
    return NextResponse.json({ ok: true, job });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to renew runner job lease" }, { status: 409 });
  }
}
