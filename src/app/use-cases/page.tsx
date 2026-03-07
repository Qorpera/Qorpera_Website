import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases — Situations You're Currently Missing",
  description:
    "Revenue dropped 8% — why? Is your biggest account about to churn? What's actually happening in your pipeline? These are the situations Qorpera surfaces.",
};

export default function UseCasesPage() {
  return (
    <>
      <MarketingPageShell
        label="Use cases"
        title="Situations you're currently missing."
        subtitle="These situations are developing in businesses like yours right now. The signals exist across your tools — but nobody is watching all of them simultaneously."
      >
        <UseCasesClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
