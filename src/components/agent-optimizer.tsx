"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ScoreDimension,
  OptimizationImprovement,
  ResearchFinding,
} from "@/lib/optimizer/types";
import type { CycleSummary } from "@/lib/optimizer/optimizer-store";

type CycleDetailSerialized = {
  id: string;
  agentKind: string;
  status: string;
  overallScore: number | null;
  improvementCount: number;
  appliedCount: number;
  createdAt: string | Date;
  nextRunAt: string | Date | null;
  research: ResearchFinding[];
  synthesis: string | null;
  dimensions: ScoreDimension[];
  improvements: OptimizationImprovement[];
  appliedImprovementIds: string[];
};

type AppliedApplication = {
  id: string;
  improvementId: string;
  dimension: string;
  title: string;
  patchText: string;
  appliedAt: string | Date;
};

type Props = {
  agentKind: string;
  initialCycles: CycleSummary[];
  initialLatestDetail: CycleDetailSerialized | null;
  initialAppliedApplications: AppliedApplication[];
};

const DIMENSION_COLORS: Record<string, string> = {
  reasoning_chain: "teal",
  uncertainty_handling: "blue",
  context_utilization: "indigo",
  delegation_precision: "violet",
  grounding_strength: "amber",
  output_quality: "emerald",
  tool_guidance: "cyan",
  communication_style: "rose",
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  const colorMap: Record<string, string> = {
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    cyan: "bg-cyan-500",
    rose: "bg-rose-500",
  };
  const bg = colorMap[color] ?? "bg-teal-500";
  const pct = Math.min(100, Math.max(0, score));
  const textColor =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${bg} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold ${textColor} w-8 text-right`}>
        {score}
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-rose-500/15 text-rose-400 border-rose-500/20",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    low: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  };
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[priority] ?? styles.low}`}
    >
      {priority}
    </span>
  );
}

function OverallScoreDial({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  const ringColor =
    score >= 80
      ? "from-emerald-500 to-emerald-400"
      : score >= 60
        ? "from-amber-500 to-amber-400"
        : "from-rose-500 to-rose-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-20 h-20 rounded-full bg-gradient-to-br ${ringColor} p-0.5 shadow-lg`}
      >
        <div className="w-full h-full rounded-full bg-[rgba(8,12,16,1)] flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${color}`}>{score}</span>
          <span className="text-[9px] text-white/30 uppercase tracking-widest">score</span>
        </div>
      </div>
    </div>
  );
}

