import Link from "next/link";

export function MarketingCta() {
  return (
    <section className="border-t border-white/[0.06] py-24">
      <div className="relative mx-auto max-w-2xl text-center">
        <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-slate-500/[0.04] blur-3xl" />
        <p className="text-xs font-medium uppercase tracking-wider text-white/30">
          Get started
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Map your business — free
        </h2>
        <p className="mt-4 text-[#b8c5ce]">
          Set up your company file in minutes. Your AI workforce starts learning
          from day one.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-white px-7 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/[0.10] bg-white/[0.04] px-7 py-3 text-sm text-white/80 transition-colors hover:bg-white/[0.07]"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
