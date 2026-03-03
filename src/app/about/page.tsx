import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { AboutClient } from "./client";

export const metadata: Metadata = {
  title: "Qorpera — The Platform",
  description:
    "Map your business entities, build governance layers, and deploy secure AI that operates within permission-aware, fully auditable boundaries.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      label="The platform"
      title="Map your business. Govern your AI."
      subtitle="Qorpera maps your entities, properties, and relationships into a unified operational model — then builds the security and intelligence layers for AI to reason and act within governed boundaries."
    >
      <AboutClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
