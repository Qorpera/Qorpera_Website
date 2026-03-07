import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { VisionClient } from "./client";

export const metadata: Metadata = {
  title: "Vision — See Your Business Clearly",
  description:
    "The people making the biggest decisions have the most mediated view of what's actually happening. Qorpera exists to close that gap.",
};

export default function VisionPage() {
  return (
    <>
      <MarketingPageShell
        label="Our vision"
        title="See your business clearly. Act on what matters."
        subtitle="The people making the biggest decisions have the most mediated view of what's actually happening. Qorpera exists to close that gap."
      >
        <VisionClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
