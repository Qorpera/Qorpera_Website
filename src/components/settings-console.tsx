"use client";

import { useState } from "react";
import type { AppPreferences } from "@/lib/settings-store";
import type { CloudConnectorView } from "@/lib/connectors-store";
import { CloudConnectorWizard } from "@/components/cloud-connector-wizard";
import { SkillsPanel } from "@/components/skills-panel";
import { AuditLogPanel } from "@/components/audit-log-panel";

async function savePreferences(next: Partial<AppPreferences>) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!res.ok) throw new Error("Failed to save preferences");
  return res.json();
}

export function SettingsConsole({ initial, connector }: { initial: AppPreferences; connector: CloudConnectorView[] }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [section, setSection] = useState<"connectors" | "safety" | "operations" | "notifications" | "skills" | "audit">("connectors");
  const [operationsTab, setOperationsTab] = useState<"providers" | "usage" | "checks">("providers");

  async function patch(next: Partial<AppPreferences>, key: string) {
    setSaving(key);
    setStatus(null);
    const optimistic = { ...prefs, ...next };
    setPrefs(optimistic);
    try {
      const data = (await savePreferences(next)) as { preferences: AppPreferences };
      setPrefs(data.preferences);
      setStatus("Saved");
    } catch {
      setPrefs(prefs);
      setStatus("Save failed");
    } finally {
      setSaving(null);
    }
  }

  const tabs = [
    ["connectors", "Model setup"],
    ["safety", "Safety defaults"],
    ["operations", "Operations"],
    ["notifications", "Notifications"],
    ["skills", "Skills"],
    ["audit", "Activity log"],
  ] as const;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="pb-0 border-b border-white/[0.07]">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-white/45">Set how your advisor and agents work.</p>
          </div>
          {(saving || status) ? (
            <span className={`mt-1 text-xs ${status === "Saved" ? "text-emerald-400" : status === "Save failed" ? "text-rose-400" : "text-white/35"}`}>
              {saving ? "Saving…" : status}
            </span>
          ) : null}
        </div>

        {/* Underline tab nav */}
        <nav className="flex">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id as typeof section)}
              className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition ${
                section === id
                  ? "border-teal-400 text-white font-medium"
                  : "border-transparent text-white/40 hover:text-white/65"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Section content */}
      <div className="pt-8">
        {section === "connectors" ? <CloudConnectorWizard initial={connector} /> : null}

        {section === "safety" ? (
          <div className="space-y-8">
            {/* Default autonomy */}
            <div>
              <div className="text-sm font-medium mb-0.5">Default autonomy</div>
              <p className="text-sm text-white/45 mb-4">How much your agents can act without human approval.</p>
              <div className="border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] overflow-hidden">
                {([
                  ["DRAFT_ONLY", "Draft only", "No external actions. Best for planning, drafting, and review."],
                  ["APPROVAL", "Execute with approval", "External sends/updates wait in Review before execution."],
                  ["AUTO", "Execute automatically", "Routine actions can run automatically after setup."],
                ] as const).map(([value, label, impact]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patch({ defaultAutonomy: value as AppPreferences["defaultAutonomy"] }, "defaultAutonomy")}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                      prefs.defaultAutonomy === value ? "bg-teal-500/[0.07]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                      prefs.defaultAutonomy === value ? "border-teal-400" : "border-white/20"
                    }`}>
                      {prefs.defaultAutonomy === value && <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-white/40 mt-0.5">{impact}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Token limit */}
            <div className="border-t border-white/[0.07] pt-8">
              <div className="text-sm font-medium mb-0.5">Agent output token limit</div>
              <p className="text-sm text-white/45 mb-5">Maximum tokens agents can produce per LLM call. Higher values allow more detail but cost more.</p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1024}
                  max={32768}
                  step={1024}
                  value={prefs.maxAgentOutputTokens}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPrefs((p) => ({ ...p, maxAgentOutputTokens: val }));
                  }}
                  onMouseUp={(e) => patch({ maxAgentOutputTokens: Number(e.currentTarget.value) }, "maxAgentOutputTokens")}
                  onTouchEnd={(e) => patch({ maxAgentOutputTokens: Number(e.currentTarget.value) }, "maxAgentOutputTokens")}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400"
                />
                <input
                  type="number"
                  min={1024}
                  max={32768}
                  step={1024}
                  value={prefs.maxAgentOutputTokens}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10);
                    if (!Number.isNaN(raw)) setPrefs((p) => ({ ...p, maxAgentOutputTokens: raw }));
                  }}
                  onBlur={(e) => {
                    const clamped = Math.max(1024, Math.min(32768, parseInt(e.target.value, 10) || 8192));
                    setPrefs((p) => ({ ...p, maxAgentOutputTokens: clamped }));
                    patch({ maxAgentOutputTokens: clamped }, "maxAgentOutputTokens");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const clamped = Math.max(1024, Math.min(32768, parseInt(e.currentTarget.value, 10) || 8192));
                      setPrefs((p) => ({ ...p, maxAgentOutputTokens: clamped }));
                      patch({ maxAgentOutputTokens: clamped }, "maxAgentOutputTokens");
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-24 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-center text-sm tabular-nums outline-none focus:border-teal-500/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/30">
                <span>1,024</span>
                <span>8,192 default</span>
                <span>32,768</span>
              </div>
            </div>
          </div>
        ) : null}

        {section === "operations" ? (
          <div>
            <div className="text-sm font-medium mb-0.5">Operations</div>
            <p className="text-sm text-white/45 mb-5">Provider health, usage, and system checks.</p>

            {/* Sub-tabs */}
            <nav className="flex border-b border-white/[0.07] mb-6">
              {([["providers", "Providers"], ["usage", "Usage"], ["checks", "Checks"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOperationsTab(id)}
                  className={`px-4 py-2 text-sm -mb-px border-b-2 transition ${
                    operationsTab === id
                      ? "border-teal-400 text-white font-medium"
                      : "border-transparent text-white/40 hover:text-white/65"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {operationsTab === "providers" ? (
              <div className="grid gap-3 md:grid-cols-3">
                {connector.map((c) => (
                  <div key={c.provider} className="border border-white/[0.08] rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="text-sm font-medium">
                        {c.provider === "OPENAI" ? "OpenAI" : c.provider === "ANTHROPIC" ? "Anthropic" : "Gemini"}
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-xs ${
                        c.status === "CONNECTED" ? "bg-emerald-500/15 text-emerald-300" :
                        c.status === "NEEDS_ATTENTION" ? "bg-amber-500/15 text-amber-300" :
                        "bg-white/[0.06] text-white/40"
                      }`}>
                        {c.status.toLowerCase().replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      {[
                        ["Mode", c.mode === "MANAGED" ? "Server key" : "BYOK"],
                        ["Cloud key", c.keyLast4 ? `••••${c.keyLast4}` : "Not stored"],
                        ["Last test", c.lastTestStatus ?? "Not tested"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span className="text-white/40">{label}</span>
                          <span className="text-white/70">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {operationsTab === "usage" ? (
              <div className="grid gap-3 md:grid-cols-3">
                {connector.map((c) => {
                  const reqPct = Math.min(100, Math.round((c.monthlyRequestCount / Math.max(1, c.monthlyRequestLimit)) * 100));
                  const usdPct = Math.min(100, Math.round((c.monthlyEstimatedUsd / Math.max(0.1, c.monthlyUsdLimit)) * 100));
                  return (
                    <div key={c.provider} className="border border-white/[0.08] rounded-lg p-4">
                      <div className="text-sm font-medium mb-4">
                        {c.provider === "OPENAI" ? "OpenAI" : c.provider === "ANTHROPIC" ? "Anthropic" : "Gemini"}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-white/40">Requests</span>
                            <span className="text-white/65 tabular-nums">{c.monthlyRequestCount}/{c.monthlyRequestLimit}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.07]">
                            <div className={`h-1.5 rounded-full ${reqPct >= 80 ? "bg-amber-400" : "bg-teal-400"}`} style={{ width: `${reqPct}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-white/40">Estimated spend</span>
                            <span className="text-white/65 tabular-nums">${c.monthlyEstimatedUsd.toFixed(2)}/${c.monthlyUsdLimit.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.07]">
                            <div className={`h-1.5 rounded-full ${usdPct >= 80 ? "bg-amber-400" : "bg-blue-400"}`} style={{ width: `${usdPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {operationsTab === "checks" ? (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-medium mb-0.5">Provider check cadence</div>
                  <p className="text-sm text-white/45 mb-3">How often qorpera should verify connector health.</p>
                  <div className="flex gap-2">
                    {(["hourly", "daily", "manual"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => patch({ connectorChecks: option }, "connectorChecks")}
                        className={`rounded-md border px-3 py-1.5 text-sm capitalize transition ${
                          prefs.connectorChecks === option
                            ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                            : "border-white/[0.1] text-white/50 hover:text-white/75"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {connector.map((c) => (
                    <div key={`check-${c.provider}`} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <div className="text-sm font-medium">
                          {c.provider === "OPENAI" ? "OpenAI" : c.provider === "ANTHROPIC" ? "Anthropic" : "Gemini"}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">{c.lastTestMessage ?? "No connection test has been run yet."}</div>
                      </div>
                      <span className="shrink-0 text-xs text-white/30">
                        {c.lastTestedAt ? new Date(c.lastTestedAt).toLocaleDateString() : "No test"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {section === "notifications" ? (
          <div className="space-y-1">
            <div className="text-sm font-medium mb-0.5">Email notifications</div>
            <p className="text-sm text-white/45 mb-5">Choose which agent events send you an email. Requires an email connector in Model setup.</p>
            <div className="border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] overflow-hidden">
              {([
                ["notifyApprovalNeeded", "Approval needed", "Notify when an agent needs your approval before taking action."],
                ["notifySubmissionReady", "Submission ready", "Notify when an agent finishes a draft and it's waiting for your review."],
                ["notifyTaskCompleted", "Task completed", "Notify when an agent completes a delegated task successfully."],
                ["notifyTaskFailed", "Task failed", "Notify when an agent encounters an error and can't finish a task."],
              ] as const).map(([key, label, description]) => (
                <div key={key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{description}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[key]}
                    onClick={() => patch({ [key]: !prefs[key] }, key)}
                    className={`relative shrink-0 h-5 w-9 rounded-full border transition ${
                      prefs[key]
                        ? "border-teal-500/60 bg-teal-500/20"
                        : "border-white/[0.1] bg-white/[0.04]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                      prefs[key] ? "translate-x-4 bg-teal-400" : "translate-x-0 bg-white/30"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {section === "skills" ? <SkillsPanel /> : null}

        {section === "audit" ? <AuditLogPanel /> : null}
      </div>
    </div>
  );
}
