/**
 * Approval expiry: sweeps open inbox approval items past their expiresAt,
 * escalates to CHIEF_ADVISOR if enabled, then closes the item.
 * Called from the scheduler tick.
 */
import { prisma } from "@/lib/db";
import { getAppPreferences } from "@/lib/settings-store";

export async function checkAndExpireApprovals(userId: string): Promise<number> {
  const now = new Date();

  const expiredItems = await prisma.inboxItem.findMany({
    where: { userId, state: "OPEN", expiresAt: { lte: now } },
    select: { id: true, summary: true, impact: true, digest: true },
  });

  if (expiredItems.length === 0) return 0;

  const prefs = await getAppPreferences(userId);

  for (const item of expiredItems) {
    if (prefs.escalationEnabled) {
      // Escalate to CHIEF_ADVISOR via delegated task
      try {
        const { createDelegatedTask } = await import("@/lib/orchestration-store");
        await createDelegatedTask(userId, {
          fromAgent: "SYSTEM",
          toAgentTarget: "CHIEF_ADVISOR",
          title: `Expired approval: ${item.impact}`,
          instructions: [
            "An approval request expired without human review. Please assess and decide:",
            "- Determine whether the proposed action should proceed or be discarded.",
            "- If proceeding, implement the action directly.",
            "- Log your decision as a business note.",
            "",
            `Summary: ${item.summary}`,
            item.digest ? `\nFull digest:\n${item.digest}` : "",
          ].join("\n"),
          triggerSource: "APPROVAL_EXPIRY",
        });
      } catch {
        // Escalation failed — still close the item
      }
    }

    await prisma.inboxItem.update({
      where: { id: item.id },
      data: {
        state: "APPROVED",
        stateLabel: prefs.escalationEnabled
          ? "Expired — escalated to Chief Advisor"
          : "Expired — auto-closed",
      },
    });
  }

  return expiredItems.length;
}