export function AgentOptimizer({
  agentKind,
  initialCycles,
  initialLatestDetail,
  initialAppliedApplications,
}: Props) {
  const [cycles, setCycles] = useState<CycleSummary[]>(initialCycles);
  const [latestDetail, setLatestDetail] = useState<CycleDetailSerialized | null>(
    initialLatestDetail,
  );
  const [appliedApps, setAppliedApps] = useState<AppliedApplication[]>(
    initialAppliedApplications,
  );
  const [running, setRunning] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [expandedImprovement, setExpandedImprovement] = useState<string | null>(null);
  const [expandedResearch, setExpandedResearch] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const appliedIds = new Set([
    ...(latestDetail?.appliedImprovementIds ?? []),
    ...appliedApps.map((a) => a.improvementId),
  ]);

  const refreshData = useCallback(async () => {
    const res = await fetch(`/api/optimizer/cycles?agentKind=${agentKind}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      cycles: CycleSummary[];
      latestDetail: CycleDetailSerialized | null;
      appliedApplications: AppliedApplication[];
    };
    setCycles(data.cycles);
    setLatestDetail(data.latestDetail);
    setAppliedApps(data.appliedApplications);
  }, [agentKind]);

  const startPolling = useCallback(
    (cycleId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/optimizer/cycles?agentKind=${agentKind}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          cycles: CycleSummary[];
          latestDetail: CycleDetailSerialized | null;
          appliedApplications: AppliedApplication[];
        };
        setCycles(data.cycles);
        setLatestDetail(data.latestDetail);
        setAppliedApps(data.appliedApplications);

        const thisRun = data.cycles.find((c) => c.id === cycleId);
        if (thisRun && thisRun.status !== "RUNNING") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setRunning(false);
          setActiveCycleId(null);
          if (thisRun.status === "FAILED") {
            setError("Analysis failed. Check your API key in Settings > Connectors.");
          }
        }
      }, 4000);
    },
    [agentKind],
  );

  const runAnalysis = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/optimizer/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKind }),
      });
      const data = (await res.json()) as { ok: boolean; cycleId: string | null };
      if (data.cycleId) {
        setActiveCycleId(data.cycleId);
        startPolling(data.cycleId);
        await refreshData();
      } else {
        setRunning(false);
        setError("Failed to start analysis cycle.");
      }
    } catch {
      setRunning(false);
      setError("Network error. Please try again.");
    }
  }, [agentKind, startPolling, refreshData]);

  const handleApply = useCallback(
    async (improvement: OptimizationImprovement, cycleId: string) => {
      setApplyingId(improvement.id);
      try {
        const res = await fetch("/api/optimizer/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            cycleId,
            improvementId: improvement.id,
            agentKind,
          }),
        });
        if (res.ok) await refreshData();
      } finally {
        setApplyingId(null);
      }
    },
    [agentKind, refreshData],
  );

  const handleRevoke = useCallback(
    async (improvementId: string) => {
      setApplyingId(improvementId);
      try {
        const res = await fetch("/api/optimizer/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke", improvementId }),
        });
        if (res.ok) await refreshData();
      } finally {
        setApplyingId(null);
      }
    },
    [refreshData],
  );

  const latestScore = latestDetail?.overallScore ?? null;
  const hasResults = latestDetail && latestDetail.status === "COMPLETE";

  return (
    <div className="min-h-screen bg-[rgba(8,12,16,1)] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Optimizer</h1>
            <p className="text-sm text-white/40 mt-1">
              Continuously researches agentic AI papers and prompt engineering to improve your advisor.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-black transition-colors"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 9a8 8 0 0114.2-3.2M20 15a8 8 0 01-14.2 3.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Running state */}
        {running && (
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <svg className="animate-spin w-5 h-5 text-teal-400 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-teal-300">Analysis in progress</p>
                <p className="text-xs text-white/40 mt-0.5">
                  Researching agentic AI papers, scoring your advisor prompt, and generating improvements...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No results yet */}
        {!hasResults && !running && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-white/60 font-medium">No analysis runs yet</p>
            <p className="text-white/30 text-sm mt-1">
              Click &ldquo;Run Analysis&rdquo; to research the latest agentic AI papers and score your advisor.
            </p>
          </div>
        )}

        {/* Results */}
        {hasResults && latestDetail && (
          <>
            {/* Score overview */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-start gap-6">
                <div className="shrink-0">
                  <OverallScoreDial score={latestScore ?? 0} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-white/80">Advisor Prompt Score</h2>
                    <span className="text-xs text-white/30">
                      {new Date(latestDetail.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {latestDetail.dimensions.map((dim) => (
                      <div key={dim.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-white/50">{dim.label}</span>
                        </div>
                        <ScoreBar
                          score={dim.score}
                          color={DIMENSION_COLORS[dim.name] ?? "teal"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Synthesis */}
            {latestDetail.synthesis && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h2 className="text-sm font-semibold text-white/80 mb-3">Research Synthesis</h2>
                <p className="text-sm text-white/50 leading-relaxed whitespace-pre-line">
                  {latestDetail.synthesis}
                </p>
              </div>
            )}

            {/* Improvements */}
            {latestDetail.improvements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white/80">
                    Optimization Recommendations
                  </h2>
                  <span className="text-xs text-white/30">
                    {appliedIds.size}/{latestDetail.improvements.length} applied
                  </span>
                </div>

                {latestDetail.improvements.map((imp) => {
                  const isApplied = appliedIds.has(imp.id);
                  const isExpanded = expandedImprovement === imp.id;
                  const isApplying = applyingId === imp.id;

                  return (
                    <div
                      key={imp.id}
                      className={`rounded-xl border transition-colors ${
                        isApplied
                          ? "border-teal-500/25 bg-teal-500/5"
                          : "border-white/5 bg-white/[0.02]"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Applied indicator */}
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isApplied
                                ? "border-teal-500 bg-teal-500"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isApplied && (
                              <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono text-white/30">{imp.dimension.replace(/_/g, " ")}</span>
                              <PriorityBadge priority={imp.priority} />
                              {isApplied && (
                                <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-white/80">{imp.issue}</p>
                            <p className="text-xs text-white/40 mt-1">{imp.recommendation}</p>
                            {imp.researchBasis && (
                              <p className="text-[11px] text-white/25 mt-1 italic">
                                Based on: {imp.researchBasis}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() =>
                                setExpandedImprovement(isExpanded ? null : imp.id)
                              }
                              className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/5 hover:border-white/10"
                            >
                              {isExpanded ? "Hide" : "Preview"}
                            </button>
                            {isApplied ? (
                              <button
                                onClick={() => handleRevoke(imp.id)}
                                disabled={isApplying}
                                className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors px-3 py-1 rounded border border-rose-500/20 hover:border-rose-500/40 disabled:opacity-40"
                              >
                                {isApplying ? "..." : "Remove"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApply(imp, latestDetail.id)}
                                disabled={isApplying}
                                className="text-xs text-teal-400 hover:text-teal-300 transition-colors px-3 py-1 rounded border border-teal-500/30 hover:border-teal-500/60 font-semibold disabled:opacity-40"
                              >
                                {isApplying ? "..." : "Apply"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded patch preview */}
                        {isExpanded && (
                          <div className="mt-3 ml-7">
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                              Prompt patch to be injected:
                            </p>
                            <pre className="text-xs text-teal-300/70 bg-black/30 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-teal-500/10">
                              {imp.promptPatch}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Research sources */}
            {latestDetail.research.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02]">
                <button
                  onClick={() => setExpandedResearch((v) => !v)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <h2 className="text-sm font-semibold text-white/80">
                    Research Sources ({latestDetail.research.length})
                  </h2>
                  <svg
                    className={`w-4 h-4 text-white/30 transition-transform ${expandedResearch ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedResearch && (
                  <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                    {latestDetail.research.map((r, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-teal-400/60 uppercase mt-0.5 shrink-0">
                            {r.topic.replace(/_/g, " ")}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-white/70">{r.technique}</p>
                            <p className="text-[11px] text-white/30 italic">{r.source}</p>
                            <ul className="mt-1 space-y-0.5">
                              {r.keyInsights.map((insight, j) => (
                                <li key={j} className="text-[11px] text-white/40 flex gap-1.5">
                                  <span className="text-teal-500/50 shrink-0">·</span>
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Active optimizations summary */}
        {appliedApps.length > 0 && (
          <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-5">
            <h2 className="text-sm font-semibold text-teal-400 mb-3">
              Active Advisor Enhancements ({appliedApps.length})
            </h2>
            <div className="space-y-2">
              {appliedApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-white/50">{app.dimension.replace(/_/g, " ")} — </span>
                    <span className="text-xs text-white/70">{app.title}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(app.improvementId)}
                    disabled={applyingId === app.improvementId}
                    className="text-[10px] text-white/30 hover:text-rose-400 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-teal-300/40 mt-3">
              These patches are appended to your advisor&apos;s system prompt on every conversation.
            </p>
          </div>
        )}

        {/* Cycle history */}
        {cycles.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold text-white/80 mb-3">Analysis History</h2>
            <div className="space-y-2">
              {cycles.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-xs text-white/40 py-1.5 border-b border-white/5 last:border-0"
                >
                  <span>
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={
                      c.status === "COMPLETE"
                        ? "text-emerald-400"
                        : c.status === "RUNNING"
                          ? "text-teal-400 animate-pulse"
                          : "text-rose-400"
                    }
                  >
                    {c.status === "COMPLETE"
                      ? `Score: ${c.overallScore ?? "—"} · ${c.improvementCount} recommendations`
                      : c.status === "RUNNING"
                        ? "Running..."
                        : "Failed"}
                  </span>
                </div>
              ))}
            </div>
            {cycles[0]?.nextRunAt && cycles[0].status === "COMPLETE" && (
              <p className="text-[11px] text-white/25 mt-3">
                Next auto-run:{" "}
                {new Date(cycles[0].nextRunAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
