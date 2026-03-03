"use client";

import Link from "next/link";
import { FadeIn, GlowRing } from "@/components/motion-primitives";

export function MarketingCta() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="relative mx-auto max-w-2xl text-center">
        <GlowRing className="-top-20 left-1/2 h-64 w-64 -translate-x-1/2" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-slate-500/[0.04] blur-3xl" />
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">
            Get started
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl">
            See it working on your business.
          </h2>
          <p className="mt-4 text-[#b8c5ce]">
            Book a pilot conversation and see how Qorpera maps your entities, defines
            governance rules, and begins executing governed workflows — tailored to your operations.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="rounded-lg bg-white px-7 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Book a pilot conversation
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
