import { NextResponse } from "next/server";
import { verifyStripeWebhookEvent } from "@/lib/stripe-checkout";
import { recordStripeCheckoutPayment } from "@/lib/stripe-payments-store";
import { upsertStripeSubscriptionFromWebhook } from "@/lib/stripe-subscriptions-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text().catch(() => "");
  const signature = request.headers.get("stripe-signature");

  try {
    const event = verifyStripeWebhookEvent(rawBody, signature);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data?.object;
      if (session?.id) {
        await recordStripeCheckoutPayment({ stripeEventId: event.id, session });
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data?.object;
      if (session?.id) {
        await recordStripeCheckoutPayment({ stripeEventId: event.id, session });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data?.object;
      if (subscription?.id) {
        await upsertStripeSubscriptionFromWebhook(subscription as never);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook" },
      { status: 400 },
    );
  }
}
