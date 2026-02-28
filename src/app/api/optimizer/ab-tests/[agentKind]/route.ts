import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { evaluateAbTest, promoteVariant, rollbackVariant } from "@/lib/optimizer/ab-test-store";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ agentKind: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentKind } = await params;
  const evaluation = await evaluateAbTest(session.userId, agentKind);

  const variants = await prisma.promptVariant.findMany({
    where: { userId: session.userId, agentKind, isActive: true },
    orderBy: { isControl: "desc" },
    select: {
      id: true, label: true, isControl: true, isActive: true, trafficPercent: true,
      taskCount: true, avgRating: true, acceptRate: true, revisionRate: true,
    },
  });

  return NextResponse.json({ evaluation, variants });
}

export async function POST(req: Request, { params }: { params: Promise<{ agentKind: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentKind } = await params;
  const body = (await req.json()) as { action: "promote" | "rollback"; variantId?: string };

  if (body.action === "promote" && body.variantId) {
    await promoteVariant(body.variantId);
    return NextResponse.json({ ok: true, action: "promoted" });
  }

  if (body.action === "rollback") {
    await rollbackVariant(session.userId, agentKind);
    return NextResponse.json({ ok: true, action: "rolled_back" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
