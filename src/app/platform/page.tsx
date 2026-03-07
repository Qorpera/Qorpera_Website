import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { PlatformClient } from "./client";

export const metadata: Metadata = {
  title: "Platform — How Leaders Get Unmediated Visibility",
  description:
    "Five layers turn raw events from your CRM, payments, email, and support into the operational awareness that dashboards and team updates can't provide.",
};

export default function PlatformPage() {
  return (
    <>
      <MarketingPageShell
        label="The platform"
        title="How leaders get unmediated visibility."
        subtitle="Five layers turn raw events from every connected system into the operational awareness that dashboards and team updates can't provide."
      >
        <PlatformClient />
        <MarketingCta />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
