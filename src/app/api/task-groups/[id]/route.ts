import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { getTaskGroup } from "@/lib/task-group-store";
import { aggregateGroupResults } from "@/lib/agent-coordinator";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await getTaskGroup(id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership
  const ownerCheck = await prisma.taskGroup.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!ownerCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = await aggregateGroupResults(id);

  return NextResponse.json({ group, results });
}
