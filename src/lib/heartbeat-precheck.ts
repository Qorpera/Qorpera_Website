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

  const [queuedTasks, openInbox, recentFiles, pendingApprovals] = await Promise.all([
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
  ]);

  if (queuedTasks > 0) signals.push(`${queuedTasks} queued task(s) for this agent`);
  if (openInbox > 0) signals.push(`${openInbox} open inbox item(s)`);
  if (recentFiles > 0) signals.push(`${recentFiles} new file(s) uploaded in last 30min`);
  if (pendingApprovals > 0) signals.push(`${pendingApprovals} runner job(s) awaiting approval`);

  return {
    shouldWake: signals.length > 0,
    signals,
  };
}
