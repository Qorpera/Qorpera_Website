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

export default async function MetricsPage() {
  const session = await getSession();
  if (!session) return notFound();

  const metrics = await getMetricsForUser(session.userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="wf-panel rounded-3xl p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Metrics</h1>
        <p className="mt-2 text-base wf-muted">
          Live performance signals across your AI workforce — submissions, approvals, task
          completion, and API spend.
        </p>
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
            <p className="mt-0.5 text-sm wf-muted">Tasks and submissions · last 14 days</p>
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
        <p className="mt-1 text-sm wf-muted">Last 90 days · submissions + delegated tasks</p>

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
      <section className="wf-panel rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Local AI usage</h2>
            <p className="mt-0.5 text-sm wf-muted">Ollama · this month · estimated cloud savings</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            $0.00 actual cost
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="wf-soft rounded-2xl p-4">
            <div className="text-xs wf-muted">Requests</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {metrics.localAiUsage.requestCount.toLocaleString()}
            </div>
          </div>
          <div className="wf-soft rounded-2xl p-4">
            <div className="text-xs wf-muted">Input tokens</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {metrics.localAiUsage.promptTokens.toLocaleString()}
            </div>
          </div>
          <div className="wf-soft rounded-2xl p-4">
            <div className="text-xs wf-muted">Output tokens</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {metrics.localAiUsage.completionTokens.toLocaleString()}
            </div>
          </div>
        </div>

        {(metrics.localAiUsage.promptTokens > 0 || metrics.localAiUsage.completionTokens > 0) && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.1em] wf-muted">
              Equivalent cloud cost if run via
            </div>
            <div className="space-y-2">
              {metrics.localAiUsage.cloudEquivalents.map((eq) => {
                const maxUsd = Math.max(...metrics.localAiUsage.cloudEquivalents.map((e) => e.usd), 0.001);
                const barWidth = Math.round((eq.usd / maxUsd) * 100);
                return (
                  <div key={eq.label} className="flex items-center gap-3">
                    <div className="w-36 shrink-0 text-sm text-white/70">{eq.label}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8">
                      <div
                        className="h-1.5 rounded-full bg-violet-500/60"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm tabular-nums font-medium text-violet-300">
                      {usd(eq.usd)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {metrics.localAiUsage.requestCount === 0 && (
          <p className="mt-4 text-sm wf-muted">No local AI usage recorded this month. Set a model route to Ollama to start tracking.</p>
        )}
      </section>
    </div>
  );
}
