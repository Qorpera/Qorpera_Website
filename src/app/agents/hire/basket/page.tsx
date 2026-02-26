"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useBasket } from "@/components/basket-context";
import { AGENT_HIRE_CATALOG } from "@/lib/agent-catalog";

function kindLabel(kind: string) {
  if (kind === "ASSISTANT") return "Assistant Agent";
  if (kind === "PROJECT_MANAGER") return "Project Manager Agent";
  return kind;
}

function scheduleLabel(s: string) {
  if (s === "DAILY") return "Daily";
  if (s === "WEEKLY") return "Weekly";
  return "Monthly";
}

export default function BasketPage() {
  return (
    <Suspense fallback={<BasketSkeleton />}>
      <BasketContent />
    </Suspense>
  );
}

function BasketSkeleton() {
  return (
    <div className="space-y-5">
      <header className="pb-5 border-b border-white/[0.07]">
        <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents/hire">
          ← Back to Hire Agents
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Hiring Basket</h1>
      </header>
      <div className="py-12 text-center text-sm wf-muted">Loading…</div>
    </div>
  );
}

function BasketContent() {
  const { items, removeItem, clearBasket, hydrated } = useBasket();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutStatus = searchParams.get("checkout");

  async function handleHireNow() {
    if (items.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/hire-basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ agentKind: i.agentKind, schedule: i.schedule })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout could not be created");
      clearBasket();
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setPending(false);
    }
  }


  if (!hydrated) {
    return (
      <div className="space-y-5">
        <header className="pb-5 border-b border-white/[0.07]">
          <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents/hire">
            ← Back to Hire Agents
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Hiring Basket</h1>
        </header>
        <div className="py-12 text-center text-sm wf-muted">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <header className="pb-5 border-b border-white/[0.07]">
        <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents/hire">
          ← Back to Hire Agents
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Hiring Basket</h1>
        <p className="mt-1 text-sm text-white/55">
          {items.length === 0 && checkoutStatus !== "success"
            ? "Your basket is empty."
            : items.length > 0
              ? `${items.length} ${items.length === 1 ? "agent" : "agents"} ready to hire.`
              : null}
        </p>
      </header>

      {/* Banners */}
      {checkoutStatus === "success" ? (
        <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-300">
            Payment complete — your agents are being added to your workforce.
          </p>
          <Link href="/agents/hire" className="mt-1 block text-xs text-emerald-400/80 hover:text-emerald-300">
            View your team →
          </Link>
        </div>
      ) : null}

      {checkoutStatus === "cancelled" ? (
        <div className="mt-5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Checkout was cancelled. No payment was made.
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Empty state */}
      {items.length === 0 && checkoutStatus !== "success" ? (
        <div className="mt-8 text-center">
          <p className="text-sm wf-muted">No agents in your basket yet.</p>
          <Link
            href="/agents/hire"
            className="mt-3 inline-block wf-btn-primary px-4 py-2 text-sm font-medium rounded-lg"
          >
            Browse agents →
          </Link>
        </div>
      ) : null}

      {/* Basket items */}
      {items.length > 0 ? (
        <div className="mt-5">
          <div className="divide-y divide-white/[0.07]">
            {items.map((item) => {
              const catalog = AGENT_HIRE_CATALOG.find((c) => c.kind === item.agentKind);
              const isTeal = item.agentKind === "ASSISTANT";
              return (
                <div key={item.agentKind} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isTeal ? "bg-teal-900/60 text-teal-200" : "bg-amber-900/60 text-amber-200"
                      }`}
                    >
                      {item.agentKind === "ASSISTANT" ? "AS" : "PM"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{catalog?.title ?? kindLabel(item.agentKind)}</div>
                      <div className="mt-0.5 text-xs wf-muted">
                        {scheduleLabel(item.schedule)}
                        {catalog?.recurringPrices[item.schedule]
                          ? ` · ${catalog.recurringPrices[item.schedule]}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.agentKind)}
                    className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[var(--foreground)]/60 transition hover:bg-white/[0.07]"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={pending || items.length === 0}
              onClick={handleHireNow}
              className="relative w-full overflow-hidden rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-400/90 via-teal-400/90 to-cyan-400/90 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_4px_16px_rgba(20,184,166,0.15)] transition disabled:opacity-50"
            >
              <span className="absolute inset-0 opacity-20 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.8)_50%,transparent_80%)]" />
              <span className="relative">{pending ? "Creating checkout…" : "Hire Now →"}</span>
            </button>
            <p className="mt-2 text-center text-xs wf-muted">You&apos;ll be redirected to Stripe to complete payment.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
