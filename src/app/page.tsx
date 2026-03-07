import type { Metadata } from "next";
import { LandingClient } from "./landing-client";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — Operational Intelligence for the People Steering the Company" },
  description:
    "Right now, you only know what's happening in your business by asking the people who work in it. Qorpera gives you the full picture directly.",
};

export default function HomePage() {
  return (
    <>
      <LandingClient />
      <MarketingFooter />
    </>
  );
}
