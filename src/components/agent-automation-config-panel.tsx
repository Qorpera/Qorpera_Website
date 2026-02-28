"use client";

import { useState, useCallback, useEffect } from "react";
import type { AgentAutomationConfigView, AgentTarget } from "@/lib/orchestration-store";

const FALLBACK_INTEGRATION_OPTIONS = [
  "browser",
  "files",
  "docs",
  "sheets",
  "excel",
  "word",
  "email",
  "crm",
  "meta",
  "http",
  "calendar",
];

const LOOP_PRESETS = [
  {
    id: "safe",
    label: "Safe",
    values: {
      maxLoopIterations: 2,
      maxAgentCallsPerRun: 4,
      maxToolRetries: 1,
      maxRuntimeSeconds: 60,
      requireApprovalForExternalActions: true,
    },
  },
  {
    id: "balanced",
    label: "Balanced",
    values: {
      maxLoopIterations: 3,
      maxAgentCallsPerRun: 6,
      maxToolRetries: 2,
      maxRuntimeSeconds: 120,
      requireApprovalForExternalActions: true,
    },
  },
  {
    id: "aggressive",
    label: "Aggressive",
    values: {
      maxLoopIterations: 5,
      maxAgentCallsPerRun: 10,
      maxToolRetries: 3,
      maxRuntimeSeconds: 300,
      requireApprovalForExternalActions: true,
    },
  },
] as const;

