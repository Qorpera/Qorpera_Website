import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || token !== process.env.WF_DAEMON_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const agentTarget = searchParams.get("agentTarget");
  const limit = parseInt(searchParams.get("limit") ?? "5");

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const where: Record<string, unknown> = { userId, status: "QUEUED" };
  if (agentTarget) where.toAgentTarget = agentTarget;

  const tasks = await prisma.delegatedTask.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, title: true, toAgentTarget: true, status: true, isLongRunning: true, createdAt: true },
  });

  return NextResponse.json({ tasks });
}
