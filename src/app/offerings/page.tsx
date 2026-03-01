import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { OfferingsClient } from "./client";

export const metadata: Metadata = {
  title: "Offerings | Qorpera",
  description:
    "Explore the full Qorpera platform: 9 AI agents, integrations, hybrid processing, scheduling, and the company file.",
};

export default function OfferingsPage() {
  return (
    <MarketingPageShell
      label="Offerings"
      title="Everything in the platform"
      subtitle="Nine AI agents, real integrations, hybrid processing, and a knowledge base that makes it all work."
    >
      <OfferingsClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
