import { NextResponse } from "next/server";
import { authenticateRunnerBearer, completeRunnerJob } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    leaseToken?: string;
    ok?: boolean;
    result?: Record<string, unknown>;
    errorMessage?: string;
  };
  if (!body.leaseToken) return NextResponse.json({ error: "leaseToken is required" }, { status: 400 });

  try {
    const job = await completeRunnerJob({
      runnerId: runner.id,
      jobId: id,
      leaseToken: body.leaseToken,
      ok: Boolean(body.ok),
      result: body.result ?? null,
      errorMessage: body.errorMessage ?? null,
    });
    return NextResponse.json({ ok: true, job });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to complete runner job" }, { status: 400 });
  }
}
