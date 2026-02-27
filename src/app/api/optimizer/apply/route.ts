import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { applyImprovement, revokeImprovement, getCycleById } from "@/lib/optimizer/optimizer-store";
import type { OptimizationImprovement } from "@/lib/optimizer/types";

// POST /api/optimizer/apply — apply or revoke an improvement
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "apply" | "revoke";
    cycleId?: string;
    improvementId?: string;
    agentKind?: string;
  };

  const { action, cycleId, improvementId, agentKind = "CHIEF_ADVISOR" } = body;
  if (!action || !improvementId) {
    return NextResponse.json({ error: "action and improvementId required" }, { status: 400 });
  }

  if (action === "revoke") {
    await revokeImprovement(session.userId, improvementId);
    return NextResponse.json({ ok: true, action: "revoked" });
  }

  if (action === "apply") {
    if (!cycleId) {
      return NextResponse.json({ error: "cycleId required for apply" }, { status: 400 });
    }
    const cycle = await getCycleById(cycleId, session.userId);
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    const improvement = cycle.improvements.find(
      (imp: OptimizationImprovement) => imp.id === improvementId,
    );
    if (!improvement) {
      return NextResponse.json({ error: "Improvement not found in cycle" }, { status: 404 });
    }

    await applyImprovement(session.userId, cycleId, agentKind, improvement);
    return NextResponse.json({ ok: true, action: "applied" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
