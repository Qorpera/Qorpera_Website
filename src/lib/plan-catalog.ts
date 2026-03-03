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
  entityCapDisplay: string;
  connectorSlots: number;
  governedWorkflows: number;
  approvalSeats: number;
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
    headline: "Governed AI operations for a single operator",
    priceDisplay: "$299",
    priceNote: "/mo",
    agentCap: 4,
    entityCapDisplay: "500",
    connectorSlots: 2,
    governedWorkflows: 10,
    approvalSeats: 1,
    features: [
      "500 mapped entities across connected systems",
      "2 integration connectors",
      "10 governed workflows with full audit trail",
      "1 approval seat with human-in-the-loop sign-off",
      "Shared operational memory across every workflow",
      "AI advisor that routes work automatically",
    ],
    ctaText: "Subscribe",
    ctaMode: "checkout",
  },
  {
    slug: "small-business",
    tier: "SMALL_BUSINESS",
    name: "Small Business",
    headline: "Cross-department AI operations — governed and context-aware",
    priceDisplay: "From $1,500",
    priceNote: "/mo",
    agentCap: 8,
    entityCapDisplay: "5,000",
    connectorSlots: 4,
    governedWorkflows: 50,
    approvalSeats: 5,
    features: [
      "5,000 mapped entities across connected systems",
      "4 integration connectors",
      "50 governed workflows",
      "5 approval seats",
      "Everything in Solo",
      "Cross-department handoffs — sales to support to ops, seamlessly",
      "Guided setup — we help you design the right governance structure",
      "Priority support",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
  {
    slug: "mid-size",
    tier: "MID_SIZE",
    name: "Mid-size",
    headline: "Enterprise-grade governed operations across every function",
    priceDisplay: "From $5,000",
    priceNote: "/mo",
    agentCap: 20,
    entityCapDisplay: "Unlimited",
    connectorSlots: 99,
    governedWorkflows: 999,
    approvalSeats: 99,
    features: [
      "Unlimited entities, connectors, and workflows",
      "Unlimited approval seats",
      "Everything in Small Business",
      "Custom governance rules designed around your org",
      "Deep integration with internal systems and data sources",
      "Dedicated success manager",
      "Enterprise-grade security and compliance",
    ],
    ctaText: "Talk to us",
    ctaMode: "contact",
  },
];

