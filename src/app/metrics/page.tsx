import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMetricsForUser, type DailyActivityPoint } from "@/lib/metrics-store";

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function usd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function ActivityChart({ data }: { data: DailyActivityPoint[] }) {
  const maxVal = Math.max(1, ...data.map((d) => d.tasks + d.submissions));
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => {
        const taskH = Math.round((d.tasks / maxVal) * 100);
        const subH = Math.round((d.submissions / maxVal) * 100);
        const label = d.date.slice(5); // "MM-DD"
        return (
          <div key={d.date} className="group flex flex-1 flex-col items-center gap-0.5 relative">
            <div className="flex flex-col justify-end gap-px w-full" style={{ height: "52px" }}>
              {d.submissions > 0 && (
                <div
                  className="w-full rounded-sm bg-teal-500/50"
                  style={{ height: `${subH}%` }}
                />
              )}
              {d.tasks > 0 && (
                <div
                  className="w-full rounded-sm bg-white/20"
                  style={{ height: `${taskH}%` }}
                />
              )}
              {d.tasks === 0 && d.submissions === 0 && (
                <div className="w-full rounded-sm bg-white/5" style={{ height: "2px" }} />
              )}
            </div>
            <span className="text-[9px] wf-muted tabular-nums">{label}</span>
            {/* tooltip */}
            <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
              <div className="rounded-lg border border-[var(--border)] bg-[rgba(8,12,16,0.95)] px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
                <div className="text-white/70">{d.date}</div>
                <div className="text-white/90">{d.tasks} tasks · {d.submissions} submissions</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "teal":
      return "bg-teal-500/15 text-teal-300 border-teal-400/25";
    case "amber":
      return "bg-amber-500/15 text-amber-300 border-amber-400/25";
    case "rose":
      return "bg-rose-500/15 text-rose-300 border-rose-400/25";
    case "green":
      return "bg-green-500/15 text-green-300 border-green-400/25";
    case "purple":
      return "bg-purple-500/15 text-purple-300 border-purple-400/25";
    case "cyan":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-400/25";
    case "slate":
      return "bg-slate-500/15 text-slate-300 border-slate-400/25";
    case "violet":
      return "bg-violet-500/15 text-violet-300 border-violet-400/25";
    default:
      return "bg-white/10 text-white/70 border-white/15";
  }
}

const RANGE_OPTIONS = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

export default async function MetricsPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) return notFound();
  const resolved = (await searchParams) ?? {};
  const rangeRaw = Array.isArray(resolved.range) ? resolved.range[0] : resolved.range;
  const rangeDays = rangeRaw === "7" ? 7 : rangeRaw === "30" ? 30 : 90;

  const metrics = await getMetricsForUser(session.userId, rangeDays);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Metrics</h1>
            <p className="mt-2 text-base wf-muted">
              Live performance signals across your AI workforce — submissions, approvals, task
              completion, and API spend.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/metrics?range=${opt.value}`}
                className={`wf-btn px-4 py-2 text-sm ${String(rangeDays) === opt.value ? "border-teal-400/40 bg-teal-500/15 text-teal-200" : ""}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Row 1: KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Submissions this week</div>
          <div className="mt-2 text-4xl font-semibold tabular-nums">
            {metrics.submissionsThisWeek}
          </div>
          <div className="mt-2 text-xs wf-muted">Total all-time: {metrics.totalSubmissions}</div>
        </div>

        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Acceptance rate</div>
          <div className="mt-2 text-4xl font-semibold tabular-nums">
            {pct(metrics.acceptanceRate)}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/8">
            <div
              className="h-1.5 rounded-full bg-teal-500"
              style={{ width: `${Math.round(metrics.acceptanceRate * 100)}%` }}
            />
          </div>
        </div>

        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Open approvals</div>
          <div className="mt-2 text-4xl font-semibold tabular-nums">
            {metrics.openApprovals}
          </div>
          <div className="mt-2 text-xs wf-muted">Pending your review</div>
        </div>

        <div className="wf-panel rounded-3xl p-5">
          <div className="text-sm wf-muted">Est. API spend this month</div>
          <div className="mt-2 text-4xl font-semibold tabular-nums">
            {usd(metrics.apiSpendThisMonth)}
          </div>
          <div className="mt-2 text-xs wf-muted">Across all providers</div>
        </div>
      </section>

      {/* Row 2: Daily activity chart */}
      <section className="wf-panel rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
            <p className="mt-0.5 text-sm wf-muted">Tasks and submissions · last {Math.min(rangeDays, 90)} days</p>
          </div>
          <div className="flex items-center gap-3 text-xs wf-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-white/20" />
              Tasks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-teal-500/50" />
              Submissions
            </span>
          </div>
        </div>
        <ActivityChart data={metrics.dailyActivity} />
      </section>

      {/* Row 3: Per-agent table */}
      <section className="wf-panel rounded-3xl p-6">
        <h2 className="text-lg font-semibold tracking-tight">Per-agent performance</h2>
        <p className="mt-1 text-sm wf-muted">Last {rangeDays} days · submissions + delegated tasks</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-xs wf-muted">
                <th className="pb-2 pr-4 text-left font-medium">Agent</th>
                <th className="pb-2 pr-4 text-right font-medium">Submissions</th>
                <th className="pb-2 pr-4 text-right font-medium">Accepted</th>
                <th className="pb-2 pr-4 text-right font-medium">Acceptance %</th>
                <th className="pb-2 pr-4 text-right font-medium">Tasks done</th>
                <th className="pb-2 pr-4 text-right font-medium">Completion %</th>
                <th className="pb-2 text-right font-medium">Avg tool latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {metrics.agentRows.map((row) => (
                <tr key={row.kind} className="group">
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass(row.tone)}`}
                    >
                      {row.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{row.submissions}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{row.accepted}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.submissions > 0 ? pct(row.acceptanceRate) : <span className="wf-muted">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.delegatedTotal > 0
                      ? `${row.delegatedDone} / ${row.delegatedTotal}`
                      : <span className="wf-muted">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.delegatedTotal > 0 ? pct(row.completionRate) : <span className="wf-muted">—</span>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {row.avgToolLatencyMs !== null
                      ? `${row.avgToolLatencyMs.toLocaleString()} ms`
                      : <span className="wf-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Row 3: Workflow quality + Project health + Provider usage */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* Left: Workflow quality */}
        <div className="wf-panel rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Workflow quality</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs wf-muted">Total submissions</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {metrics.totalSubmissions}
              </div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs wf-muted">Needs revision</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {metrics.needsRevisionCount}
              </div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs wf-muted">Revision rate</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {pct(metrics.avgRevisionRate)}
              </div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs wf-muted">Run success rate</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {pct(metrics.runSuccessRate)}
              </div>
              <div className="mt-0.5 text-[11px] wf-muted">Last 30 days</div>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs wf-muted">Failed tasks</div>
              <div className={`mt-1 text-2xl font-semibold tabular-nums ${metrics.failedTaskCount > 0 ? "text-rose-400" : ""}`}>
                {metrics.failedTaskCount}
              </div>
              <div className="mt-0.5 text-[11px] wf-muted">Last 90 days</div>
            </div>
          </div>
        </div>

        {/* Right: Project health + Provider usage */}
        <div className="space-y-4">
          <div className="wf-panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Project health</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-xl border border-green-400/20 bg-green-500/10 p-4 text-center">
                <div className="text-2xl font-semibold text-green-300 tabular-nums">
                  {metrics.projectHealthCounts.green}
                </div>
                <div className="mt-0.5 text-xs text-green-400/80">Green</div>
              </div>
              <div className="flex-1 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-center">
                <div className="text-2xl font-semibold text-amber-300 tabular-nums">
                  {metrics.projectHealthCounts.yellow}
                </div>
                <div className="mt-0.5 text-xs text-amber-400/80">Yellow</div>
              </div>
              <div className="flex-1 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-center">
                <div className="text-2xl font-semibold text-rose-300 tabular-nums">
                  {metrics.projectHealthCounts.red}
                </div>
                <div className="mt-0.5 text-xs text-rose-400/80">Red</div>
              </div>
            </div>
          </div>

          <div className="wf-panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Runner health</h2>
            <p className="mt-0.5 text-sm wf-muted">Last 30 days</p>
            {metrics.runnerJobStats.total === 0 ? (
              <p className="mt-3 text-sm wf-muted">No runner jobs yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="wf-muted">Total jobs</span>
                  <span className="tabular-nums font-medium">{metrics.runnerJobStats.total}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="wf-muted">Succeeded</span>
                  <span className="tabular-nums text-emerald-400">{metrics.runnerJobStats.succeeded}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="wf-muted">Failed</span>
                  <span className={`tabular-nums ${metrics.runnerJobStats.failed > 0 ? "text-rose-400" : "wf-muted"}`}>
                    {metrics.runnerJobStats.failed}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs wf-muted mb-1">
                    <span>Success rate</span>
                    <span>{pct(metrics.runnerJobStats.successRate)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500"
                      style={{ width: `${Math.round(metrics.runnerJobStats.successRate * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="wf-panel rounded-3xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Provider usage</h2>
            {metrics.providerUsage.length === 0 ? (
              <p className="mt-3 text-sm wf-muted">No provider credentials configured.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {metrics.providerUsage.map((p) => (
                  <div
                    key={p.provider}
                    className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-sm font-medium">{p.provider}</span>
                    <div className="flex items-center gap-4 text-sm tabular-nums">
                      <span className="wf-muted">{p.requests.toLocaleString()} req</span>
                      <span className="font-medium">{usd(p.usdEstimate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Local AI usage */}
      <section className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-[rgba(8,12,16,0.9)] shadow-[0_0_80px_rgba(20,184,166,0.08)]">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-teal-400/70">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.558-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.9 0 .181.056.386.33.594z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.845v-.975a.75.75 0 00-1.5 0v.975A4.25 4.25 0 007 10.5c0 1.18.59 2.137 1.508 2.75H8.5a.75.75 0 000 1.5h.75v.975a.75.75 0 001.5 0v-.975h.042A4.25 4.25 0 0013 12.125c0-1.18-.59-2.137-1.508-2.75H11.5a.75.75 0 000-1.5h-.75zm-2.5 0v2.337A2.75 2.75 0 008.25 10.5c0-.563.21-1.027.558-1.345h-.558zM11.25 12.163V9.825A2.75 2.75 0 0111.75 10.5c0 .563-.21 1.027-.558 1.345l.058.318z" clipRule="evenodd" />
            </svg>
            Local AI · Ollama · This month
          </div>

          {metrics.localAiUsage.requestCount === 0 ? (
            <p className="mt-4 text-sm wf-muted">No local AI usage recorded this month. Set a model route to Ollama to start tracking.</p>
          ) : (
            <>
              {/* Hero savings number */}
              {metrics.localAiUsage.cloudEquivalents.length > 0 && (() => {
                const avgSaving = metrics.localAiUsage.cloudEquivalents.reduce((sum, e) => sum + e.usd, 0) / metrics.localAiUsage.cloudEquivalents.length;
                return (
                  <div className="mt-6 flex flex-col items-start gap-1">
                    <div className="text-sm font-medium text-white/50">Avg. est. cloud cost for these tokens</div>
                    <div className="text-7xl font-black tabular-nums tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-teal-300 via-emerald-300 to-cyan-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.4)]">
                      {usd(avgSaving)}
                    </div>
                    <div className="text-base font-medium text-white/45">
                      avg. across Gemini 3, GPT 5.2, Sonnet &amp; Opus 4.6 — you paid <span className="font-bold text-teal-300">$0.00</span>
                    </div>
                  </div>
                );
              })()}

              {/* Token stats */}
              <div className="mt-7 flex flex-wrap gap-5 border-t border-white/[0.06] pt-6 text-sm">
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-widest">Requests</div>
                  <div className="mt-0.5 text-xl font-semibold tabular-nums">{metrics.localAiUsage.requestCount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-widest">Input tokens</div>
                  <div className="mt-0.5 text-xl font-semibold tabular-nums">{metrics.localAiUsage.promptTokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-widest">Output tokens</div>
                  <div className="mt-0.5 text-xl font-semibold tabular-nums">{metrics.localAiUsage.completionTokens.toLocaleString()}</div>
                </div>
              </div>

              {/* Cloud comparison rows */}
              <div className="mt-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">Cloud equivalent cost breakdown</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {metrics.localAiUsage.cloudEquivalents.map((eq) => {
                    const maxUsd = Math.max(...metrics.localAiUsage.cloudEquivalents.map((e) => e.usd), 0.001);
                    const barWidth = Math.round((eq.usd / maxUsd) * 100);
                    const isMax = eq.usd === maxUsd;
                    return (
                      <div key={eq.label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isMax ? "border-teal-500/30 bg-teal-500/[0.07]" : "border-white/[0.05] bg-white/[0.02]"}`}>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-medium ${isMax ? "text-teal-300" : "text-white/55"}`}>{eq.label}</div>
                          <div className="mt-1.5 h-1 rounded-full bg-white/8">
                            <div
                              className={`h-1 rounded-full ${isMax ? "bg-teal-400/70" : "bg-white/20"}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className={`shrink-0 text-right text-lg font-bold tabular-nums ${isMax ? "text-teal-300" : "text-white/50"}`}>
                          {usd(eq.usd)}
                        </div>
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
  );
}
