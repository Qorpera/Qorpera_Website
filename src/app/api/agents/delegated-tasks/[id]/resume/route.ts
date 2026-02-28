import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.delegatedTask.findFirst({
    where: { id, userId: session.userId, isLongRunning: true },
  });

  if (!task) return NextResponse.json({ error: "Not found or not a long-running task" }, { status: 404 });
  if (task.status === "RUNNING") return NextResponse.json({ error: "Task is already running" }, { status: 409 });
  if (task.status === "DONE") return NextResponse.json({ error: "Task is already completed" }, { status: 409 });

  // Reset to QUEUED so scheduler picks it up
  await prisma.delegatedTask.update({
    where: { id },
    data: { status: "QUEUED" },
  });

  return NextResponse.json({ ok: true, message: "Task re-queued for resumption from last checkpoint" });
}
