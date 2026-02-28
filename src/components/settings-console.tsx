"use client";

import { useState } from "react";
import type { AppPreferences } from "@/lib/settings-store";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { AutoApprovalsPanel } from "@/components/auto-approvals-panel";
import { DbConnectionsPanel } from "@/components/db-connections-panel";
import { LicenseKeysPanel } from "@/components/license-keys-panel";
import { AgentFeedbackPanel } from "@/components/agent-feedback-panel";

async function savePreferences(next: Partial<AppPreferences>) {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  });
  if (!res.ok) throw new Error("Failed to save preferences");
  return res.json();
}

export function SettingsConsole({ initial }: { initial: AppPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [section, setSection] = useState<"auto-approvals" | "databases" | "notifications" | "licenses" | "feedback" | "audit">("auto-approvals");

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
    ["auto-approvals", "Auto-approvals"],
    ["databases", "Databases"],
    ["notifications", "Notifications"],
    ["licenses", "Licenses"],
    ["feedback", "Feedback"],
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

        {section === "auto-approvals" ? <AutoApprovalsPanel /> : null}

        {section === "databases" ? <DbConnectionsPanel /> : null}

        {section === "licenses" ? <LicenseKeysPanel /> : null}

        {section === "feedback" ? <AgentFeedbackPanel /> : null}

        {section === "audit" ? <AuditLogPanel /> : null}
      </div>
    </div>
  );
}
