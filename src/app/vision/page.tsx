import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { VisionClient } from "./client";

export const metadata: Metadata = {
  title: "Vision — Disrupting the Cost Structure of Digital Work",
  description:
    "The problem isn't a lack of tools. It's that nobody is watching everything simultaneously. Qorpera is the operating system that changes that.",
};

export default function VisionPage() {
  return (
    <>
      <MarketingPageShell
        label="Our vision"
        title="Disrupting the cost structure of digital work."
        subtitle="The world doesn't need more SaaS tools. It needs intelligence that watches, reasons, and acts — so humans can focus on what only humans can do."
      >
        <VisionClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
