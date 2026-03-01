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
    headline: "A coordinated AI team built around your business",
    priceDisplay: "$299",
    priceNote: "/mo",
    agentCap: 4,
    features: [
      "Up to 4 AI roles — coordinated by one advisor",
      "Shared business memory across every role",
      "Advisor routes the right work to the right role automatically",
      "Human approval on every external action",
      "Your team learns from every task it completes",
      "Connects to the tools you already use",
    ],
    ctaText: "Subscribe",
    ctaMode: "checkout",
  },
  {
    slug: "small-business",
    tier: "SMALL_BUSINESS",
    name: "Small Business",
    headline: "AI teams across every department — coordinated and context-aware",
    priceDisplay: "From $1,500",
    priceNote: "/mo",
    agentCap: 8,
    features: [
      "Up to 8 roles spanning multiple departments",
      "Everything in Solo",
      "Cross-department handoffs — sales to support to ops, seamlessly",
      "Multi-role workflows for complex tasks",
      "Team-wide performance dashboard",
      "Guided setup — we help you design the right team structure",
      "Priority support",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
  {
    slug: "mid-size",
    tier: "MID_SIZE",
    name: "Mid-size",
    headline: "Enterprise AI teams that operate as one — across every function",
    priceDisplay: "From $5,000",
    priceNote: "/mo",
    agentCap: 20,
    features: [
      "Up to 20 specialized roles across every function",
      "Everything in Small Business",
      "Custom roles designed around your org's specific workflows",
      "Deep integration with your internal systems and data sources",
      "Dedicated success manager",
      "Guaranteed response times",
      "Enterprise-grade security and compliance",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
];

export function getPlanCatalogItem(slug: PlanTierSlug) {
  return PLAN_CATALOG.find((p) => p.slug === slug) ?? null;
}
