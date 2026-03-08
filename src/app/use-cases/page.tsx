import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases — Work Your Team Shouldn't Be Doing Manually",
  description:
    "Invoice follow-ups, pipeline monitoring, CRM updates, meeting prep — Qorpera takes over the routine digital work across your tools, and gives you full operational awareness as a byproduct.",
};

export default function UseCasesPage() {
  return (
    <>
      <MarketingPageShell
        label="Use cases"
        title="Work your team shouldn't be doing manually."
        subtitle="Qorpera takes over the routine digital operations that eat your team's time — follow-ups, monitoring, updates, reporting. Full operational awareness isn't the goal. It's what happens when AI is actually doing the work."
      >
        <UseCasesClient />
      </MarketingPageShell>
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
