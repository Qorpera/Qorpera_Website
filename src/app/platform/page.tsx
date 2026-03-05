import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { PlatformClient } from "./client";

export const metadata: Metadata = {
  title: "Platform — The Five-Layer Architecture",
  description:
    "From raw events to intelligent action. How Qorpera's five-layer stack detects situations, reasons about them, and acts within governed boundaries.",
};

export default function PlatformPage() {
  return (
    <>
      <MarketingPageShell
        label="The platform"
        title="Five layers. From events to intelligent action."
        subtitle="Qorpera is an AI operating system built as a five-layer stack. Each layer transforms raw business data into governed, situation-driven intelligence."
      >
        <PlatformClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
