"use client";

import Link from "next/link";

export function MarketingCta() {
  return (
    <section className="bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10">
      <div className="mx-auto max-w-[520px]">
        <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
          Ready to close the gap?
        </h2>
        <p className="mt-4 text-lg leading-[1.6] text-white/60">
          Qorpera is in early access for companies running on HubSpot,
          Stripe, and Gmail. Ten minutes to set up. First results on day one.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-[10px] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
          >
            Request early access
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-[10px] border-[1.5px] border-white/20 px-8 py-3.5 font-sans text-base font-semibold text-white/60 no-underline transition hover:border-white/40 hover:text-white/90"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  );
}
