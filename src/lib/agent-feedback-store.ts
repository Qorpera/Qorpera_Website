import { prisma } from "@/lib/db";

export async function createFeedback(
  userId: string,
  agentKind: string,
  message: string,
  sourceRef?: string,
) {
  const row = await prisma.agentFeedback.create({
    data: { userId, agentKind, message, sourceRef },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "AGENT_FEEDBACK",
      entityId: row.id,
      action: "SUBMIT",
      summary: `Feedback on ${agentKind}: ${message.slice(0, 80)}${message.length > 80 ? "…" : ""}`,
    },
  });

  return row;
}

export async function listAllFeedback(opts?: { userId?: string; cursor?: string; limit?: number }) {
  const limit = Math.min(Math.max(1, opts?.limit ?? 50), 200);

  const rows = await prisma.agentFeedback.findMany({
    where: opts?.userId ? { userId: opts.userId } : {},
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: { user: { select: { email: true } } },
  });

  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;
  const nextCursor = hasNext ? items[items.length - 1].id : null;

  return { items, nextCursor };
}
