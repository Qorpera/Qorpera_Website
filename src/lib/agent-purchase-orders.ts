import { prisma } from "@/lib/db";
import { getHireCatalogItem, type HireAgentKind, type HireSchedule } from "@/lib/agent-hiring";

export type OrderStatus =
  | "PENDING"
  | "CHECKOUT_CREATED"
  | "CHECKOUT_FAILED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLED"
  | "PAYMENT_FAILED";

function orderDelegate() {
  return (prisma as unknown as { agentPurchaseOrder?: typeof prisma.agentPurchaseOrder }).agentPurchaseOrder;
}

export async function createAgentPurchaseOrder(input: {
  userId: string;
  agentKind: HireAgentKind;
  schedule: HireSchedule;
}) {
  const catalog = getHireCatalogItem(input.agentKind);
  if (!catalog) throw new Error("Agent is not available for purchase");
  const delegate = orderDelegate();
  if (!delegate) throw new Error("Order system unavailable. Run Prisma migration/generate and restart the server.");

  return delegate.create({
    data: {
      userId: input.userId,
      agentKind: input.agentKind,
      schedule: input.schedule,
      amountCents: catalog.recurringCents[input.schedule],
      currency: "usd",
      status: "PENDING",
    },
  });
}

export async function markOrderCheckoutCreated(input: { orderId: string; checkoutSessionId: string }) {
  const delegate = orderDelegate();
  if (!delegate) return null;
  return delegate.update({
    where: { id: input.orderId },
    data: {
      checkoutSessionId: input.checkoutSessionId,
      status: "CHECKOUT_CREATED",
      failureReason: null,
    },
  });
}

export async function markOrderCheckoutFailed(input: { orderId: string; reason: string }) {
  const delegate = orderDelegate();
  if (!delegate) return null;
  return delegate.update({
    where: { id: input.orderId },
    data: {
      status: "CHECKOUT_FAILED",
      failureReason: input.reason.slice(0, 500),
    },
  });
}

export async function getOrderForUserById(userId: string, orderId: string) {
  const delegate = orderDelegate();
  if (!delegate) return null;
  return delegate.findFirst({
    where: { id: orderId, userId },
  });
}

export async function getOrderForUserByCheckoutSession(userId: string, checkoutSessionId: string) {
  const delegate = orderDelegate();
  if (!delegate) return null;
  return delegate.findFirst({
    where: { checkoutSessionId, userId },
  });
}
