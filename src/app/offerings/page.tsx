import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { OfferingsClient } from "./client";

export const metadata: Metadata = {
  title: "Offerings | Qorpera",
  description:
    "Pre-built AI workers for 9 business roles, real integrations, hybrid processing, and the company file that makes it all work.",
};

export default function OfferingsPage() {
  return (
    <MarketingPageShell
      label="Offerings"
      title="Your AI workforce, ready to hire"
      subtitle="Nine pre-built digital workers, real integrations with the tools you use, and a cost model that makes hiring humans optional."
    >
      <OfferingsClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
