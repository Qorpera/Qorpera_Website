/**
 * Stripe Setup Script for Zygenic
 *
 * Creates all required products, prices, and (optionally) a webhook endpoint
 * in your Stripe account, then prints the env vars to add to .env.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *
 * Or, if you already have STRIPE_SECRET_KEY in .env:
 *   npx tsx scripts/stripe-setup.ts
 */

import { readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

// Load .env manually (no dotenv dependency needed)
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env not found, rely on environment
}

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY?.trim();
if (!STRIPE_KEY) {
  console.error(
    "\n  Missing STRIPE_SECRET_KEY.\n" +
      "  Run with: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts\n" +
      "  Or add it to your .env first.\n",
  );
  process.exit(1);
}

const IS_TEST = STRIPE_KEY.startsWith("sk_test_");
if (!IS_TEST) {
  console.warn("\n  WARNING: You are using a LIVE Stripe key. Products and prices will be created in production.\n");
}

// ---------------------------------------------------------------------------
// Stripe API helper
// ---------------------------------------------------------------------------

async function stripe<T = Record<string, unknown>>(
  path: string,
  body?: Record<string, string>,
): Promise<T> {
  const init: RequestInit = {
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (body) {
    init.method = "POST";
    init.body = new URLSearchParams(body).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Stripe ${path} failed: ${(data as { error?: { message?: string } }).error?.message ?? res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Plan definition — low test prices
// ---------------------------------------------------------------------------

type PriceDef = {
  envVar: string;
  unitAmount: number; // cents
  interval?: "day" | "week" | "month";
  recurring: boolean;
};

type ProductDef = {
  name: string;
  description: string;
  prices: PriceDef[];
};

const PRODUCTS: ProductDef[] = [
  {
    name: "Support Team",
    description: "Zygenic Support Team — triage + drafts + customer communications",
    prices: [
      { envVar: "STRIPE_PRICE_ASSISTANT", unitAmount: 4900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_ASSISTANT_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_ASSISTANT_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_ASSISTANT_MONTHLY", unitAmount: 1900, interval: "month", recurring: true },
    ],
  },
  {
    name: "Sales Team",
    description: "Zygenic Sales Team — prospecting + outreach + pipeline",
    prices: [
      { envVar: "STRIPE_PRICE_SALES_REP", unitAmount: 5900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_SALES_REP_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_SALES_REP_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_SALES_REP_MONTHLY", unitAmount: 2900, interval: "month", recurring: true },
    ],
  },
  {
    name: "Customer Success Team",
    description: "Zygenic Customer Success Team — health monitoring + renewals + check-ins",
    prices: [
      { envVar: "STRIPE_PRICE_CUSTOMER_SUCCESS", unitAmount: 5900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_CUSTOMER_SUCCESS_MONTHLY", unitAmount: 2900, interval: "month", recurring: true },
    ],
  },
  {
    name: "Marketing Team",
    description: "Zygenic Marketing Team — content + campaigns + performance",
    prices: [
      { envVar: "STRIPE_PRICE_MARKETING_COORDINATOR", unitAmount: 5900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_MARKETING_COORDINATOR_MONTHLY", unitAmount: 2900, interval: "month", recurring: true },
    ],
  },
  {
    name: "Finance Team",
    description: "Zygenic Finance Team — reports + reconciliation + invoicing",
    prices: [
      { envVar: "STRIPE_PRICE_FINANCE_ANALYST", unitAmount: 6900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_FINANCE_ANALYST_DAILY", unitAmount: 200, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_FINANCE_ANALYST_WEEKLY", unitAmount: 900, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_FINANCE_ANALYST_MONTHLY", unitAmount: 3900, interval: "month", recurring: true },
    ],
  },
  {
    name: "Operations Team",
    description: "Zygenic Operations Team — SOPs + vendor comms + process ops",
    prices: [
      { envVar: "STRIPE_PRICE_OPERATIONS_MANAGER", unitAmount: 5900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_OPERATIONS_MANAGER_MONTHLY", unitAmount: 3200, interval: "month", recurring: true },
    ],
  },
  {
    name: "Executive Support Team",
    description: "Zygenic Executive Support Team — inbox + briefings + action tracking",
    prices: [
      { envVar: "STRIPE_PRICE_EXECUTIVE_ASSISTANT", unitAmount: 4900, recurring: false },
      { envVar: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_DAILY", unitAmount: 100, interval: "day", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_WEEKLY", unitAmount: 500, interval: "week", recurring: true },
      { envVar: "STRIPE_SUB_PRICE_EXECUTIVE_ASSISTANT_MONTHLY", unitAmount: 2500, interval: "month", recurring: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n  Stripe Setup for Zygenic (${IS_TEST ? "TEST mode" : "LIVE mode"})\n`);

  const envLines: string[] = [`STRIPE_SECRET_KEY=${STRIPE_KEY}`];

  for (const product of PRODUCTS) {
    console.log(`  Creating product: ${product.name}`);
    const prod = await stripe<{ id: string }>("/products", {
      name: product.name,
      description: product.description,
    });
    console.log(`    → ${prod.id}`);

    for (const priceDef of product.prices) {
      const params: Record<string, string> = {
        product: prod.id,
        currency: "usd",
        unit_amount: String(priceDef.unitAmount),
      };

      if (priceDef.recurring && priceDef.interval) {
        params["recurring[interval]"] = priceDef.interval;
        params["recurring[interval_count]"] = "1";
      }

      const label = priceDef.recurring
        ? `$${(priceDef.unitAmount / 100).toFixed(2)}/${priceDef.interval}`
        : `$${(priceDef.unitAmount / 100).toFixed(2)} one-time`;

      console.log(`  Creating price: ${label} (${priceDef.envVar})`);
      const price = await stripe<{ id: string }>("/prices", params);
      console.log(`    → ${price.id}`);
      envLines.push(`${priceDef.envVar}=${price.id}`);
    }

    console.log();
  }

  // ── Webhook endpoint ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/stripe/webhook`;

  console.log(`  Creating webhook endpoint: ${webhookUrl}`);
  try {
    const wh = await stripe<{ id: string; secret?: string }>("/webhook_endpoints", {
      url: webhookUrl,
      "enabled_events[0]": "checkout.session.completed",
      "enabled_events[1]": "checkout.session.async_payment_succeeded",
      "enabled_events[2]": "checkout.session.async_payment_failed",
      "enabled_events[3]": "customer.subscription.created",
      "enabled_events[4]": "customer.subscription.updated",
      "enabled_events[5]": "customer.subscription.deleted",
    });
    console.log(`    → ${wh.id}`);
    if (wh.secret) {
      envLines.push(`STRIPE_WEBHOOK_SECRET=${wh.secret}`);
      console.log(`    Webhook secret captured.\n`);
    } else {
      console.log(`    Note: webhook secret not returned. Retrieve it from the Stripe Dashboard.\n`);
      envLines.push(`STRIPE_WEBHOOK_SECRET=  # Get from Stripe Dashboard → Developers → Webhooks`);
    }
  } catch (err) {
    console.log(
      `    Webhook creation skipped: ${err instanceof Error ? err.message : err}\n` +
        `    For local development, use Stripe CLI instead:\n` +
        `      stripe listen --forward-to ${webhookUrl}\n`,
    );
    envLines.push(`STRIPE_WEBHOOK_SECRET=  # From 'stripe listen' output or Stripe Dashboard`);
  }

  // ── Output ──
  console.log("  ─────────────────────────────────────────────────");
  console.log("  Add these to your .env file:\n");
  for (const line of envLines) {
    console.log(`  ${line}`);
  }
  console.log("\n  ─────────────────────────────────────────────────");

  // If --write flag is passed, append to .env automatically
  if (process.argv.includes("--write")) {
    const block = "\n# Stripe (auto-generated by scripts/stripe-setup.ts)\n" + envLines.join("\n") + "\n";
    appendFileSync(envPath, block, "utf-8");
    console.log(`\n  Written to ${envPath}\n`);
  } else {
    console.log(`\n  Tip: Re-run with --write to auto-append to .env\n`);
  }
}

main().catch((err) => {
  console.error("\n  Setup failed:", err instanceof Error ? err.message : err, "\n");
  process.exit(1);
});
