import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { AboutClient } from "./client";

export const metadata: Metadata = {
  title: "Qorpera Explained",
  description:
    "Why generic AI falls short for business, and how Qorpera builds AI that actually learns how you operate.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      label="Qorpera explained"
      title="AI that learns your business"
      subtitle="Most AI tools give you a blank prompt and wish you luck. Qorpera starts with your business and builds from there."
    >
      <AboutClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
