import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runOptimizationCycle } from "@/lib/optimizer";
import { prisma } from "@/lib/db";

// POST /api/optimizer/run — trigger a new optimization cycle
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { agentKind?: string };
  const agentKind = body.agentKind ?? "CHIEF_ADVISOR";

  // Prevent parallel runs for the same user+agent
  const running = await prisma.agentOptimizationCycle.findFirst({
    where: { userId: session.userId, agentKind, status: "RUNNING" },
    select: { id: true },
  });
  if (running) {
    return NextResponse.json({ ok: true, cycleId: running.id, already: true });
  }

  // Run async — return the cycleId immediately so the UI can poll
  // We fire-and-forget and let the UI poll /api/optimizer/cycles
  runOptimizationCycle(session.userId, agentKind).catch((e) => {
    console.error("[optimizer] Cycle failed:", e);
  });

  // Get the newly created cycle ID
  await new Promise((r) => setTimeout(r, 300)); // brief wait for createCycle to commit
  const newest = await prisma.agentOptimizationCycle.findFirst({
    where: { userId: session.userId, agentKind, status: "RUNNING" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, cycleId: newest?.id ?? null });
}
