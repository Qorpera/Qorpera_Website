/**
 * Daemon store — manages always-on agent daemon state.
 */

import { prisma } from "@/lib/db";

const STALE_THRESHOLD_MS = 60_000; // 60 seconds without heartbeat = stale

export type DaemonStatus = {
  processId: string;
  status: string;
  startedAt: Date;
  lastSeenAt: Date;
  activeAgents: number;
};

export async function getDaemonStatus(): Promise<DaemonStatus | null> {
  const heartbeat = await prisma.agentDaemonHeartbeat.findFirst({
    where: { status: "RUNNING" },
    orderBy: { lastSeenAt: "desc" },
  });
  if (!heartbeat) return null;
  return {
    processId: heartbeat.processId,
    status: heartbeat.status,
    startedAt: heartbeat.startedAt,
    lastSeenAt: heartbeat.lastSeenAt,
    activeAgents: heartbeat.activeAgents,
  };
}

export async function getAlwaysOnAgents(userId: string): Promise<Array<{ agentTarget: string; idleCheckIntervalMs: number; maxConcurrentTasks: number }>> {
  const configs = await prisma.agentAutomationConfig.findMany({
    where: { userId, alwaysOn: true },
    orderBy: { daemonPriorityOrder: "asc" },
    select: { agentTarget: true, idleCheckIntervalMs: true, maxConcurrentTasks: true },
  });
  return configs;
}

export async function getAgentWorkQueue(userId: string, agentTarget: string): Promise<Array<{ id: string; title: string; status: string }>> {
  const tasks = await prisma.delegatedTask.findMany({
    where: {
      userId,
      toAgentTarget: agentTarget,
      status: { in: ["QUEUED"] },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true, title: true, status: true },
  });
  return tasks;
}

export async function upsertDaemonHeartbeat(processId: string, activeAgents: number): Promise<void> {
  await prisma.agentDaemonHeartbeat.upsert({
    where: { processId },
    create: { processId, status: "RUNNING", activeAgents },
    update: { lastSeenAt: new Date(), activeAgents },
  });
}

export async function sweepStaleDaemons(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
  const result = await prisma.agentDaemonHeartbeat.updateMany({
    where: { status: "RUNNING", lastSeenAt: { lt: cutoff } },
    data: { status: "STALE" },
  });
  return result.count;
}
