import { InboxItemState } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { InboxItem } from "@/lib/workforce-ui";
import { executePendingActions, type PendingAction } from "@/lib/pending-actions-executor";
import { recordInboxDecision } from "@/lib/outcome-ledger";

type InboxAction = "approve" | "edit" | "ask_agent" | "pause" | "terminate";

export type InboxAuditEntry = {
  id: string;
  action: string;
  summary: string;
  entityId: string;
  createdAt: string;
};

function mapState(state: InboxItemState): NonNullable<InboxItem["state"]> {
  switch (state) {
    case InboxItemState.APPROVED:
      return "approved";
    case InboxItemState.NEEDS_CHANGES:
      return "needs_changes";
    case InboxItemState.AGENT_FOLLOWUP:
      return "agent_followup";
    case InboxItemState.PAUSED:
      return "paused";
    default:
      return "open";
  }
}

function mapActionToState(action: InboxAction): { state: InboxItemState; label: string } {
  if (action === "approve") return { state: InboxItemState.APPROVED, label: "Approved" };
  if (action === "edit") return { state: InboxItemState.NEEDS_CHANGES, label: "Changes requested" };
  if (action === "ask_agent") return { state: InboxItemState.AGENT_FOLLOWUP, label: "Asked agent for follow-up" };
  if (action === "terminate") return { state: InboxItemState.PAUSED, label: "Terminated" };
  return { state: InboxItemState.PAUSED, label: "Paused" };
}

function mapRow(row: {
  id: string;
  type: string;
  summary: string;
  impact: string;
  owner: string;
  department: string;
  state: InboxItemState;
  stateLabel: string;
  updatedAt: Date;
  pendingActionsJson?: string | null;
}): InboxItem {
  return {
    id: row.id,
    type: row.type as InboxItem["type"],
    summary: row.summary,
    impact: row.impact,
    owner: row.owner,
    department: row.department,
    state: mapState(row.state),
    stateLabel: row.stateLabel,
    updatedAt: row.updatedAt.toISOString(),
    pendingActionsJson: row.pendingActionsJson ?? null,
  };
}

export async function getInboxItems(userId?: string | null): Promise<InboxItem[]> {
  if (!userId) return [];
  const rows = await prisma.inboxItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

export async function getInboxOpenApprovalCount(userId?: string | null) {
  if (!userId) return 0;
  return prisma.inboxItem.count({
    where: {
      userId,
      type: "approval",
      state: { notIn: [InboxItemState.APPROVED, InboxItemState.PAUSED] },
    },
  });
}

export async function getInboxAuditLog(userId?: string | null, take = 12): Promise<InboxAuditEntry[]> {
  if (!userId) return [];
  const rows = await prisma.auditLog.findMany({
    where: { userId, scope: "INBOX" },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    entityId: row.entityId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function applyInboxAction(userId: string, id: string, action: InboxAction): Promise<InboxItem | null> {
  const item = await prisma.inboxItem.findFirst({ where: { id, userId } });
  if (!item) return null;

  const next = mapActionToState(action);

  const [updated] = await prisma.$transaction([
    prisma.inboxItem.update({
      where: { id },
      data: { state: next.state, stateLabel: next.label },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        scope: "INBOX",
        entityId: id,
        action: action.toUpperCase(),
        summary: `${next.label}: ${item.summary}`,
        metadata: JSON.stringify({ inboxItemId: id, action }),
      },
    }),
  ]);

  // When approved, fire any pending actions (email sends, webhooks, etc.)
  if (action === "approve" && item.pendingActionsJson) {
    let pendingActions: PendingAction[] = [];
    try {
      const parsed = JSON.parse(item.pendingActionsJson);
      if (Array.isArray(parsed)) pendingActions = parsed as PendingAction[];
    } catch {
      // malformed JSON — skip execution
    }

    if (pendingActions.length > 0) {
      const results = await executePendingActions(pendingActions, userId);
      const executionResultJson = JSON.stringify(results);

      await prisma.inboxItem.update({
        where: { id },
        data: { executionResultJson },
      });

      // Record execution outcomes in audit log
      for (const result of results) {
        await prisma.auditLog.create({
          data: {
            userId,
            scope: "INBOX",
            entityId: id,
            action: `EXECUTE_${result.toolName.toUpperCase()}`,
            summary: result.output.slice(0, 240),
            metadata: JSON.stringify({ inboxItemId: id, toolName: result.toolName, ok: result.ok }),
          },
        });
      }
    }
  }

  // Record inbox decision for outcome tracking (fire-and-forget)
  if (item.sourceId && (action === "approve" || action === "terminate")) {
    recordInboxDecision(userId, item.sourceId, action === "approve").catch(() => {});
  }

  return mapRow(updated);
}
