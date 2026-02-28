import { getHireCatalogItem, type HireAgentKind, type HireSchedule } from "@/lib/agent-hiring";
import crypto from "node:crypto";

type StripeSession = {
  id: string;
  url?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  mode?: string | null;
  created?: number | null;
  subscription?: string | null;
};

type StripeWebhookEvent<T = unknown> = {
  id: string;
  type: string;
  data?: { object?: T };
};

function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key && key.trim() ? key.trim() : null;
}

const SETUP_PRICE_ENV: Partial<Record<HireAgentKind, string>> = {
  ASSISTANT: "STRIPE_PRICE_ASSISTANT",
  SALES_REP: "STRIPE_PRICE_SALES_REP",
  CUSTOMER_SUCCESS: "STRIPE_PRICE_CUSTOMER_SUCCESS",
  MARKETING_COORDINATOR: "STRIPE_PRICE_MARKETING_COORDINATOR",
  FINANCE_ANALYST: "STRIPE_PRICE_FINANCE_ANALYST",
  OPERATIONS_MANAGER: "STRIPE_PRICE_OPERATIONS_MANAGER",
  EXECUTIVE_ASSISTANT: "STRIPE_PRICE_EXECUTIVE_ASSISTANT",
};

const RECURRING_PRICE_ENV: Record<HireAgentKind, Record<HireSchedule, string>> = {
  ASSISTANT: {
    DAILY: "STRIPE_SUB_PRICE_ASSISTANT_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_ASSISTANT_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_ASSISTANT_MONTHLY",
  },
  SALES_REP: {
    DAILY: "STRIPE_SUB_PRICE_SALES_REP_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_SALES_REP_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_SALES_REP_MONTHLY",
  },
  CUSTOMER_SUCCESS: {
    DAILY: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_MONTHLY",
  },
  MARKETING_COORDINATOR: {
    DAILY: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_MONTHLY",
  },
  FINANCE_ANALYST: {
    DAILY: "STRIPE_SUB_PRICE_FINANCE_ANALYST_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_FINANCE_ANALYST_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_FINANCE_ANALYST_MONTHLY",
  },
  OPERATIONS_MANAGER: {
    DAILY: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_MONTHLY",
  },
  EXECUTIVE_ASSISTANT: {
    DAILY: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_MONTHLY",
  },
  RESEARCH_ANALYST: {
    DAILY: "STRIPE_SUB_PRICE_RESEARCH_ANALYST_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_RESEARCH_ANALYST_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_RESEARCH_ANALYST_MONTHLY",
  },
  SEO_SPECIALIST: {
    DAILY: "STRIPE_SUB_PRICE_SEO_SPECIALIST_DAILY",
    WEEKLY: "STRIPE_SUB_PRICE_SEO_SPECIALIST_WEEKLY",
    MONTHLY: "STRIPE_SUB_PRICE_SEO_SPECIALIST_MONTHLY",
  },
};

function stripePriceId(kind: HireAgentKind) {
  const envVar = SETUP_PRICE_ENV[kind];
  return envVar ? process.env[envVar]?.trim() || null : null;
}

function stripeRecurringPriceId(kind: HireAgentKind, schedule: HireSchedule) {
  const envVar = RECURRING_PRICE_ENV[kind]?.[schedule];
  return envVar ? process.env[envVar]?.trim() || null : null;
}

export function isStripeCheckoutEnabledForPlan(kind: HireAgentKind, schedule: HireSchedule) {
  return Boolean(stripeSecretKey() && stripeRecurringPriceId(kind, schedule));
}

