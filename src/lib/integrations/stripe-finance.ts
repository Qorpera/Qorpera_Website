/**
 * Stripe read-only finance helpers.
 * Uses the Stripe API key stored as a SkillCredential (varName: STRIPE_SECRET_KEY).
 * All operations are read-only: list customers, revenue, subscriptions, invoices.
 */

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeFetch(apiKey: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${STRIPE_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Stripe API ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function listCustomers(apiKey: string, limit = 20) {
  const data = await stripeFetch(apiKey, "/customers", { limit: String(Math.min(limit, 100)) });
  const customers = data.data as Array<{ id: string; email: string | null; name: string | null; created: number; currency: string | null; balance: number }>;
  return customers.map((c) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    createdAt: new Date(c.created * 1000).toISOString(),
    currency: c.currency,
    balance: c.balance,
  }));
}

export async function listSubscriptions(apiKey: string, status: "active" | "all" = "active", limit = 20) {
  const params: Record<string, string> = { limit: String(Math.min(limit, 100)) };
  if (status !== "all") params.status = status;
  const data = await stripeFetch(apiKey, "/subscriptions", params);
  const subs = data.data as Array<{
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    customer: string;
    items: { data: Array<{ price: { unit_amount: number | null; currency: string; recurring?: { interval: string } } }> };
  }>;
  return subs.map((s) => ({
    id: s.id,
    status: s.status,
    customerId: s.customer,
    currentPeriodStart: new Date(s.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(s.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: s.cancel_at_period_end,
    amount: s.items.data[0]?.price.unit_amount ?? 0,
    currency: s.items.data[0]?.price.currency ?? "usd",
    interval: s.items.data[0]?.price.recurring?.interval ?? "month",
  }));
}

export async function listInvoices(apiKey: string, limit = 20) {
  const data = await stripeFetch(apiKey, "/invoices", { limit: String(Math.min(limit, 100)), status: "paid" });
  const invoices = data.data as Array<{
    id: string;
    number: string | null;
    customer_email: string | null;
    amount_paid: number;
    currency: string;
    status: string;
    created: number;
    period_start: number;
    period_end: number;
  }>;
  return invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    customerEmail: inv.customer_email,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    createdAt: new Date(inv.created * 1000).toISOString(),
    periodStart: new Date(inv.period_start * 1000).toISOString(),
    periodEnd: new Date(inv.period_end * 1000).toISOString(),
  }));
}

export async function getRevenueOverview(apiKey: string) {
  // Fetch balance, recent charges, and MRR from active subscriptions
  const [balanceData, chargesData, subsData] = await Promise.all([
    stripeFetch(apiKey, "/balance"),
    stripeFetch(apiKey, "/charges", { limit: "100", created: String(Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000)) }),
    stripeFetch(apiKey, "/subscriptions", { status: "active", limit: "100" }),
  ]);

  const balance = balanceData.available as Array<{ amount: number; currency: string }>;
  const charges = chargesData.data as Array<{ amount: number; currency: string; paid: boolean; created: number }>;
  const subs = subsData.data as Array<{ items: { data: Array<{ price: { unit_amount: number | null; currency: string; recurring?: { interval: string } } }> } }>;

  const last30DaysRevenue = charges
    .filter((c) => c.paid)
    .reduce((sum, c) => sum + c.amount, 0);

  const mrrCents = subs.reduce((sum, s) => {
    const price = s.items.data[0]?.price;
    const amount = price?.unit_amount ?? 0;
    const interval = price?.recurring?.interval ?? "month";
    const monthlyAmount = interval === "year" ? Math.round(amount / 12) : amount;
    return sum + monthlyAmount;
  }, 0);

  return {
    availableBalance: balance.map((b) => ({ amount: b.amount / 100, currency: b.currency })),
    last30DaysRevenueCents: last30DaysRevenue,
    last30DaysRevenue: `$${(last30DaysRevenue / 100).toFixed(2)}`,
    mrrCents,
    mrr: `$${(mrrCents / 100).toFixed(2)}`,
    activeSubscriptions: subs.length,
  };
}
