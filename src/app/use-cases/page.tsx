import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases — Situations Qorpera Detects",
  description:
    "From overdue invoice follow-up to churn risk detection. See how Qorpera detects and acts on real business situations across every department.",
};

export default function UseCasesPage() {
  return (
    <>
      <MarketingPageShell
        label="Use cases"
        title="Real situations. Intelligent responses."
        subtitle="Qorpera detects situations across your entire operation — finance, sales, support, HR, and operations. Here's what that looks like in practice."
      >
        <UseCasesClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
