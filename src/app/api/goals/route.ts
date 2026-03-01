import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { listGoals, createGoal, type GoalInput } from "@/lib/goal-store";
import { GoalStatus, GoalPriority } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as GoalStatus | null;
  const agentTarget = url.searchParams.get("agentTarget");

  const goals = await listGoals(userId, {
    status: status ?? undefined,
    agentTarget: agentTarget ?? undefined,
  });
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<GoalInput>;
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const validPriorities = new Set<string>(["URGENT", "HIGH", "NORMAL", "LOW"]);
  const priority = body.priority && validPriorities.has(body.priority) ? body.priority as GoalPriority : undefined;

  try {
    const goal = await createGoal(userId, {
      title: body.title,
      description: body.description,
      priority,
      agentTarget: body.agentTarget,
      parentGoalId: body.parentGoalId,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create goal";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