export function isStripeCheckoutEnabledForKind(kind: HireAgentKind) {
  return (
    isStripeCheckoutEnabledForPlan(kind, "DAILY") ||
    isStripeCheckoutEnabledForPlan(kind, "WEEKLY") ||
    isStripeCheckoutEnabledForPlan(kind, "MONTHLY")
  );
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

export async function cancelStripeSubscription(stripeSubscriptionId: string) {
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

export async function createStripeCheckoutSession(input: {
  baseUrl: string;
  userId: string;
  orderId: string;
  agentKind: HireAgentKind;
  schedule: HireSchedule;
}) {
  const setupPriceId = stripePriceId(input.agentKind);
  const recurringPriceId = stripeRecurringPriceId(input.agentKind, input.schedule);
  const catalogItem = getHireCatalogItem(input.agentKind);

  if (!recurringPriceId || !catalogItem) {
    return null;
  }

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("client_reference_id", input.orderId);
  body.set(
    "success_url",
    `${input.baseUrl}/agents/hire?checkout=success&order_id=${encodeURIComponent(input.orderId)}&session_id={CHECKOUT_SESSION_ID}`,
  );
  body.set(
    "cancel_url",
    `${input.baseUrl}/agents/hire?checkout=cancelled&order_id=${encodeURIComponent(input.orderId)}&agentKind=${input.agentKind}`,
  );
  body.set("line_items[0][price]", recurringPriceId);
  body.set("line_items[0][quantity]", "1");
  if (setupPriceId) {
    body.set("line_items[1][price]", setupPriceId);
    body.set("line_items[1][quantity]", "1");
  }
  body.set("metadata[userId]", input.userId);
  body.set("metadata[orderId]", input.orderId);
  body.set("metadata[agentKind]", input.agentKind);
  body.set("metadata[schedule]", input.schedule);
  body.set("metadata[itemTitle]", catalogItem.title);
  body.set("subscription_data[metadata][userId]", input.userId);
  body.set("subscription_data[metadata][orderId]", input.orderId);
  body.set("subscription_data[metadata][agentKind]", input.agentKind);
  body.set("subscription_data[metadata][schedule]", input.schedule);

  return stripeRequest<StripeSession>("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function createStripeBasketCheckoutSession(input: {
  baseUrl: string;
  userId: string;
  orderIds: string[];
  items: { agentKind: HireAgentKind; schedule: HireSchedule }[];
}) {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("client_reference_id", input.orderIds[0]);
  body.set(
    "success_url",
    `${input.baseUrl}/agents/hire/basket?checkout=success&order_ids=${encodeURIComponent(input.orderIds.join(","))}`,
  );
  body.set("cancel_url", `${input.baseUrl}/agents/hire/basket?checkout=cancelled`);

  let lineIdx = 0;
  for (const item of input.items) {
    const recurringPriceId = stripeRecurringPriceId(item.agentKind, item.schedule);
    const setupPriceId = stripePriceId(item.agentKind);
    if (!recurringPriceId) continue;
    body.set(`line_items[${lineIdx}][price]`, recurringPriceId);
    body.set(`line_items[${lineIdx}][quantity]`, "1");
    lineIdx++;
    if (setupPriceId) {
      body.set(`line_items[${lineIdx}][price]`, setupPriceId);
      body.set(`line_items[${lineIdx}][quantity]`, "1");
      lineIdx++;
    }
  }

  body.set("metadata[userId]", input.userId);
  body.set("metadata[orderIds]", input.orderIds.join(","));
  // Single-item backward compat fields
  if (input.items.length === 1) {
    body.set("metadata[orderId]", input.orderIds[0]);
    body.set("metadata[agentKind]", input.items[0].agentKind);
    body.set("metadata[schedule]", input.items[0].schedule);
    body.set("subscription_data[metadata][userId]", input.userId);
    body.set("subscription_data[metadata][orderId]", input.orderIds[0]);
    body.set("subscription_data[metadata][agentKind]", input.items[0].agentKind);
    body.set("subscription_data[metadata][schedule]", input.items[0].schedule);
  } else {
    body.set("subscription_data[metadata][userId]", input.userId);
    body.set("subscription_data[metadata][orderIds]", input.orderIds.join(","));
  }

  return stripeRequest<StripeSession>("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  if (!sessionId || !stripeSecretKey()) return null;
  return stripeRequest<StripeSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  return secret && secret.trim() ? secret.trim() : null;
}

export function verifyStripeWebhookEvent(rawBody: string, signatureHeader: string | null) {
  const secret = stripeWebhookSecret();
  if (!secret) throw new Error("Stripe webhook is not configured (missing STRIPE_WEBHOOK_SECRET).");
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1List = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || !v1List.length) throw new Error("Invalid Stripe-Signature header.");

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const valid = v1List.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  });
  if (!valid) throw new Error("Invalid Stripe webhook signature.");

  const tsMs = Number(timestamp) * 1000;
  if (Number.isFinite(tsMs) && Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
    throw new Error("Stripe webhook timestamp is outside the allowed tolerance.");
  }

  return JSON.parse(rawBody) as StripeWebhookEvent<StripeSession>;
}
