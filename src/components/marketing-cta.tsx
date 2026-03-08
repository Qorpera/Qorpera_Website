"use client";

import Link from "next/link";

export function MarketingCta() {
  return (
    <section className="bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10">
      <div className="mx-auto max-w-[520px]">
        <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
          The company that has this in two years has an AI that understands
          their entire business.
        </h2>
        <p className="mt-4 text-lg leading-[1.6] text-white/40">
          The company that doesn&apos;t is still copy-pasting between HubSpot
          and Gmail.
        </p>
        <div className="mt-10">
          <Link
            href="/contact"
            className="inline-block rounded-[10px] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
          >
            Book a walkthrough
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-[480px] text-sm leading-relaxed text-white/30">
          We personally walk every new customer through setup. First session
          takes 60–90 minutes. First situations appear the same day.
        </p>
      </div>
    </section>
  );
}
