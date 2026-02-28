import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCycles, getLatestCycle, isDue } from "@/lib/optimizer/optimizer-store";
import { getAppliedApplications } from "@/lib/optimizer/optimizer-store";

// GET /api/optimizer/cycles?agentKind=CHIEF_ADVISOR
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const agentKind = url.searchParams.get("agentKind") ?? "CHIEF_ADVISOR";

  const [cycles, latestDetail, appliedApplications, autoRun] = await Promise.all([
    listCycles(session.userId, agentKind, 5),
    getLatestCycle(session.userId, agentKind),
    getAppliedApplications(session.userId, agentKind),
    isDue(session.userId),
  ]);

  return NextResponse.json({
    ok: true,
    cycles,
    latestDetail: latestDetail
      ? {
          ...latestDetail,
          // convert Set to array for JSON serialization
          appliedImprovementIds: Array.from(latestDetail.appliedImprovementIds),
        }
      : null,
    appliedApplications,
    autoRun,
  });
}
