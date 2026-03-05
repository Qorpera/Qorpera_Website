import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { HowItWorksClient } from "./client";

export const metadata: Metadata = {
  title: "How It Works — Live in 25 Minutes",
  description:
    "Connect your tools, see what Qorpera finds, teach it your pain points, and go live — all within 25 minutes. Then watch AI earn your trust over time.",
};

export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageShell
        label="How it works"
        title="From zero to AI-driven operations in 25 minutes."
        subtitle="Connect your tools, describe your pain points, and watch Qorpera detect situations and propose actions — with full governance from day one."
      >
        <HowItWorksClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
