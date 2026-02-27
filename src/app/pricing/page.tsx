import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { PricingSubscribeButton } from "@/components/pricing-subscribe-button";
import { PricingInquiryButton } from "@/components/pricing-inquiry-modal";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      {/* Hero */}
      <div className="mb-14 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Choose a plan that fits your business. Scale from solo founder to a full AI-powered team.
        </p>
      </div>

      {/* Pricing grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const isRecommended = plan.recommended;

          return (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                isRecommended
                  ? "border-teal-500/40 bg-[rgba(13,25,30,0.9)] shadow-[0_0_40px_rgba(20,184,166,0.08)]"
                  : "border-zinc-800 bg-[rgba(10,14,18,0.9)]"
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-3 py-0.5 text-xs font-medium text-white">
                  Recommended
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-zinc-100">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{plan.headline}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-zinc-100">{plan.priceDisplay}</span>
                <span className="text-sm text-zinc-500">{plan.priceNote}</span>
              </div>

              <div className="mb-6 text-sm text-zinc-400">
                Up to <span className="font-medium text-zinc-200">{plan.agentCap} AI agents</span>
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
        All plans include the AI advisor. Agents can be activated, swapped, or deactivated anytime
        within your plan&apos;s cap. Prices in USD.
      </div>
    </div>
  );
}
