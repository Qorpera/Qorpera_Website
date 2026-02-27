"use client";

import { useState } from "react";
import Link from "next/link";
import type { MetricsSummary, DailyActivityPoint, WeeklyAcceptancePoint } from "@/lib/metrics-store";

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(r: number) { return `${Math.round(r * 100)}%`; }
function usd(n: number) { return `$${n.toFixed(2)}`; }

function DeltaBadge({ delta, unit = "%" }: { delta: number; unit?: string }) {
  const sign  = delta > 0 ? "+" : "";
  const color = delta > 0
    ? "text-teal-400 bg-teal-500/10 border-teal-500/20"
    : delta < 0
    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
    : "text-white/40 bg-white/5 border-white/10";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums ${color}`}>
      {sign}{unit === "%" ? Math.round(Math.abs(delta) * 100) : Math.abs(delta)}{unit} vs last wk
    </span>
  );
}

function toneClass(tone: string) {
  const MAP: Record<string, string> = {
    teal:   "bg-teal-500/15 text-teal-300 border-teal-400/25",
    amber:  "bg-amber-500/15 text-amber-300 border-amber-400/25",
    rose:   "bg-rose-500/15 text-rose-300 border-rose-400/25",
    green:  "bg-green-500/15 text-green-300 border-green-400/25",
    purple: "bg-purple-500/15 text-purple-300 border-purple-400/25",
    cyan:   "bg-cyan-500/15 text-cyan-300 border-cyan-400/25",
    slate:  "bg-slate-500/15 text-slate-300 border-slate-400/25",
    violet: "bg-violet-500/15 text-violet-300 border-violet-400/25",
  };
  return MAP[tone] ?? "bg-white/10 text-white/70 border-white/15";
}

// ─── activity heatmap ────────────────────────────────────────────────────────

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_LABELS  = ["Mon","","Wed","","Fri","","Sun"];

function heatLevel(total: number, maxVal: number) {
  if (total === 0) return "bg-white/[0.07]";
  const r = total / maxVal;
  if (r <= 0.25) return "bg-teal-600/50";
  if (r <= 0.5)  return "bg-teal-500/65";
  if (r <= 0.75) return "bg-teal-400/80";
  return "bg-teal-300/90";
}

function ActivityHeatmap({ data }: { data: DailyActivityPoint[] }) {
  if (data.length === 0) return <p className="text-sm wf-muted">No activity in this range.</p>;

  const todayStr    = new Date().toISOString().slice(0, 10);
  const activityMap = new Map<string, DailyActivityPoint>();
  for (const d of data) activityMap.set(d.date, d);
  const maxVal        = Math.max(1, ...data.map((d) => d.tasks + d.submissions));
  const firstDataDate = [...data].map((d) => d.date).sort()[0];

  // Align grid start to Monday on/before firstDataDate
  const anchor = new Date(firstDataDate + "T12:00:00Z");
  anchor.setUTCDate(anchor.getUTCDate() - (anchor.getUTCDay() + 6) % 7);

  // Build week columns (Mon→Sun)
  const weeks: string[][] = [];
  const cur = new Date(anchor);
  const end = new Date(todayStr + "T12:00:00Z");
  while (cur <= end) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) { week.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
    weeks.push(week);
  }

  const CELL = 22, GAP = 5;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {/* DOW labels */}
        <div className="flex flex-col shrink-0" style={{ gap: `${GAP}px`, paddingTop: "22px" }}>
          {DOW_LABELS.map((label, i) => (
            <div key={i} style={{ width: "24px", height: `${CELL}px` }}
              className="flex items-center justify-end text-[10px] text-white/25 leading-none pr-1">
              {label}
            </div>
          ))}
        </div>
        {/* Week columns */}
        <div className="overflow-x-auto flex-1">
          <div className="flex min-w-max" style={{ gap: `${GAP}px` }}>
            {weeks.map((week, wi) => {
              const d = new Date(week[0] + "T12:00:00Z");
              const monthLabel = (wi === 0 || d.getUTCDate() <= 7) ? MONTH_SHORT[d.getUTCMonth()] : "";
              return (
                <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                  <div style={{ height: "18px" }} className="flex items-center text-[10px] text-white/30 leading-none">
                    {monthLabel}
                  </div>
                  {week.map((dateStr, di) => {
                    const inRange = dateStr >= firstDataDate && dateStr <= todayStr;
                    const a       = activityMap.get(dateStr);
                    const total   = a ? a.tasks + a.submissions : 0;
                    const isToday = dateStr === todayStr;
                    return (
                      <div
                        key={di}
                        title={inRange
                          ? `${dateStr} — ${total
                              ? `${a!.tasks} task${a!.tasks !== 1 ? "s" : ""}, ${a!.submissions} submission${a!.submissions !== 1 ? "s" : ""}`
                              : "No activity"}`
                          : undefined}
                        style={{ width: `${CELL}px`, height: `${CELL}px` }}
                        className={`rounded-[3px] cursor-default ${inRange ? heatLevel(total, maxVal) : "bg-transparent"} ${isToday ? "ring-2 ring-teal-300/70" : ""}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-white/25" style={{ paddingLeft: "28px" }}>
        <span>Less</span>
        <div className="flex" style={{ gap: `${GAP}px` }}>
          {["bg-white/[0.07]","bg-teal-600/50","bg-teal-500/65","bg-teal-400/80","bg-teal-300/90"].map((cls, i) => (
            <div key={i} style={{ width: `${CELL}px`, height: `${CELL}px` }} className={`rounded-[3px] ${cls}`} />
          ))}
        </div>
        <span>More</span>
        <span className="ml-2 opacity-60">tasks + submissions per day</span>
      </div>
    </div>
  );
}

