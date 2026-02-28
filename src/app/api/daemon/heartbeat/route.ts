import { NextResponse } from "next/server";
import { upsertDaemonHeartbeat, getAlwaysOnAgents, sweepStaleDaemons } from "@/lib/daemon-store";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || token !== process.env.WF_DAEMON_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { processId: string; activeAgents: number; userId: string };

  await upsertDaemonHeartbeat(body.processId, body.activeAgents);
  await sweepStaleDaemons();

  const alwaysOnAgents = await getAlwaysOnAgents(body.userId);

  // Get queued task counts per agent
  const queuedCounts = await Promise.all(
    alwaysOnAgents.map(async (a) => {
      const count = await prisma.delegatedTask.count({
        where: { userId: body.userId, toAgentTarget: a.agentTarget, status: "QUEUED" },
      });
      return { agentTarget: a.agentTarget, queuedTasks: count };
    }),
  );

  return NextResponse.json({ agents: alwaysOnAgents, queuedCounts });
}
