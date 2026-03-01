import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { HowItWorksClient } from "./client";

export const metadata: Metadata = {
  title: "How It Works | Qorpera",
  description:
    "Describe the roles you need filled. Qorpera's AI workers learn your business, take responsibility, and get better with every correction.",
};

export default function HowItWorksPage() {
  return (
    <MarketingPageShell
      label="How it works"
      title="From empty roles to a working team"
      subtitle="Describe your business once. Your AI workforce starts filling roles immediately — and compounds in value every week."
    >
      <HowItWorksClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
