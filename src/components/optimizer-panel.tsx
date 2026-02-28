"use client";

import { useState, useEffect, useCallback } from "react";

const AGENT_OPTIONS: { value: string; label: string }[] = [
  { value: "CHIEF_ADVISOR", label: "Chief Advisor" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "CUSTOMER_SUCCESS", label: "Customer Success" },
  { value: "MARKETING_COORDINATOR", label: "Marketing Coordinator" },
  { value: "FINANCE_ANALYST", label: "Finance Analyst" },
  { value: "OPERATIONS_MANAGER", label: "Operations Manager" },
  { value: "EXECUTIVE_ASSISTANT", label: "Executive Assistant" },
  { value: "RESEARCH_ANALYST", label: "Research Analyst" },
  { value: "SEO_SPECIALIST", label: "SEO Specialist" },
];

type FeedbackPattern = {
  id: string;
  pattern: string;
  frequency: number;
  severity: string;
  addressed: boolean;
};

type FeedbackSummary = {
  totalSubmissions: number;
  needsRevision: number;
  revisionRate: number;
  patterns: FeedbackPattern[];
};

type VariantView = {
  id: string;
  label: string;
  isControl: boolean;
  isActive: boolean;
  trafficPercent: number;
  taskCount: number;
  avgRating: number;
  acceptRate: number;
  revisionRate: number;
};

type EvaluationResult = {
  ready: boolean;
  variantBetter: boolean;
  controlAcceptRate: number;
  variantAcceptRate: number;
  sampleSize: number;
};

