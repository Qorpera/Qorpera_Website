import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";
import { listCheckpoints } from "@/lib/checkpoint-store";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.delegatedTask.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      title: true,
      status: true,
      isLongRunning: true,
      currentPhase: true,
      totalPhases: true,
      progressPct: true,
      lastCheckpointAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const checkpoints = await listCheckpoints(id);

  return NextResponse.json({ task, checkpoints });
}
