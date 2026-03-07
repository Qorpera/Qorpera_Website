import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { VisionClient } from "./client";

export const metadata: Metadata = {
  title: "Vision — The Information Gap at the Top",
  description:
    "The person making the biggest decisions has the most mediated, least reliable view of what's actually going on. Qorpera exists to close that gap.",
};

export default function VisionPage() {
  return (
    <>
      <MarketingPageShell
        label="Our vision"
        title="The information gap at the top."
        subtitle="The person making the biggest decisions has the most mediated, least reliable view of what's actually going on. Qorpera exists to close that gap."
      >
        <VisionClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
