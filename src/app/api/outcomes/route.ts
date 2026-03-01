import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getAgentPerformanceProfile } from "@/lib/outcome-ledger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const agentTarget = url.searchParams.get("agentTarget");
  if (!agentTarget) {
    return NextResponse.json({ error: "agentTarget query param is required" }, { status: 400 });
  }

  const windowDays = parseInt(url.searchParams.get("windowDays") ?? "90", 10);

  const profile = await getAgentPerformanceProfile(userId, agentTarget, windowDays);
  return NextResponse.json({ profile });
}
