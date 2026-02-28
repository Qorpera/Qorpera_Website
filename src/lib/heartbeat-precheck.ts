/**
 * Deterministic pre-check for heartbeat wakes.
 * Pure DB count queries — no LLM cost if nothing to do.
 */

import { prisma } from "@/lib/db";
import { DelegatedTaskStatus } from "@prisma/client";

export type HeartbeatPrecheckResult = {
  shouldWake: boolean;
  signals: string[];
};

export async function runHeartbeatPrecheck(
  userId: string,
  agentTarget: string,
): Promise<HeartbeatPrecheckResult> {
  const signals: string[] = [];
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const [queuedTasks, openInbox, recentFiles, pendingApprovals, staleTasks] = await Promise.all([
    // 1. Queued delegated tasks targeting this agent
    prisma.delegatedTask.count({
      where: {
        userId,
        toAgentTarget: agentTarget,
        status: DelegatedTaskStatus.QUEUED,
      },
    }),

    // 2. Open inbox items
    prisma.inboxItem.count({
      where: {
        userId,
        state: "OPEN",
      },
    }),

    // 3. Recent business file uploads (last 30 min)
    prisma.businessFile.count({
      where: {
        userId,
        createdAt: { gte: thirtyMinAgo },
      },
    }),

    // 4. Pending runner job approvals
    prisma.runnerJob.count({
      where: {
        userId,
        status: "NEEDS_APPROVAL",
      },
    }),

    // 5. Stale RUNNING tasks — agent crashed mid-execution, needs recovery
    prisma.delegatedTask.count({
      where: {
        userId,
        toAgentTarget: agentTarget,
        status: DelegatedTaskStatus.RUNNING,
        updatedAt: { lt: thirtyMinAgo },
      },
    }),
  ]);

  if (queuedTasks > 0) signals.push(`${queuedTasks} queued task(s) for this agent`);
  if (staleTasks > 0) signals.push(`${staleTasks} stale RUNNING task(s) need recovery`);
  if (openInbox > 0) signals.push(`${openInbox} open inbox item(s)`);
  if (recentFiles > 0) signals.push(`${recentFiles} new file(s) uploaded in last 30min`);
  if (pendingApprovals > 0) signals.push(`${pendingApprovals} runner job(s) awaiting approval`);

  return {
    shouldWake: signals.length > 0,
    signals,
  };
}

/**
 * Recover stale RUNNING tasks by resetting them to QUEUED (if retries remain)
 * or marking them FAILED. Called during heartbeat tick.
 */
export async function sweepStaleTasks(userId: string): Promise<number> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const staleTasks = await prisma.delegatedTask.findMany({
    where: {
      userId,
      status: DelegatedTaskStatus.RUNNING,
      updatedAt: { lt: thirtyMinAgo },
    },
    select: { id: true, title: true, toAgentTarget: true, attempts: true, maxAttempts: true },
  });

  let recovered = 0;
  for (const task of staleTasks) {
    const canRetry = task.attempts < (task.maxAttempts || 3);
    await prisma.delegatedTask.update({
      where: { id: task.id },
      data: {
        status: canRetry ? DelegatedTaskStatus.QUEUED : DelegatedTaskStatus.FAILED,
        ...(canRetry ? {} : { completedAt: new Date() }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        scope: "HEARTBEAT_RECOVERY",
        entityId: task.id,
        action: canRetry ? "STALE_REQUEUED" : "STALE_FAILED",
        summary: canRetry
          ? `Recovered stale task "${task.title}" for ${task.toAgentTarget} (attempt ${task.attempts}/${task.maxAttempts})`
          : `Permanently failed stale task "${task.title}" for ${task.toAgentTarget} after ${task.attempts} attempts`,
      },
    }).catch(() => null);

    recovered++;
  }

  return recovered;
}
