/**
 * Checkpoint store for long-running tasks.
 * Saves and restores execution state so tasks can survive restarts.
 */

import { prisma } from "@/lib/db";

export type CheckpointData = {
  phaseIndex: number;
  phaseName: string;
  messagesJson?: string;
  tracesJson?: string;
  intermediateOutput?: string;
  turnsCompleted: number;
  totalToolCalls: number;
  stateJson?: string;
};

export async function saveCheckpoint(
  delegatedTaskId: string,
  data: CheckpointData,
): Promise<string> {
  const checkpoint = await prisma.taskCheckpoint.create({
    data: {
      delegatedTaskId,
      phaseIndex: data.phaseIndex,
      phaseName: data.phaseName,
      messagesJson: data.messagesJson ?? null,
      tracesJson: data.tracesJson ?? null,
      intermediateOutput: data.intermediateOutput ?? null,
      turnsCompleted: data.turnsCompleted,
      totalToolCalls: data.totalToolCalls,
      stateJson: data.stateJson ?? null,
    },
  });

  await prisma.delegatedTask.update({
    where: { id: delegatedTaskId },
    data: {
      lastCheckpointAt: new Date(),
      currentPhase: data.phaseIndex,
      progressPct: Math.min(100, Math.max(0, data.phaseIndex)),
    },
  });

  return checkpoint.id;
}

export async function getLatestCheckpoint(
  delegatedTaskId: string,
): Promise<CheckpointData | null> {
  const checkpoint = await prisma.taskCheckpoint.findFirst({
    where: { delegatedTaskId },
    orderBy: { createdAt: "desc" },
  });
  if (!checkpoint) return null;

  return {
    phaseIndex: checkpoint.phaseIndex,
    phaseName: checkpoint.phaseName,
    messagesJson: checkpoint.messagesJson ?? undefined,
    tracesJson: checkpoint.tracesJson ?? undefined,
    intermediateOutput: checkpoint.intermediateOutput ?? undefined,
    turnsCompleted: checkpoint.turnsCompleted,
    totalToolCalls: checkpoint.totalToolCalls,
    stateJson: checkpoint.stateJson ?? undefined,
  };
}

export async function listCheckpoints(
  delegatedTaskId: string,
): Promise<Array<{ id: string; phaseIndex: number; phaseName: string; turnsCompleted: number; createdAt: Date }>> {
  return prisma.taskCheckpoint.findMany({
    where: { delegatedTaskId },
    orderBy: { phaseIndex: "asc" },
    select: { id: true, phaseIndex: true, phaseName: true, turnsCompleted: true, createdAt: true },
  });
}

export async function deleteCheckpoints(delegatedTaskId: string): Promise<number> {
  const result = await prisma.taskCheckpoint.deleteMany({
    where: { delegatedTaskId },
  });
  return result.count;
}