export function OptimizerPanel() {
  const [agentKind, setAgentKind] = useState("CHIEF_ADVISOR");
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const [variants, setVariants] = useState<VariantView[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  // Create test form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPatchText, setNewPatchText] = useState("");
  const [newTraffic, setNewTraffic] = useState(50);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/optimizer/feedback?agentKind=${agentKind}`);
      if (res.ok) setFeedback(await res.json());
    } catch { /* ignore */ }
  }, [agentKind]);

  const fetchAbTest = useCallback(async () => {
    try {
      const res = await fetch(`/api/optimizer/ab-tests/${agentKind}`);
      if (res.ok) {
        const data = (await res.json()) as { evaluation: EvaluationResult; variants: VariantView[] };
        setEvaluation(data.evaluation);
        setVariants(data.variants);
      } else {
        setEvaluation(null);
        setVariants([]);
      }
    } catch {
      setEvaluation(null);
      setVariants([]);
    }
  }, [agentKind]);

  useEffect(() => {
    fetchFeedback();
    fetchAbTest();
  }, [fetchFeedback, fetchAbTest]);

  async function analyzeFeedback() {
    setLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch("/api/optimizer/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKind }),
      });
      const data = (await res.json()) as { patternsFound?: number };
      setActionStatus(`Found ${data.patternsFound ?? 0} patterns`);
      await fetchFeedback();
    } catch {
      setActionStatus("Analysis failed");
    }
    setLoading(false);
  }

  async function createAbTest() {
    if (!newLabel.trim() || !newPatchText.trim()) return;
    setLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch("/api/optimizer/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentKind,
          label: newLabel.trim(),
          patchText: newPatchText.trim(),
          trafficPercent: newTraffic,
        }),
      });
      if (res.ok) {
        setActionStatus("A/B test created");
        setShowCreateForm(false);
        setNewLabel("");
        setNewPatchText("");
        setNewTraffic(50);
        await fetchAbTest();
      } else {
        setActionStatus("Failed to create test");
      }
    } catch {
      setActionStatus("Failed to create test");
    }
    setLoading(false);
  }

  async function promoteVariant(variantId: string) {
    setLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch(`/api/optimizer/ab-tests/${agentKind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote", variantId }),
      });
      if (res.ok) {
        setActionStatus("Variant promoted to baseline");
        await fetchAbTest();
      }
    } catch {
      setActionStatus("Promote failed");
    }
    setLoading(false);
  }

  async function rollback() {
    setLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch(`/api/optimizer/ab-tests/${agentKind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback" }),
      });
      if (res.ok) {
        setActionStatus("Rolled back to control");
        await fetchAbTest();
      }
    } catch {
      setActionStatus("Rollback failed");
    }
    setLoading(false);
  }

  const agentLabel = AGENT_OPTIONS.find((a) => a.value === agentKind)?.label ?? agentKind;

  return (
    <div className="space-y-6">
      {/* Agent selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Agent</label>
        <select
          value={agentKind}
          onChange={(e) => setAgentKind(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
        >
          {AGENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {actionStatus && (
          <span className="text-xs wf-muted">{actionStatus}</span>
        )}
      </div>

      {/* Feedback patterns */}
      <section className="wf-panel rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Feedback patterns</h2>
          <button
            type="button"
            onClick={analyzeFeedback}
            disabled={loading}
            className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze recent feedback"}
          </button>
        </div>

        {feedback && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="wf-muted">Submissions:</span>{" "}
                <span className="font-medium">{feedback.totalSubmissions}</span>
              </div>
              <div>
                <span className="wf-muted">Needs revision:</span>{" "}
                <span className="font-medium">{feedback.needsRevision}</span>
              </div>
              <div>
                <span className="wf-muted">Revision rate:</span>{" "}
                <span className="font-medium">{(feedback.revisionRate * 100).toFixed(1)}%</span>
              </div>
            </div>

            {feedback.patterns.length > 0 ? (
              <div className="space-y-2">
                {feedback.patterns.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      p.addressed
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : p.severity === "CRITICAL"
                          ? "border-rose-500/30 bg-rose-500/10"
                          : p.severity === "HIGH"
                            ? "border-amber-500/30 bg-amber-500/10"
                            : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        p.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300"
                          : p.severity === "HIGH" ? "bg-amber-500/20 text-amber-300"
                          : p.severity === "MEDIUM" ? "bg-blue-500/20 text-blue-300"
                          : "bg-[rgba(255,255,255,0.1)] wf-muted"
                      }`}>
                        {p.severity}
                      </span>
                      <span className="wf-muted text-xs">seen {p.frequency}x</span>
                      {p.addressed && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                          addressed
                        </span>
                      )}
                    </div>
                    <div className="mt-1">{p.pattern}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm wf-muted">
                No patterns detected yet. Run analysis after the agent has processed some tasks with feedback.
              </p>
            )}
          </div>
        )}
      </section>

      {/* A/B test */}
      <section className="wf-panel rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">A/B test</h2>
          <div className="flex gap-2">
            {variants.length >= 2 && (
              <button
                type="button"
                onClick={rollback}
                disabled={loading}
                className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
              >
                Rollback
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20"
            >
              {showCreateForm ? "Cancel" : "New test"}
            </button>
          </div>
        </div>

        {/* Evaluation summary */}
        {evaluation && evaluation.sampleSize > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <div className={`h-2.5 w-2.5 rounded-full ${
                !evaluation.ready ? "bg-yellow-400" : evaluation.variantBetter ? "bg-emerald-400" : "bg-rose-400"
              }`} />
              <span>
                {!evaluation.ready
                  ? `Collecting data (${evaluation.sampleSize} tasks so far, need 20+)`
                  : evaluation.variantBetter
                    ? "Variant is outperforming control"
                    : "Control is performing better"}
              </span>
            </div>
            <div className="mt-2 flex gap-6 text-xs wf-muted">
              <span>Control accept: {(evaluation.controlAcceptRate * 100).toFixed(1)}%</span>
              <span>Variant accept: {(evaluation.variantAcceptRate * 100).toFixed(1)}%</span>
              <span>Sample: {evaluation.sampleSize} tasks</span>
            </div>
          </div>
        )}

        {/* Variant list */}
        {variants.length > 0 ? (
          <div className="mt-4 space-y-2">
            {variants.map((v) => (
              <div
                key={v.id}
                className={`rounded-2xl border px-4 py-3 ${
                  v.isControl
                    ? "border-blue-500/20 bg-blue-500/5"
                    : "border-violet-500/20 bg-violet-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      v.isControl ? "bg-blue-500/20 text-blue-300" : "bg-violet-500/20 text-violet-300"
                    }`}>
                      {v.isControl ? "control" : "variant"}
                    </span>
                    <span className="text-sm font-medium">{v.label}</span>
                    <span className="text-xs wf-muted">{v.trafficPercent}% traffic</span>
                  </div>
                  {!v.isControl && evaluation?.ready && evaluation.variantBetter && (
                    <button
                      type="button"
                      onClick={() => promoteVariant(v.id)}
                      disabled={loading}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      Promote
                    </button>
                  )}
                </div>
                <div className="mt-2 flex gap-5 text-xs wf-muted">
                  <span>Tasks: {v.taskCount}</span>
                  <span>Avg rating: {v.avgRating.toFixed(2)}</span>
                  <span>Accept: {(v.acceptRate * 100).toFixed(1)}%</span>
                  <span>Revision: {(v.revisionRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm wf-muted">
            No active A/B test for {agentLabel}. Create one to experiment with prompt improvements.
          </p>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4">
            <div className="text-sm font-medium">New A/B test for {agentLabel}</div>
            <label className="block text-sm">
              Label
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. More structured output format"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              Prompt patch (appended to system prompt for variant group)
              <textarea
                value={newPatchText}
                onChange={(e) => setNewPatchText(e.target.value)}
                placeholder="e.g. Always use bullet points for key findings. Include a TL;DR section at the top of every report."
                rows={4}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              Variant traffic %
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={10}
                  value={newTraffic}
                  onChange={(e) => setNewTraffic(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm font-medium">{newTraffic}%</span>
              </div>
              <div className="mt-1 text-xs wf-muted">
                Control gets {100 - newTraffic}%, variant gets {newTraffic}%
              </div>
            </label>
            <button
              type="button"
              onClick={createAbTest}
              disabled={loading || !newLabel.trim() || !newPatchText.trim()}
              className="rounded-full border border-teal-500/30 bg-teal-500/10 px-5 py-2 text-sm text-teal-300 hover:bg-teal-500/20 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create A/B test"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
