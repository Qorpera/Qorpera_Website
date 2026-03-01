import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { OfferingsClient } from "./client";

export const metadata: Metadata = {
  title: "Offerings | Qorpera",
  description:
    "Nine agentic teams — each led by a named specialist, backed by a coordinated squad. Real integrations, hybrid processing, and the company file that ties it all together.",
};

export default function OfferingsPage() {
  return (
    <MarketingPageShell
      label="Offerings"
      title="Nine agentic teams, ready to deploy"
      subtitle="Each team is led by a named specialist and backed by a coordinated squad. Real integrations, hybrid processing, and a cost model that makes hiring humans optional."
    >
      <OfferingsClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
