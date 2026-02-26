// Client-safe — no Node.js imports.
// Approximate currency conversion for display only. Billing uses Stripe-configured currency.

import type { HireSchedule } from "@/lib/agent-catalog";

/** Map country codes to their primary currency. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", PT: "EUR",
  SE: "SEK", NO: "NOK", DK: "DKK",
  JP: "JPY", IN: "INR", BR: "BRL", CH: "CHF", PL: "PLN",
};

/** Static SEK-per-one-unit exchange rates (approximate). */
const SEK_RATES: Record<string, number> = {
  SEK: 1,
  USD: 10.5,
  EUR: 11.2,
  GBP: 13.1,
  NOK: 1.02,
  DKK: 1.5,
  CAD: 7.6,
  AUD: 6.8,
  NZD: 6.2,
  CHF: 11.8,
  JPY: 0.071,
  INR: 0.126,
  BRL: 2.05,
  PLN: 2.6,
};

const SCHEDULE_SUFFIX: Record<HireSchedule, string> = {
  DAILY: "/day",
  WEEKLY: "/wk",
  MONTHLY: "/mo",
};

/** Resolve a country code to its currency. Defaults to SEK. */
export function detectCurrency(country: string | null | undefined): string {
  if (!country) return "SEK";
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? "SEK";
}

/**
 * Try to infer country from the Accept-Language header.
 * Looks for region subtags like "en-US", "de-DE", etc.
 */
export function countryFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = header.match(/[a-z]{2}-([A-Z]{2})/);
  return match ? match[1] : null;
}

/**
 * Convert recurring prices from SEK öre to formatted display strings.
 * Non-SEK currencies get a "~" prefix to indicate approximation.
 */
export function convertRecurringPrices(
  cents: Record<HireSchedule, number>,
  currency: string,
): Record<HireSchedule, string> {
  const rate = SEK_RATES[currency];
  if (!rate || currency === "SEK") {
    // Fallback: format in SEK
    return formatAll(cents, "SEK", 1, false);
  }
  return formatAll(cents, currency, rate, true);
}

function formatAll(
  cents: Record<HireSchedule, number>,
  currency: string,
  sekPerUnit: number,
  approximate: boolean,
): Record<HireSchedule, string> {
  const result = {} as Record<HireSchedule, string>;
  const schedules: HireSchedule[] = ["DAILY", "WEEKLY", "MONTHLY"];

  for (const schedule of schedules) {
    const sekValue = cents[schedule] / 100; // öre → kr
    const converted = sekValue / sekPerUnit;

    const formatted = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: converted < 10 ? 2 : 0,
      maximumFractionDigits: converted < 10 ? 2 : 0,
    }).format(converted);

    const prefix = approximate ? "~" : "";
    result[schedule] = `${prefix}${formatted}${SCHEDULE_SUFFIX[schedule]}`;
  }

  return result;
}
