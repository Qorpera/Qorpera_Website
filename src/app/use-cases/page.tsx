import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases — The Questions Your Dashboards Can't Answer",
  description:
    "Revenue dropped 8% — why? Is your biggest account about to churn? What's actually happening in your pipeline? Qorpera shows you the full picture.",
};

export default function UseCasesPage() {
  return (
    <>
      <MarketingPageShell
        label="Use cases"
        title="The questions your dashboards can't answer."
        subtitle="Leaders don't need more metrics. They need to understand what's actually happening in their business — the developing situations that explain the numbers."
      >
        <UseCasesClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
