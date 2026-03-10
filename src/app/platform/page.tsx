import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingFooter } from "@/components/marketing-footer";
import { PlatformClient } from "./client";

export const metadata: Metadata = {
  title: "Platform — What You Get Inside Qorpera",
  description:
    "A walkthrough of every page in the Qorpera application — the advisor, the map, situations, proposals, agents, integrations, and more.",
};

export default function PlatformPage() {
  return (
    <>
      <MarketingPageShell
        label="The platform"
        title="What you get inside Qorpera."
        subtitle="A walkthrough of the application — every page, what it does, and how you use it."
      >
        <PlatformClient />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
