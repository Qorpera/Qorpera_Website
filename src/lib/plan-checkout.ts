import { prisma } from "@/lib/db";

type StripeSession = {
  id: string;
  url?: string | null;
  subscription?: string | null;
};

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key && key.trim() ? key.trim() : null;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
  }

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe request failed (${res.status})`);
  }

  return data as T;
}

export async function createPlanCheckoutSession(input: {
  baseUrl: string;
  userId: string;
  planSubscriptionId: string;
  planSlug: string;
}) {
  const plan = await prisma.plan.findUnique({ where: { slug: input.planSlug } });
  if (!plan || !plan.stripePriceId) {
    throw new Error(`Plan "${input.planSlug}" has no Stripe price configured.`);
  }

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("client_reference_id", input.planSubscriptionId);
  body.set(
    "success_url",
    `${input.baseUrl}/agents?plan_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  body.set("cancel_url", `${input.baseUrl}/pricing?plan_checkout=cancelled`);
  body.set("line_items[0][price]", plan.stripePriceId);
  body.set("line_items[0][quantity]", "1");
  body.set("metadata[userId]", input.userId);
  body.set("metadata[purchaseMode]", "PLAN");
  body.set("metadata[planSubscriptionId]", input.planSubscriptionId);
  body.set("metadata[planSlug]", input.planSlug);
  body.set("subscription_data[metadata][userId]", input.userId);
  body.set("subscription_data[metadata][purchaseMode]", "PLAN");
  body.set("subscription_data[metadata][planSubscriptionId]", input.planSubscriptionId);

  return stripeRequest<StripeSession>("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function cancelStripePlanSubscription(stripeSubscriptionId: string) {
  const body = new URLSearchParams();
  body.set("cancel_at_period_end", "true");

  return stripeRequest<{ id: string; cancel_at_period_end: boolean; current_period_end: number }>(
    `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
  );
}
