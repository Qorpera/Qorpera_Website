import { prisma } from "@/lib/db";

type StripeSubscriptionLike = {
  id: string;
  customer?: string | null;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
    }>;
  } | null;
  metadata?: Record<string, string> | null;
};

function toDateOrNull(ts?: number | null) {
  return typeof ts === "number" && Number.isFinite(ts) ? new Date(ts * 1000) : null;
}

function subscriptionDelegate() {
  return (prisma as unknown as { stripeSubscription?: typeof prisma.stripeSubscription }).stripeSubscription;
}

export async function upsertStripeSubscriptionFromWebhook(sub: StripeSubscriptionLike) {
  const delegate = subscriptionDelegate();
  if (!delegate) return null;

  const metadata = sub.metadata ?? {};
  const orderId = metadata.orderId?.trim() || null;
  const userIdFromMetadata = metadata.userId?.trim() || null;

  const order = orderId
    ? await prisma.agentPurchaseOrder.findUnique({ where: { id: orderId } })
    : await prisma.agentPurchaseOrder.findFirst({
        where: { stripeSubscriptionId: sub.id },
        orderBy: { createdAt: "desc" },
      });
  const userId = order?.userId ?? userIdFromMetadata;
  if (!userId) return null;

  const row = await delegate.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      stripeCustomerId: sub.customer?.toString() ?? null,
      stripePriceId: sub.items?.data?.[0]?.price?.id ?? null,
      status: (sub.status || "incomplete").slice(0, 60),
      agentKind: metadata.agentKind?.slice(0, 80) || order?.agentKind || null,
      schedule: metadata.schedule?.slice(0, 80) || order?.schedule || null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      canceledAt: toDateOrNull(sub.canceled_at),
      currentPeriodStart: toDateOrNull(sub.current_period_start),
      currentPeriodEnd: toDateOrNull(sub.current_period_end),
      metadataJson: JSON.stringify(metadata),
    },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer?.toString() ?? null,
      stripePriceId: sub.items?.data?.[0]?.price?.id ?? null,
      status: (sub.status || "incomplete").slice(0, 60),
      agentKind: metadata.agentKind?.slice(0, 80) || order?.agentKind || null,
      schedule: metadata.schedule?.slice(0, 80) || order?.schedule || null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      canceledAt: toDateOrNull(sub.canceled_at),
      currentPeriodStart: toDateOrNull(sub.current_period_start),
      currentPeriodEnd: toDateOrNull(sub.current_period_end),
      metadataJson: JSON.stringify(metadata),
    },
  });

  // When subscription is fully canceled, disable the matching HiredJob
  if (row.status === "canceled" && row.agentKind) {
    const kind = row.agentKind as "ASSISTANT" | "PROJECT_MANAGER";
    await prisma.hiredJob.updateMany({
      where: { userId, agentKind: kind, enabled: true },
      data: { enabled: false },
    });
  }

  if (order) {
    let orderStatus: string | null = null;
    if (row.status === "active" || row.status === "trialing") orderStatus = order.fulfilledAt ? "FULFILLED" : "PAID";
    if (row.status === "past_due" || row.status === "unpaid") orderStatus = "PAYMENT_FAILED";
    if (row.status === "canceled" || row.status === "incomplete_expired") orderStatus = "PAYMENT_FAILED";

    await prisma.agentPurchaseOrder.update({
      where: { id: order.id },
      data: {
        stripeSubscriptionId: row.stripeSubscriptionId,
        status: orderStatus ?? order.status,
        failureReason:
          row.status === "past_due"
            ? "Subscription is past due."
            : row.status === "canceled"
              ? "Subscription canceled."
              : order.failureReason,
      },
    });
  }

  return row;
}