export function AgentAutomationConfigPanel({
  target,
  initial,
  integrationOptions,
}: {
  target: AgentTarget;
  initial: AgentAutomationConfigView;
  integrationOptions?: string[];
}) {
  const resolvedIntegrations = integrationOptions?.length ? integrationOptions : FALLBACK_INTEGRATION_OPTIONS;
  const [config, setConfig] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save(next: AgentAutomationConfigView) {
    setSaving(true);
    setStatus(null);
    setConfig(next);
    try {
      const res = await fetch("/api/agents/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentTarget: target,
          triggerMode: next.triggerMode,
          wakeOnDelegation: next.wakeOnDelegation,
          scheduleEnabled: next.scheduleEnabled,
          dailyTimes: next.dailyTimes,
          timezone: next.timezone,
          runContinuously: next.runContinuously,
          heartbeatEnabled: next.heartbeatEnabled,
          heartbeatIntervalMin: next.heartbeatIntervalMin,
          maxLoopIterations: next.maxLoopIterations,
          maxAgentCallsPerRun: next.maxAgentCallsPerRun,
          maxToolRetries: next.maxToolRetries,
          maxRuntimeSeconds: next.maxRuntimeSeconds,
          requireApprovalForExternalActions: next.requireApprovalForExternalActions,
          allowAgentDelegation: next.allowAgentDelegation,
          alwaysOn: next.alwaysOn,
          integrations: next.integrations,
          notes: next.notes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; config?: AgentAutomationConfigView };
      if (!res.ok || !data.config) throw new Error(data.error || "Failed to save config");
      setConfig(data.config);
      setStatus("Saved");
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function patch(p: Partial<AgentAutomationConfigView>) {
    const next = { ...config, ...p };
    void save(next);
  }

  return (
    <section className="wf-panel rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Automation / wake mode</h2>
        <span className="text-xs wf-muted">{saving ? "Saving..." : status ?? ""}</span>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => patch({ alwaysOn: !config.alwaysOn })}
          className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
            config.alwaysOn
              ? "border-emerald-500/50 bg-emerald-500/15"
              : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Always On</div>
              <div className="mt-1 text-xs wf-muted">
                {config.alwaysOn
                  ? "Agent continuously checks for new work every scheduler tick. No separate daemon required."
                  : "Enable to keep this agent running 24/7. It will wake every scheduler tick to check for pending tasks, events, and inbox items."}
              </div>
            </div>
            <div
              className={`flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                config.alwaysOn ? "bg-emerald-500" : "bg-[rgba(255,255,255,0.1)]"
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  config.alwaysOn ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(["MANUAL", "DELEGATED", "SCHEDULED", "HYBRID"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => patch({ triggerMode: mode })}
            className={`rounded-2xl border px-4 py-3 text-left text-sm ${
              config.triggerMode === mode ? "border-teal-500/40 bg-teal-500/10" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
            }`}
          >
            <div className="font-medium">{mode.toLowerCase()}</div>
            <div className="mt-1 wf-muted">
              {mode === "MANUAL" && "Runs only when you or another action starts it manually."}
              {mode === "DELEGATED" && "Sleeps until another agent (e.g. Chief Advisor) delegates work."}
              {mode === "SCHEDULED" && "Wakes at set times to check work and continue queues."}
              {mode === "HYBRID" && "Supports delegated wakeups and scheduled check-ins."}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["wakeOnDelegation", "Wake when delegated", config.wakeOnDelegation],
          ["scheduleEnabled", "Enable daily schedule", config.scheduleEnabled],
          ["runContinuously", "Run continuously", config.runContinuously],
          ["heartbeatEnabled", "Heartbeat mode", config.heartbeatEnabled],
          ["requireApprovalForExternalActions", "Require approval for external actions", config.requireApprovalForExternalActions],
          ["allowAgentDelegation", "Allow agent-to-agent delegation", config.allowAgentDelegation],
        ].map(([key, label, value]) => (
          <button
            key={String(key)}
            type="button"
            onClick={() => patch({ [key as string]: !value } as Partial<AgentAutomationConfigView>)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm ${value ? "border-blue-400/40 bg-blue-500/10" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"}`}
          >
            <div className="font-medium">{String(label)}</div>
            <div className="mt-1 wf-muted">{value ? "On" : "Off"}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium">Loop + agent-call limits</div>
        <p className="mt-1 text-xs wf-muted">
          Bound repeated agent calls with explicit budgets. These settings control retries, call fanout, and runtime.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOOP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patch({ ...preset.values })}
              className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.05)]"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm">
            Max loop iterations
            <input
              type="number"
              min={1}
              max={20}
              value={config.maxLoopIterations}
              onChange={(e) => setConfig((c) => ({ ...c, maxLoopIterations: Number(e.target.value) || 1 }))}
              onBlur={() => void save(config)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Max agent calls / run
            <input
              type="number"
              min={1}
              max={30}
              value={config.maxAgentCallsPerRun}
              onChange={(e) => setConfig((c) => ({ ...c, maxAgentCallsPerRun: Number(e.target.value) || 1 }))}
              onBlur={() => void save(config)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Max tool retries
            <input
              type="number"
              min={0}
              max={5}
              value={config.maxToolRetries}
              onChange={(e) => setConfig((c) => ({ ...c, maxToolRetries: Math.max(0, Number(e.target.value) || 0) }))}
              onBlur={() => void save(config)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Max runtime (sec)
            <input
              type="number"
              min={15}
              max={14400}
              step={15}
              value={config.maxRuntimeSeconds}
              onChange={(e) => setConfig((c) => ({ ...c, maxRuntimeSeconds: Number(e.target.value) || 15 }))}
              onBlur={() => void save(config)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px]">
        <label className="text-sm">
          Daily wake times (comma-separated `HH:MM`, UTC for now)
          <input
            value={config.dailyTimes.join(", ")}
            onChange={(e) => setConfig((c) => ({ ...c, dailyTimes: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) }))}
            onBlur={() => void save(config)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Timezone
          <input
            value={config.timezone}
            onChange={(e) => setConfig((c) => ({ ...c, timezone: e.target.value }))}
            onBlur={() => void save(config)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-4">
        <div className="text-sm font-medium">Application integrations (allowed tools)</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {resolvedIntegrations.map((name) => {
            const active = config.integrations.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() =>
                  patch({
                    integrations: active
                      ? config.integrations.filter((v) => v !== name)
                      : [...config.integrations, name],
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs ${active ? "border-violet-400/40 bg-violet-500/10 text-violet-100" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"}`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {config.heartbeatEnabled && (
        <div className="mt-4">
          <label className="text-sm">
            Heartbeat interval (minutes)
            <input
              type="number"
              min={5}
              max={60}
              step={5}
              value={config.heartbeatIntervalMin}
              onChange={(e) => setConfig((c) => ({ ...c, heartbeatIntervalMin: Number(e.target.value) || 15 }))}
              onBlur={() => void save(config)}
              className="mt-2 w-full max-w-xs rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            />
          </label>
          <p className="mt-1 text-xs wf-muted">
            Agent wakes every {config.heartbeatIntervalMin} min. A cost-aware pre-check skips the LLM call if there&apos;s no pending work.
          </p>
        </div>
      )}

      <label className="mt-4 block text-sm">
        Orchestration notes
        <textarea
          value={config.notes}
          onChange={(e) => setConfig((c) => ({ ...c, notes: e.target.value }))}
          onBlur={() => void save(config)}
          className="mt-2 h-24 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3"
          placeholder="What should this agent monitor? How should it behave when woken by other agents?"
        />
      </label>

      <WebhookSection target={target} />
    </section>
  );
}

function WebhookSection({ target }: { target: AgentTarget }) {
  const [webhook, setWebhook] = useState<{
    secretLast4?: string;
    lastCalledAt?: string | null;
    callCount?: number;
    webhookUrl?: string;
  } | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchWebhook = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks/manage");
      const data = (await res.json()) as { endpoints?: Array<{ agentTarget: string; secretLast4: string; lastCalledAt: string | null; callCount: number }> };
      const match = data.endpoints?.find((e) => e.agentTarget === target);
      if (match) {
        setWebhook({ ...match, webhookUrl: `/api/webhooks/ingest/${match.agentTarget}` });
      }
    } catch { /* ignore */ }
  }, [target]);

  useEffect(() => {
    fetchWebhook();
  }, [fetchWebhook]);

  async function generateWebhook() {
    setLoading(true);
    setNewSecret(null);
    try {
      const res = await fetch("/api/webhooks/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentTarget: target }),
      });
      const data = (await res.json()) as { secret?: string; webhookUrl?: string; endpoint?: { secretLast4: string; callCount: number; lastCalledAt: string | null } };
      if (data.secret) {
        setNewSecret(data.secret);
        setWebhook({
          secretLast4: data.endpoint?.secretLast4,
          lastCalledAt: data.endpoint?.lastCalledAt ?? null,
          callCount: data.endpoint?.callCount ?? 0,
          webhookUrl: data.webhookUrl,
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function deleteWebhook() {
    setLoading(true);
    try {
      await fetch("/api/webhooks/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentTarget: target }),
      });
      setWebhook(null);
      setNewSecret(null);
    } catch { /* ignore */ }
    setLoading(false);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <div className="text-sm font-medium">Webhook trigger</div>
      <p className="mt-1 text-xs wf-muted">
        External systems can wake this agent via authenticated HTTP POST.
      </p>

      {webhook ? (
        <div className="mt-3 space-y-2">
          {webhook.webhookUrl && (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs break-all">
                {webhook.webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(webhook.webhookUrl!, "url")}
                className="shrink-0 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.05)]"
              >
                {copied === "url" ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          {newSecret && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <div className="font-medium text-amber-300 mb-1">Secret (shown once)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all">{newSecret}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newSecret, "secret")}
                  className="shrink-0 rounded-lg border border-amber-500/30 px-2 py-1 hover:bg-amber-500/20"
                >
                  {copied === "secret" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs wf-muted">
            <span>Key: ...{webhook.secretLast4}</span>
            {webhook.callCount !== undefined && <span>Calls: {webhook.callCount}</span>}
            {webhook.lastCalledAt && <span>Last: {new Date(webhook.lastCalledAt).toLocaleString()}</span>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateWebhook}
              disabled={loading}
              className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.05)]"
            >
              {loading ? "..." : "Regenerate"}
            </button>
            <button
              type="button"
              onClick={deleteWebhook}
              disabled={loading}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={generateWebhook}
          disabled={loading}
          className="mt-3 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs text-teal-300 hover:bg-teal-500/20"
        >
          {loading ? "Generating..." : "Generate webhook"}
        </button>
      )}
    </div>
  );
}
