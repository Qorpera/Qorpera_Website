"use client";

import { useState } from "react";
import { useBasket } from "@/components/basket-context";
import type { HireAgentKind, HireSchedule } from "@/lib/agent-catalog";
import { TryFreeButton } from "@/components/try-free-button";

const SCHEDULES: { value: HireSchedule; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export function AddToBasketSection({
  agentKind,
  recurringPrices,
  stripeEnabled,
  showDemo,
}: {
  agentKind: HireAgentKind;
  recurringPrices: Record<HireSchedule, string>;
  stripeEnabled: boolean;
  showDemo: boolean;
}) {
  const { addItem, removeItem, hasKind } = useBasket();
  const [schedule, setSchedule] = useState<HireSchedule>("WEEKLY");
  const inBasket = hasKind(agentKind);

  function handleScheduleChange(val: HireSchedule) {
    setSchedule(val);
    if (inBasket) addItem({ agentKind, schedule: val });
  }

  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] wf-muted">Cadence</div>
      <div className="grid grid-cols-3 gap-2">
        {SCHEDULES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleScheduleChange(opt.value)}
            className={`rounded-xl border p-2.5 text-center transition-colors ${
              schedule === opt.value
                ? "border-teal-600 bg-teal-950/40"
                : "border-[var(--border)] hover:bg-white/5"
            }`}
          >
            <div className={`text-sm font-semibold ${schedule === opt.value ? "text-teal-200" : ""}`}>
              {opt.label}
            </div>
            <div className="mt-0.5 text-xs wf-muted">{recurringPrices[opt.value]}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        {inBasket ? (
          <>
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-950/25 px-4 py-2.5 text-center text-sm font-semibold text-emerald-300">
              ✓ In Basket
            </div>
            <button
              type="button"
              onClick={() => removeItem(agentKind)}
              className="rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-2.5 text-sm text-[var(--foreground)]/60 transition hover:bg-white/[0.08]"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!stripeEnabled}
            onClick={() => stripeEnabled && addItem({ agentKind, schedule })}
            className={`relative flex-1 overflow-hidden rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              stripeEnabled
                ? "border-emerald-300/40 bg-gradient-to-r from-emerald-400/90 via-teal-400/90 to-cyan-400/90 text-zinc-950 shadow-[0_4px_16px_rgba(20,184,166,0.12)]"
                : "border-[var(--border)] bg-white/5 text-[var(--foreground)]/60"
            }`}
          >
            {stripeEnabled ? (
              <>
                <span className="absolute inset-0 opacity-20 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.8)_50%,transparent_80%)]" />
                <span className="relative">Add to Basket →</span>
              </>
            ) : (
              "Stripe not configured"
            )}
          </button>
        )}
        {showDemo ? (
          <TryFreeButton
            agentKind={agentKind}
            scheduleOptions={SCHEDULES.map((s) => ({ value: s.value, label: s.label, price: recurringPrices[s.value] }))}
          />
        ) : null}
      </div>
    </div>
  );
}
