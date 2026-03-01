import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { AboutClient } from "./client";

export const metadata: Metadata = {
  title: "Qorpera Explained",
  description:
    "AI isn't a productivity hack — it's a cost structure disruption. Qorpera gives you digital workers that replace roles, not just hours.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell
      label="Qorpera explained"
      title="A cost structure disruption, not a productivity hack"
      subtitle="Most AI tools make your team slightly faster. Qorpera replaces the roles you'd otherwise need to hire for — at a fraction of the cost."
    >
      <AboutClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
