import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { executeGoalStep } from "@/lib/goal-store";
import { prisma } from "@/lib/db";
import { GoalStepStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stepId } = await params;

  // Verify ownership
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const validStatuses = new Set<string>(["PENDING", "IN_PROGRESS", "DONE", "FAILED", "BLOCKED", "SKIPPED"]);
  if (!body.status || !validStatuses.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const step = await prisma.goalStep.findFirst({ where: { id: stepId, goalId: id } });
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  const updated = await prisma.goalStep.update({
    where: { id: stepId },
    data: {
      status: body.status as GoalStepStatus,
      completedAt: body.status === "DONE" ? new Date() : null,
    },
  });

  return NextResponse.json({ step: updated });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stepId } = await params;

  // Verify ownership
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  try {
    const taskId = await executeGoalStep(userId, stepId);
    if (!taskId) return NextResponse.json({ error: "Step cannot be executed" }, { status: 400 });
    return NextResponse.json({ taskId }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Execution failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
