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
    headline: "An AI team that knows your business — from day one",
    priceDisplay: "$299",
    priceNote: "/mo",
    agentCap: 4,
    features: [
      "Up to 4 AI team members",
      "AI advisor that learns your business",
      "Agents trained on your customers and products",
      "They check with you before anything important",
      "Gets smarter the longer it works for you",
      "Works with your existing tools",
    ],
    ctaText: "Subscribe",
    ctaMode: "checkout",
    recommended: true,
  },
  {
    slug: "small-business",
    tier: "SMALL_BUSINESS",
    name: "Small Business",
    headline: "AI help across your whole business — support, sales, finance, and more",
    priceDisplay: "From $1,500",
    priceNote: "/mo",
    agentCap: 8,
    features: [
      "Up to 8 AI team members",
      "Everything in Solo",
      "Priority support from our team",
      "Deeper training on your business",
      "See how your AI team is performing",
      "We help you get set up",
      "Gets smarter the longer it works for you",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
  {
    slug: "mid-size",
    tier: "MID_SIZE",
    name: "Mid-size",
    headline: "Your entire organization, powered by AI that truly understands it",
    priceDisplay: "From $5,000",
    priceNote: "/mo",
    agentCap: 20,
    features: [
      "Up to 20 AI team members",
      "Everything in Small Business",
      "Custom connections to your systems",
      "Guaranteed response times",
      "A dedicated person on our side",
      "AI team members built for your specific needs",
      "Enterprise-grade security",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
];

export function getPlanCatalogItem(slug: PlanTierSlug) {
  return PLAN_CATALOG.find((p) => p.slug === slug) ?? null;
}
