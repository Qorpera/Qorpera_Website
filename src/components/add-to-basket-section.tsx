"use client";

import { useState } from "react";

const SCHEDULE_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export function AddToBasketSection({
  agentKind,
  recurringPrices,
  stripeEnabled,
  showDemo,
}: {
  agentKind: string;
  recurringPrices: Record<string, string>;
  stripeEnabled: boolean;
  showDemo: boolean;
}) {
  const [schedule, setSchedule] = useState<string>("MONTHLY");

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] wf-muted">Employment cadence</div>
      <div className="grid grid-cols-3 gap-2">
        {SCHEDULE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSchedule(opt.value)}
            className={`rounded-xl border p-2.5 text-center transition-colors ${
              schedule === opt.value
                ? "border-teal-600 bg-teal-950/40"
                : "border-[var(--border)] hover:bg-white/5"
            }`}
          >
            <div className={`text-sm font-semibold ${schedule === opt.value ? "text-teal-200" : ""}`}>
              {opt.label}
            </div>
            <div className="mt-0.5 text-xs wf-muted">
              {recurringPrices[opt.value] ?? "—"}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {stripeEnabled ? (
          <form action="/api/agents/hire" method="post" className="flex-1">
            <input type="hidden" name="agentKind" value={agentKind} />
            <input type="hidden" name="schedule" value={schedule} />
            <input type="hidden" name="mode" value="HIRE" />
            <button
              type="submit"
              className="w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
            >
              Hire agent
            </button>
          </form>
        ) : null}

        {showDemo ? (
          <form action="/api/agents/hire" method="post" className={stripeEnabled ? "" : "flex-1"}>
            <input type="hidden" name="agentKind" value={agentKind} />
            <input type="hidden" name="schedule" value={schedule} />
            <input type="hidden" name="mode" value="LOCAL_DEMO" />
            <button
              type="submit"
              className={`rounded-xl border border-[var(--border)] bg-white/5 px-3 py-2 text-sm font-medium text-[var(--foreground)]/80 transition hover:bg-white/10 hover:text-[var(--foreground)] ${
                stripeEnabled ? "" : "w-full"
              }`}
            >
              {stripeEnabled ? "Demo" : "Add (demo)"}
            </button>
          </form>
        ) : !stripeEnabled ? (
          <div className="flex-1 rounded-xl border border-[var(--border)] bg-white/5 px-3 py-2 text-center text-sm wf-muted">
            Stripe not configured
          </div>
        ) : null}
      </div>
    </div>
  );
}
