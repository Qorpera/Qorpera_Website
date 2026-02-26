import { NextResponse } from "next/server";
import { authenticateRunnerBearer, getRunnerPolicyForRunner } from "@/lib/runner-control-plane";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const runner = await authenticateRunnerBearer(request.headers.get("authorization"));
  if (!runner) return NextResponse.json({ error: "Unauthorized runner" }, { status: 401 });

  try {
    const resolved = await getRunnerPolicyForRunner(runner.id);
    return NextResponse.json({ ok: true, ...resolved, serverTime: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to resolve runner policy" }, { status: 503 });
  }
}
