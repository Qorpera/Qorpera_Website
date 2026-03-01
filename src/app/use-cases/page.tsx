import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases | Qorpera",
  description:
    "See which roles Qorpera's AI workforce can fill across sales, operations, customer experience, and research.",
};

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      label="Use cases"
      title="The roles your AI workforce fills"
      subtitle="Every department has work that doesn't need a full-time hire. Here's how Qorpera replaces headcount with AI workers who learn your business."
    >
      <UseCasesClient />
      <MarketingCta />
    </MarketingPageShell>
  );
}
