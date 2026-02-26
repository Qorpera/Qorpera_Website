import { NextResponse } from "next/server";
import { authenticateRunnerBearer, startRunnerJob } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { leaseToken?: string };
  if (!body.leaseToken) return NextResponse.json({ error: "leaseToken is required" }, { status: 400 });

  try {
    const job = await startRunnerJob({ runnerId: runner.id, jobId: id, leaseToken: body.leaseToken });
    return NextResponse.json({ ok: true, job });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to start runner job" }, { status: 400 });
  }
}
