import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { getGoal, updateGoalStatus } from "@/lib/goal-store";
import { GoalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await getGoal(userId, id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Include steps
  const steps = await prisma.goalStep.findMany({
    where: { goalId: id },
    orderBy: { stepOrder: "asc" },
  });

  return NextResponse.json({ goal, steps });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string; title?: string; description?: string; priority?: string };

  if (body.status) {
    const validStatuses = new Set<string>(["ACTIVE", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]);
    if (!validStatuses.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updated = await updateGoalStatus(userId, id, body.status as GoalStatus);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ goal: updated });
  }

  // General field update
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title) data.title = body.title.slice(0, 240);
  if (body.description !== undefined) data.description = body.description.slice(0, 4000);
  if (body.priority) {
    const validPriorities = new Set<string>(["URGENT", "HIGH", "NORMAL", "LOW"]);
    if (validPriorities.has(body.priority)) data.priority = body.priority;
  }

  const updated = await prisma.goal.update({ where: { id }, data });
  return NextResponse.json({ goal: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
