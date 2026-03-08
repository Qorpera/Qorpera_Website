import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { PlatformClient } from "./client";

export const metadata: Metadata = {
  title: "Platform — From Fragmented Signals to Operational Awareness",
  description:
    "Five layers turn raw events from your CRM, payments, email, and support into the cross-system situational awareness that dashboards and team updates can't provide.",
};

export default function PlatformPage() {
  return (
    <>
      <MarketingPageShell
        label="The platform"
        title="From fragmented signals to operational awareness."
        subtitle="Five layers turn raw events from every connected system into the situational awareness that dashboards, reports, and team updates can't provide."
      >
        <PlatformClient />
      </MarketingPageShell>
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
