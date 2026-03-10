import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { MarketingFooter } from "@/components/marketing-footer";
import { AboutClient } from "./client";

export const metadata: Metadata = {
  title: "About — Why We Started Qorpera",
  description:
    "AI is smart enough. The problem is context. Qorpera exists to give AI a living model of your business — so it can finally do real work.",
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageShell
        label="About us"
        title="We believe the missing piece is context."
        subtitle="AI is smart enough to run most of your operations. It just doesn't know your business. We started Qorpera to fix that."
      >
        <AboutClient />
      </MarketingPageShell>
      <MarketingFooter />
    </>
  );
}
