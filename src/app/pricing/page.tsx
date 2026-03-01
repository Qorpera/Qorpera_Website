import type { Metadata } from "next";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { PricingSubscribeButton } from "@/components/pricing-subscribe-button";
import { PricingInquiryButton } from "@/components/pricing-inquiry-modal";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Set up for free. Launch your AI team when you're ready.",
  openGraph: {
    title: "Pricing | Qorpera",
    description:
      "Set up for free. Launch your AI team when you're ready.",
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ welcome?: string }>;
}) {
  const { welcome } = (await searchParams) ?? {};
  const isWelcome = welcome === "1";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">

      {/* Welcome banner — shown once after onboarding completes */}
      {isWelcome && (
        <div className="mb-10 rounded-2xl border border-teal-500/25 bg-teal-500/[0.07] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-teal-300">Your AI team is learning about your business 🎉</p>
            <p className="mt-0.5 text-sm text-white/55">
              Pick a plan to bring your AI team online. Not sure which fits?{" "}
              <Link href="/" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">
                Ask your advisor
              </Link>{" "}
              — they already know your goals and can recommend the right fit.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-300 hover:bg-teal-500/20 transition-colors"
          >
            Chat with advisor →
          </Link>
        </div>
      )}

      {/* Hero */}
      <div className="mb-14 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          AI teams that run your business — not just answer questions
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Set up your company file and meet your AI advisor for free — no card needed.
          When you're ready to launch your AI team, pick a plan.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-block rounded-lg border border-zinc-700 bg-zinc-800/60 px-5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/60"
        >
          Start free setup →
        </Link>
      </div>

      {/* Pricing grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          return (
            <div
              key={plan.slug}
              className="relative flex flex-col rounded-2xl border border-zinc-800 bg-[rgba(10,14,18,0.9)] p-6"
            >

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-zinc-100">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{plan.headline}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-zinc-100">{plan.priceDisplay}</span>
                <span className="text-sm text-zinc-500">{plan.priceNote}</span>
              </div>

              <div className="mb-6 text-sm text-zinc-400">
                Up to <span className="font-medium text-zinc-200">{plan.agentCap} coordinated AI roles</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div>
                {plan.ctaMode === "checkout" ? (
                  <PricingSubscribeButton />
                ) : (
                  <PricingInquiryButton tier={plan.tier} planName={plan.name} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-10 text-center text-xs text-zinc-600">
        Every plan includes an AI advisor that coordinates your team. Roles can be added, swapped, or
        paused anytime. Prices in USD.
      </div>
    </div>
  );
}
