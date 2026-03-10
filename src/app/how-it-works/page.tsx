import type { Metadata } from "next";
import { MarketingCta } from "@/components/marketing-cta";
import { MarketingFooter } from "@/components/marketing-footer";
import { HowItWorksClient } from "./client";

export const metadata: Metadata = {
  title: "How It Works — Five Layers, One Intelligence",
  description:
    "From real-time event ingestion through knowledge graph construction, situation detection, contextual reasoning, and continuous learning — the architecture behind Qorpera.",
};

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorksClient />
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