// ─── 7-day bar chart ─────────────────────────────────────────────────────────

const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function ActivityBars({ data }: { data: DailyActivityPoint[] }) {
  const maxVal   = Math.max(1, ...data.map((d) => d.tasks + d.submissions));
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-end gap-2" style={{ height: "88px" }}>
      {data.map((d) => {
        const total   = d.tasks + d.submissions;
        const taskH   = Math.round((d.tasks / maxVal) * 100);
        const subH    = Math.round((d.submissions / maxVal) * 100);
        const isToday = d.date === todayStr;
        const dow     = new Date(d.date + "T12:00:00Z").getUTCDay();
        return (
          <div key={d.date} className="group flex flex-1 flex-col items-center gap-1 relative">
            <div className={`flex flex-col justify-end gap-px w-full rounded-t overflow-hidden ${isToday ? "ring-1 ring-teal-400/50" : ""}`} style={{ height: "68px" }}>
              {d.submissions > 0 && <div className="w-full bg-teal-500/50" style={{ height: `${subH}%` }} />}
              {d.tasks > 0       && <div className="w-full bg-white/20"    style={{ height: `${taskH}%` }} />}
              {total === 0       && <div className="w-full bg-white/[0.05] rounded-sm" style={{ height: "3px" }} />}
            </div>
            <span className={`text-[10px] leading-none font-medium ${isToday ? "text-teal-400" : "wf-muted"}`}>
              {DAY_SHORT[dow]}
            </span>
            <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded-lg border border-white/10 bg-[rgba(8,12,16,0.95)] px-2 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                <div className="wf-muted mb-0.5">{d.date}</div>
                <div className="text-white/85">{d.tasks} tasks · {d.submissions} submissions</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── weekly trend chart ──────────────────────────────────────────────────────

function WeeklyTrendChart({ data }: { data: WeeklyAcceptancePoint[] }) {
  const activeBars = data.filter((d) => d.submissions > 0);
  const avg = activeBars.length > 0 ? activeBars.reduce((s, d) => s + d.rate, 0) / activeBars.length : 0;
  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d) => {
        const height     = Math.round(d.rate * 100);
        const isAboveAvg = d.submissions > 0 && d.rate >= avg;
        const label      = d.weekStart.slice(5);
        return (
          <div key={d.weekStart} className="group flex flex-1 flex-col items-center gap-1 relative">
            <div className="flex items-end w-full" style={{ height: "64px" }}>
              {d.submissions > 0
                ? <div className={`w-full rounded-sm ${isAboveAvg ? "bg-teal-500/60" : "bg-white/15"}`} style={{ height: `${Math.max(height, 2)}%` }} />
                : <div className="w-full rounded-sm bg-white/5" style={{ height: "2px" }} />}
            </div>
            <span className="text-[9px] wf-muted tabular-nums">{label}</span>
            <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded-lg border border-[var(--border)] bg-[rgba(8,12,16,0.95)] px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                <div className="text-white/70">{d.weekStart}</div>
                {d.submissions > 0
                  ? <div className="text-white/90">{pct(d.rate)} · {d.accepted}/{d.submissions} accepted</div>
                  : <div className="wf-muted">No submissions</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── tabs ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "performance" | "system";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",    label: "Overview"    },
  { id: "performance", label: "Performance" },
  { id: "system",      label: "System"      },
];

const RANGE_OPTIONS = [
  { label: "7d",      value: "7"   },
  { label: "30d",     value: "30"  },
  { label: "1yr",     value: "365" },
  { label: "All time", value: "0"  },
] as const;

// ─── dashboard ───────────────────────────────────────────────────────────────

export function MetricsDashboard({ metrics, rangeDays }: { metrics: MetricsSummary; rangeDays: number }) {
  const [tab, setTab] = useState<Tab>("overview");

  // Weekly trend delta (first 4 vs last 4 weeks)
  const firstHalf  = metrics.weeklyAcceptanceTrend.slice(0, 4).filter((w) => w.submissions > 0);
  const secondHalf = metrics.weeklyAcceptanceTrend.slice(4).filter((w) => w.submissions > 0);
  const firstAvg   = firstHalf.length  > 0 ? firstHalf.reduce((s, w)  => s + w.rate, 0) / firstHalf.length  : null;
  const secondAvg  = secondHalf.length > 0 ? secondHalf.reduce((s, w) => s + w.rate, 0) / secondHalf.length : null;
  const trendDelta = firstAvg !== null && secondAvg !== null ? secondAvg - firstAvg : null;

  return (
    <div className="space-y-5">

      {/* ── Header + nav ── */}
      <header className="wf-panel rounded-3xl px-6 pt-5 pb-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
            <p className="mt-1 text-sm wf-muted">Live performance signals across your AI workforce.</p>
          </div>
          {/* Range selector */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1 self-start sm:self-auto">
            {RANGE_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/metrics?range=${opt.value}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  String(rangeDays) === opt.value ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-0 border-b border-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-teal-400 text-teal-300"
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* KPI row */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="wf-panel rounded-3xl p-5">
              <div className="text-sm wf-muted">Submissions this week</div>
              <div className="mt-2 text-4xl font-semibold tabular-nums">{metrics.submissionsThisWeek}</div>
              <div className="mt-2 text-xs wf-muted">All-time: {metrics.totalSubmissions}</div>
            </div>
            <div className="wf-panel rounded-3xl p-5">
              <div className="text-sm wf-muted">Acceptance rate</div>
              <div className="mt-2 flex items-end gap-3 flex-wrap">
                <span className="text-4xl font-semibold tabular-nums">{pct(metrics.acceptanceRate)}</span>
                {metrics.acceptanceRateDelta !== null && <DeltaBadge delta={metrics.acceptanceRateDelta} />}
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/8">
                <div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${Math.round(metrics.acceptanceRate * 100)}%` }} />
              </div>
            </div>
            <div className="wf-panel rounded-3xl p-5">
              <div className="text-sm wf-muted">Open approvals</div>
              <div className="mt-2 text-4xl font-semibold tabular-nums">{metrics.openApprovals}</div>
              <div className="mt-2 text-xs wf-muted">Pending your review</div>
            </div>
            <div className="wf-panel rounded-3xl p-5">
              <div className="text-sm wf-muted">Est. API spend this month</div>
              <div className="mt-2 text-4xl font-semibold tabular-nums">{usd(metrics.apiSpendThisMonth)}</div>
              <div className="mt-2 text-xs wf-muted">Across all providers</div>
            </div>
          </section>

          {/* Activity heatmap — hero */}
          <section className="wf-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
                <p className="mt-0.5 text-sm wf-muted">Tasks and submissions · {rangeDays === 0 ? "all time" : `last ${rangeDays} days`}</p>
              </div>
              {rangeDays === 7 && (
                <div className="flex items-center gap-3 text-xs wf-muted">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-white/20" />Tasks</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500/50" />Submissions</span>
                </div>
              )}
            </div>
            {rangeDays === 7 ? <ActivityBars data={metrics.dailyActivity} /> : <ActivityHeatmap data={metrics.dailyActivity} />}
          </section>

          {/* Local AI savings */}
          <section className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-[rgba(8,12,16,0.9)] shadow-[0_0_80px_rgba(20,184,166,0.08)]">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-400/70">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.558-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.9 0 .181.056.386.33.594z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.845v-.975a.75.75 0 00-1.5 0v.975A4.25 4.25 0 007 10.5c0 1.18.59 2.137 1.508 2.75H8.5a.75.75 0 000 1.5h.75v.975a.75.75 0 001.5 0v-.975h.042A4.25 4.25 0 0013 12.125c0-1.18-.59-2.137-1.508-2.75H11.5a.75.75 0 000-1.5h-.75zm-2.5 0v2.337A2.75 2.75 0 018.25 10.5c0-.563.21-1.027.558-1.345h-.558zM11.25 12.163V9.825A2.75 2.75 0 0111.75 10.5c0 .563-.21 1.027-.558 1.345l.058.318z" clipRule="evenodd" />
                </svg>
                Local AI · Ollama · This month
              </div>
              {metrics.localAiUsage.requestCount === 0 ? (
                <p className="mt-4 text-sm wf-muted">No local AI usage recorded this month. Set a model route to Ollama to start tracking.</p>
              ) : (
                <>
                  {metrics.localAiUsage.cloudEquivalents.length > 0 && (() => {
                    const avg = metrics.localAiUsage.cloudEquivalents.reduce((s, e) => s + e.usd, 0) / metrics.localAiUsage.cloudEquivalents.length;
                    return (
                      <div className="mt-6 flex flex-col items-start gap-1">
                        <div className="text-sm font-medium text-white/50">Avg. est. cloud cost for these tokens</div>
                        <div className="text-7xl font-black tabular-nums tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-teal-300 via-emerald-300 to-cyan-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.4)]">
                          {usd(avg)}
                        </div>
                        <div className="text-base font-medium text-white/45">
                          avg. across Gemini 3, GPT 5.2, Sonnet &amp; Opus 4.6 — you paid <span className="font-bold text-teal-300">$0.00</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-7 flex flex-wrap gap-5 border-t border-white/[0.06] pt-6 text-sm">
                    {[
                      { label: "Requests",      value: metrics.localAiUsage.requestCount.toLocaleString() },
                      { label: "Input tokens",  value: metrics.localAiUsage.promptTokens.toLocaleString() },
                      { label: "Output tokens", value: metrics.localAiUsage.completionTokens.toLocaleString() },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="text-white/40 text-xs uppercase tracking-widest">{s.label}</div>
                        <div className="mt-0.5 text-xl font-semibold tabular-nums">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">Cloud equivalent cost breakdown</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {metrics.localAiUsage.cloudEquivalents.map((eq) => {
                        const maxUsd = Math.max(...metrics.localAiUsage.cloudEquivalents.map((e) => e.usd), 0.001);
                        const barW   = Math.round((eq.usd / maxUsd) * 100);
                        const isMax  = eq.usd === maxUsd;
                        return (
                          <div key={eq.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isMax ? "border-teal-500/30 bg-teal-500/[0.07]" : "border-white/[0.05] bg-white/[0.02]"}`}>
                            <div className="min-w-0 flex-1">
                              <div className={`text-xs font-medium ${isMax ? "text-teal-300" : "text-white/55"}`}>{eq.label}</div>
                              <div className="mt-1.5 h-1 rounded-full bg-white/8">
                                <div className={`h-1 rounded-full ${isMax ? "bg-teal-400/70" : "bg-white/20"}`} style={{ width: `${barW}%` }} />
                              </div>
                            </div>
                            <div className={`shrink-0 text-right text-lg font-bold tabular-nums ${isMax ? "text-teal-300" : "text-white/50"}`}>{usd(eq.usd)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ══ PERFORMANCE ═══════════════════════════════════════════════════════ */}
      {tab === "performance" && (
        <div className="space-y-5">
          {/* Quality trend — full width */}
          <section className="wf-panel rounded-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Quality over time</h2>
                <p className="mt-0.5 text-sm wf-muted">Acceptance rate by week · last 8 weeks</p>
              </div>
              {trendDelta !== null && (
                <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                  trendDelta > 0 ? "border-teal-500/25 bg-teal-500/10 text-teal-300"
                  : trendDelta < 0 ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                  : "border-white/10 bg-white/5 text-white/40"
                }`}>
                  {trendDelta > 0 ? "↑" : trendDelta < 0 ? "↓" : "→"} {Math.round(Math.abs(trendDelta) * 100)}%
                  <span className="text-xs font-normal opacity-60 ml-0.5">4wk</span>
                </div>
              )}
            </div>
            <WeeklyTrendChart data={metrics.weeklyAcceptanceTrend} />
            <div className="mt-3 flex items-center gap-3 text-xs wf-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-teal-500/60" />Above avg</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-white/15" />Below avg</span>
            </div>
          </section>

          {/* Per-agent table */}
          <section className="wf-panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Per-agent performance</h2>
            <p className="mt-1 text-sm wf-muted">
              Last {rangeDays} days · submissions + delegated tasks ·{" "}
              <span className="text-white/40">Trend = recent half vs earlier half of period</span>
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6 text-xs wf-muted">
                    <th className="pb-2 pr-4 text-left font-medium">Agent</th>
                    <th className="pb-2 pr-4 text-right font-medium">Submissions</th>
                    <th className="pb-2 pr-4 text-right font-medium">Accepted</th>
                    <th className="pb-2 pr-4 text-right font-medium">Acceptance %</th>
                    <th className="pb-2 pr-4 text-right font-medium">Trend</th>
                    <th className="pb-2 pr-4 text-right font-medium">Tasks done</th>
                    <th className="pb-2 pr-4 text-right font-medium">Completion %</th>
                    <th className="pb-2 text-right font-medium">Avg tool latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {metrics.agentRows.map((row) => (
                    <tr key={row.kind}>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass(row.tone)}`}>
                          {row.name}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.submissions}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.accepted}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.submissions > 0 ? pct(row.acceptanceRate) : <span className="wf-muted">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.acceptanceRateDelta !== null ? (
                          <span className={`text-xs font-semibold ${row.acceptanceRateDelta > 0.01 ? "text-teal-400" : row.acceptanceRateDelta < -0.01 ? "text-rose-400" : "wf-muted"}`}>
                            {row.acceptanceRateDelta > 0.01 ? "↑" : row.acceptanceRateDelta < -0.01 ? "↓" : "→"} {Math.round(Math.abs(row.acceptanceRateDelta) * 100)}%
                          </span>
                        ) : <span className="wf-muted text-xs">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.delegatedTotal > 0 ? `${row.delegatedDone} / ${row.delegatedTotal}` : <span className="wf-muted">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.delegatedTotal > 0 ? pct(row.completionRate) : <span className="wf-muted">—</span>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {row.avgToolLatencyMs !== null ? `${row.avgToolLatencyMs.toLocaleString()} ms` : <span className="wf-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Workflow quality */}
          <section className="wf-panel rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Workflow quality</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total submissions", value: String(metrics.totalSubmissions) },
                { label: "Needs revision",    value: String(metrics.needsRevisionCount) },
                { label: "Revision rate",     value: pct(metrics.avgRevisionRate) },
                { label: "Run success rate",  value: pct(metrics.runSuccessRate),   note: "Last 30 days" },
                { label: "Failed tasks",      value: String(metrics.failedTaskCount),
                  accent: metrics.failedTaskCount > 0 ? "text-rose-400" : undefined, note: "Last 90 days" },
              ].map((c) => (
                <div key={c.label} className="wf-soft rounded-2xl p-4">
                  <div className="text-xs wf-muted">{c.label}</div>
                  <div className={`mt-1 text-2xl font-semibold tabular-nums ${c.accent ?? ""}`}>{c.value}</div>
                  {c.note && <div className="mt-0.5 text-[11px] wf-muted">{c.note}</div>}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ══ SYSTEM ════════════════════════════════════════════════════════════ */}
      {tab === "system" && (
        <div className="space-y-5">
          {/* Project + Runner health */}
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="wf-panel rounded-3xl p-6">
              <h2 className="text-lg font-semibold tracking-tight">Project health</h2>
              <div className="mt-4 flex items-center gap-3">
                {[
                  { label: "Green",  count: metrics.projectHealthCounts.green,  cls: "border-green-400/20 bg-green-500/10 text-green-300 sub-text-green-400/80" },
                  { label: "Yellow", count: metrics.projectHealthCounts.yellow, cls: "border-amber-400/20 bg-amber-500/10 text-amber-300" },
                  { label: "Red",    count: metrics.projectHealthCounts.red,    cls: "border-rose-400/20  bg-rose-500/10  text-rose-300" },
                ].map((h) => (
                  <div key={h.label} className={`flex-1 rounded-xl border p-4 text-center ${h.cls}`}>
                    <div className="text-2xl font-semibold tabular-nums">{h.count}</div>
                    <div className="mt-0.5 text-xs opacity-70">{h.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="wf-panel rounded-3xl p-6">
              <h2 className="text-lg font-semibold tracking-tight">Runner health</h2>
              <p className="mt-0.5 text-sm wf-muted">Last 30 days</p>
              {metrics.runnerJobStats.total === 0 ? (
                <p className="mt-3 text-sm wf-muted">No runner jobs yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Total jobs", value: String(metrics.runnerJobStats.total),      cls: "" },
                    { label: "Succeeded",  value: String(metrics.runnerJobStats.succeeded),  cls: "text-emerald-400" },
                    { label: "Failed",     value: String(metrics.runnerJobStats.failed),
                      cls: metrics.runnerJobStats.failed > 0 ? "text-rose-400" : "wf-muted" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="wf-muted">{r.label}</span>
                      <span className={`tabular-nums font-medium ${r.cls}`}>{r.value}</span>
                    </div>
                  ))}
                  <div className="pt-1">
                    <div className="flex justify-between text-xs wf-muted mb-1">
                      <span>Success rate</span><span>{pct(metrics.runnerJobStats.successRate)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8">
                      <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round(metrics.runnerJobStats.successRate * 100)}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Provider usage */}
          <section className="wf-panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Provider usage</h2>
            {metrics.providerUsage.length === 0 ? (
              <p className="mt-3 text-sm wf-muted">No provider credentials configured.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {metrics.providerUsage.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                    <span className="text-sm font-medium">{p.provider}</span>
                    <div className="flex items-center gap-4 text-sm tabular-nums">
                      <span className="wf-muted">{p.requests.toLocaleString()} req</span>
                      <span className="font-medium">{usd(p.usdEstimate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
