import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { DocumentsClient } from "./client";

export const metadata: Metadata = {
  title: "Documents — Guides, References & Resources",
  description:
    "Everything you need to get started with Qorpera — setup guides, integration references, API documentation, and security & compliance resources.",
};

export default function DocumentsPage() {
  return (
    <>
      <MarketingPageShell
        label="Documents"
        title="Guides, references & resources."
        subtitle="Everything you need to connect your systems, configure the platform, and understand how Qorpera works under the hood."
      >
        <DocumentsClient />
      </MarketingPageShell>
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
