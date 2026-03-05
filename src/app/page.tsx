import type { Metadata } from "next";
import { LandingClient } from "./landing-client";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — The Operating System for AI-Driven Work" },
  description:
    "AI that watches your business, detects situations that need attention, reasons about what to do, and acts within governed boundaries.",
};

export default function HomePage() {
  return (
    <>
      <LandingClient />
      <MarketingFooter />
    </>
  );
}
