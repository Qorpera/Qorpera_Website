// Client-safe plan catalog — no server/Node.js imports.
// Static plan definitions for UI rendering.
// The DB Plan records are the source of truth for checkout.

export type PlanTierSlug = "solo" | "small-business" | "mid-size";

export type PlanCatalogItem = {
  slug: PlanTierSlug;
  tier: "SOLO" | "SMALL_BUSINESS" | "MID_SIZE";
  name: string;
  headline: string;
  priceDisplay: string;
  priceNote: string;
  agentCap: number;
  features: string[];
  ctaText: string;
  ctaMode: "checkout" | "contact";
  recommended?: boolean;
};

export const PLAN_CATALOG: PlanCatalogItem[] = [
  {
    slug: "solo",
    tier: "SOLO",
    name: "Solo",
    headline: "Everything you need to run your business with AI",
    priceDisplay: "$299",
    priceNote: "/mo",
    agentCap: 4,
    features: [
      "Up to 4 AI agents",
      "AI advisor included",
      "Full agent customization",
      "Email notifications",
      "Local AI support",
    ],
    ctaText: "Subscribe",
    ctaMode: "checkout",
    recommended: true,
  },
  {
    slug: "small-business",
    tier: "SMALL_BUSINESS",
    name: "Small Business",
    headline: "Scale your team with dedicated AI workforce",
    priceDisplay: "From $1,500",
    priceNote: "/mo",
    agentCap: 8,
    features: [
      "Up to 8 AI agents",
      "Priority support",
      "Custom agent training",
      "Advanced analytics",
      "Team collaboration",
      "Dedicated onboarding",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
  {
    slug: "mid-size",
    tier: "MID_SIZE",
    name: "Mid-size",
    headline: "Enterprise-grade AI workforce for growing companies",
    priceDisplay: "From $5,000",
    priceNote: "/mo",
    agentCap: 20,
    features: [
      "Up to 20 AI agents",
      "Enterprise support",
      "Custom integrations",
      "SLA guarantees",
      "Dedicated account manager",
      "Custom agent development",
      "SOC 2 compliance",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
];

export function getPlanCatalogItem(slug: PlanTierSlug) {
  return PLAN_CATALOG.find((p) => p.slug === slug) ?? null;
}
