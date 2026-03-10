import type { Metadata } from "next";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { UseCasesClient } from "./client";

export const metadata: Metadata = {
  title: "Use Cases — See What Qorpera Detects",
  description:
    "Real scenarios showing how Qorpera reads signals across your tools to surface situations humans miss — from silent churn to budget blindspots.",
};

export default function UseCasesPage() {
  return (
    <>
      <UseCasesClient />
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
