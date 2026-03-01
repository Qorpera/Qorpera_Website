"use client";

import type { KpiGridData, KpiCard } from "@/lib/data-app-types";

const TONE_MAP: Record<string, string> = {
  teal: "bg-teal-500/15 text-teal-300 border-teal-400/25",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/25",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  green: "bg-green-500/15 text-green-300 border-green-400/25",
  purple: "bg-purple-500/15 text-purple-300 border-purple-400/25",
  slate: "bg-slate-500/15 text-slate-300 border-slate-400/25",
};

const TREND_ICONS: Record<string, { symbol: string; cls: string }> = {
  up: { symbol: "\u2191", cls: "text-green-400" },
  down: { symbol: "\u2193", cls: "text-rose-400" },
  flat: { symbol: "\u2192", cls: "text-white/40" },
};

function KpiCardComponent({ card }: { card: KpiCard }) {
  const tone = TONE_MAP[card.tone ?? "teal"] ?? TONE_MAP.teal;
  const trend = card.trend ? TREND_ICONS[card.trend] : null;

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="text-sm font-medium opacity-70">{card.label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-semibold tabular-nums">{card.value}</span>
        {card.unit && <span className="text-sm opacity-60 mb-1">{card.unit}</span>}
      </div>
      {trend && (
        <div className={`mt-2 text-sm font-medium ${trend.cls}`}>
          {trend.symbol} {card.trend}
        </div>
      )}
    </div>
  );
}

export function DataAppKpiGrid({ data }: { data: KpiGridData }) {
  if (!data.cards || data.cards.length === 0) {
    return <div className="wf-muted text-sm py-8 text-center">No metrics to display.</div>;
  }

  const cols = data.columns ?? 3;
  const gridCls =
    cols === 2 ? "grid-cols-1 sm:grid-cols-2"
    : cols === 4 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${gridCls}`}>
      {data.cards.map((card, i) => (
        <KpiCardComponent key={i} card={card} />
      ))}
    </div>
  );
}
