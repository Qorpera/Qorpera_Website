import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases | Qorpera",
  description:
    "See how solo founders, e-commerce stores, service firms, and SaaS teams use Qorpera AI agents.",
};

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      label="Use cases"
      title="Built for how you actually work"
      subtitle="Every business is different. Here's how teams like yours put Qorpera agents to work."
    >
      <UseCasesClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
