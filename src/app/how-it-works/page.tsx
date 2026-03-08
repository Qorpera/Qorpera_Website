import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { HowItWorksClient } from "./client";

export const metadata: Metadata = {
  title: "How It Works — From Blind Spots to Full Visibility in 25 Minutes",
  description:
    "Connect your tools, see the situations Qorpera finds in your data, and go from fragmented reports to direct operational awareness — all within 25 minutes.",
};

export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageShell
        label="How it works"
        title="From blind spots to full visibility in 25 minutes."
        subtitle="Connect your tools and see the situations developing in your business — the ones your dashboards and team updates aren't showing you."
      >
        <HowItWorksClient />
      </MarketingPageShell>
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
