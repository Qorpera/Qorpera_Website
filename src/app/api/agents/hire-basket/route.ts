import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { type HireAgentKind, type HireSchedule } from "@/lib/agent-hiring";
import { createStripeBasketCheckoutSession, isStripeCheckoutEnabledForPlan } from "@/lib/stripe-checkout";
import { ensureStripeFinanceArtifacts } from "@/lib/stripe-payments-store";
import { createAgentPurchaseOrder, markOrderCheckoutCreated, markOrderCheckoutFailed } from "@/lib/agent-purchase-orders";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";

function parseBaseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}

const BasketHireBody = z.object({
  items: z
    .array(
      z.object({
        agentKind: z.enum([
          "ASSISTANT",
          "SALES_REP",
          "CUSTOMER_SUCCESS",
          "MARKETING_COORDINATOR",
          "FINANCE_ANALYST",
          "OPERATIONS_MANAGER",
          "EXECUTIVE_ASSISTANT",
        ]),
        schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("MONTHLY"),
      }),
    )
    .min(1)
    .max(10),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BasketHireBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { items } = parsed.data as { items: { agentKind: HireAgentKind; schedule: HireSchedule }[] };

  for (const item of items) {
    if (!isStripeCheckoutEnabledForPlan(item.agentKind, item.schedule)) {
      return NextResponse.json(
        { error: `Stripe is not configured for ${item.agentKind} (${item.schedule})` },
        { status: 400 },
      );
    }
  }

  const orders = await Promise.all(
    items.map((item) => createAgentPurchaseOrder({ userId, agentKind: item.agentKind, schedule: item.schedule })),
  );
  const orderIds = orders.map((o) => o.id);

  try {
    await ensureStripeFinanceArtifacts(userId);
    const stripeSession = await createStripeBasketCheckoutSession({
      baseUrl: parseBaseUrl(req),
      userId,
      orderIds,
      items,
    });

    if (!stripeSession?.url) {
      await Promise.all(
        orderIds.map((id) => markOrderCheckoutFailed({ orderId: id, reason: "Stripe checkout session was not created." })),
      );
      return NextResponse.json({ error: "Stripe checkout session could not be created." }, { status: 502 });
    }

    await Promise.all(
      orderIds.map((id) => markOrderCheckoutCreated({ orderId: id, checkoutSessionId: stripeSession.id })),
    );

    return NextResponse.json({ url: stripeSession.url, orderIds });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe checkout failed";
    await Promise.all(
      orderIds.map((id) => markOrderCheckoutFailed({ orderId: id, reason: msg }).catch(() => undefined)),
    );
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
