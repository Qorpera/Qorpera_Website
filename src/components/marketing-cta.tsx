"use client";

import Link from "next/link";

export function MarketingCta() {
  return (
    <section className="bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10">
      <div className="mx-auto max-w-[520px]">
        <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
          With Qorpera, getting in front of the curve is permanent.
        </h2>
        <p className="mt-4 text-lg leading-[1.6] text-white/40">
          The future of work is data driven. When our system collects and learns
          from your data, late adopters won&apos;t be able to catch up.
        </p>
        <div className="mt-10">
          <Link
            href="/contact"
            className="inline-block rounded-[10px] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
          >
            Get in contact
          </Link>
        </div>
      </div>
    </section>
  );
}
