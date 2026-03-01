import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases | Qorpera",
  description:
    "See how Qorpera's agentic teams cover sales, operations, customer experience, and research — each led by a specialist, backed by a coordinated squad.",
};

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      label="Use cases"
      title="See what your agentic teams can do"
      subtitle="Every department has work that doesn't need a full-time hire. Here's how Qorpera's teams — each led by a specialist — cover entire functions."
    >
      <UseCasesClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
