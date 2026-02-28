import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.taskGroup.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { messages: true, workspace: true } } },
  });

  return NextResponse.json({ groups });
}
