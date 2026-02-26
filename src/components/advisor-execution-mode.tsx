"use client";

import { useState } from "react";
import type { AppPreferences } from "@/lib/settings-store";

type Mode = AppPreferences["defaultAutonomy"];

export function AdvisorExecutionMode({ initial, compact = false }: { initial: AppPreferences; compact?: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: Partial<AppPreferences>) {
    setBusy(true);
    setError(null);
    const optimistic = { ...prefs, ...next };
    setPrefs(optimistic);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await res.json().catch(() => ({}))) as { preferences?: AppPreferences; error?: string };
      if (!res.ok || !data.preferences) throw new Error(data.error || "Failed to save mode");
      setPrefs(data.preferences);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save mode");
      setPrefs(prefs);
    } finally {
      setBusy(false);
    }
  }

  function modeCard(mode: Mode, label: string, detail: string, tone?: "danger") {
    const active = prefs.defaultAutonomy === mode;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void save({ defaultAutonomy: mode })}
        className={`w-full rounded-xl border p-3 text-left transition ${
          tone === "danger"
            ? active
              ? "border-rose-400/50 bg-rose-500/15"
              : "border-rose-400/20 bg-rose-500/5 hover:bg-rose-500/10"
            : active
              ? "border-teal-400/40 bg-teal-500/15"
              : "border-[var(--border)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium">{label}</div>
          {active ? <span className="rounded-full border border-teal-300/30 bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-200">Active</span> : null}
        </div>
        <div className="mt-1 text-xs wf-muted">{detail}</div>
      </button>
    );
  }

  return (
    compact ? (
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] wf-muted">Execution mode</div>
        <select
          value={prefs.defaultAutonomy}
          disabled={busy}
          onChange={(e) => void save({ defaultAutonomy: e.target.value as Mode })}
          className="w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
        >
          <option value="APPROVAL">Execute with approval</option>
          <option value="AUTO">Execute automatically</option>
          <option value="DRAFT_ONLY">Draft only</option>
        </select>
        {busy ? <div className="text-xs wf-muted">Saving...</div> : null}
        {error ? <div className="text-xs text-rose-300">{error}</div> : null}
      </div>
    ) : (
    <details className="wf-soft rounded-2xl p-4 text-sm lg:min-w-[340px]">
      <summary className="cursor-pointer list-none">
        <div className="wf-muted">Recommended mode</div>
        <div className="mt-1 font-semibold">
          {prefs.defaultAutonomy === "APPROVAL"
            ? "Execute with approval"
            : prefs.defaultAutonomy === "DRAFT_ONLY"
              ? "Draft only"
              : "Execute automatically"}
        </div>
        <p className="mt-1 max-w-xs text-xs wf-muted">Tap and choose the execution mode you want right now.</p>
      </summary>
      <div className="mt-3 grid gap-2">
        {modeCard("APPROVAL", "Execute with approval", "Recommended default. Keeps external actions gated behind approval.")}
        {modeCard("AUTO", "Auto mode", "Agents can execute routine work automatically after safe setup.")}
        {modeCard("DRAFT_ONLY", "Draft only", "No external actions. Great for planning, drafting, and review.")}
        <button
          type="button"
          disabled={busy}
          onClick={() => void save({ defaultAutonomy: "AUTO", requirePreview: false, enableRollback: false })}
          className="w-full rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-left transition hover:bg-rose-500/10"
        >
          <div className="font-medium">Full access agents</div>
          <div className="mt-1 text-xs wf-muted">High autonomy preset: auto mode + preview/rollback safety defaults off.</div>
        </button>
      </div>
      {busy ? <div className="mt-2 text-xs wf-muted">Saving mode...</div> : null}
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
    </details>
    )
  );
}
