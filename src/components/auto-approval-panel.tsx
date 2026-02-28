"use client";

import { useState, useEffect, useCallback } from "react";

type Rule = {
  id: string;
  name: string;
  toolName: string;
  conditionJson: string | null;
  enabled: boolean;
  createdAt: string;
};

const APPROVAL_TOOLS = [
  { value: "*", label: "All approval-required actions" },
  { value: "send_email", label: "Send email (send_email)" },
  { value: "google_send_email", label: "Send Gmail (google_send_email)" },
  { value: "google_create_calendar_event", label: "Create calendar event" },
  { value: "google_create_doc", label: "Create Google Doc" },
  { value: "google_append_doc", label: "Append to Google Doc" },
  { value: "google_create_sheet", label: "Create Google Sheet" },
  { value: "google_append_sheet_rows", label: "Append to Google Sheet" },
  { value: "slack_post_message", label: "Post Slack message" },
  { value: "linear_create_issue", label: "Create Linear issue" },
  { value: "github_create_issue", label: "Create GitHub issue" },
  { value: "notion_create_page", label: "Create Notion page" },
  { value: "notion_append_block", label: "Append to Notion page" },
  { value: "call_webhook", label: "Call webhook" },
];

export function AutoApprovalPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTool, setNewTool] = useState("slack_post_message");
  const [newCondition, setNewCondition] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/auto-approval");
      if (res.ok) {
        const data = (await res.json()) as { rules: Rule[] };
        setRules(data.rules);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRules(); }, [fetchRules]);

  async function handleAdd() {
    if (!newTool) return;
    setSaving(true);
    try {
      let conditionJson: string | null = null;
      if (newCondition.trim()) {
        try {
          JSON.parse(newCondition);
          conditionJson = newCondition.trim();
        } catch {
          alert("Condition must be valid JSON, e.g. {\"channel\": \"#general\"}");
          setSaving(false);
          return;
        }
      }
      const res = await fetch("/api/settings/auto-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || newTool,
          toolName: newTool,
          conditionJson,
        }),
      });
      if (res.ok) {
        await fetchRules();
        setShowAdd(false);
        setNewName(""); setNewTool("slack_post_message"); setNewCondition("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: Rule) {
    await fetch("/api/settings/auto-approval", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    await fetchRules();
  }

  async function handleDelete(ruleId: string) {
    await fetch(`/api/settings/auto-approval?id=${ruleId}`, { method: "DELETE" });
    await fetchRules();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white/90 mb-1">Auto-Approval Rules</h2>
        <p className="text-sm text-white/40">
          Define rules that automatically approve certain agent actions without manual review.
          Be careful — auto-approved actions execute immediately.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-white/30">Loading rules…</p>
      ) : (
        <div className="space-y-3">
          {rules.length === 0 && !showAdd && (
            <p className="text-sm text-white/30">No auto-approval rules configured.</p>
          )}

          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.enabled ? "bg-emerald-400" : "bg-white/20"}`} />
                  <p className="text-sm font-medium text-white/80 truncate">{rule.name}</p>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Tool: <code className="text-teal-400/80">{rule.toolName}</code>
                  {rule.conditionJson && (
                    <> · Condition: <code className="text-amber-400/80">{rule.conditionJson.slice(0, 60)}</code></>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(rule)}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {showAdd && (
            <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
              <p className="text-sm font-medium text-white/70">New rule</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Rule name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-teal-500/40"
                />
                <select
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-teal-500/40"
                >
                  {APPROVAL_TOOLS.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#0c1117]">{t.label}</option>
                  ))}
                </select>
                <div>
                  <input
                    type="text"
                    placeholder='Optional condition JSON, e.g. {"channel": "#general"}'
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-teal-500/40 font-mono"
                  />
                  <p className="text-xs text-white/30 mt-1">
                    Leave blank to auto-approve all actions for this tool.
                    With a condition, all key-value pairs must match the action arguments (strings are substring-matched).
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add rule"}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm text-teal-400/70 hover:text-teal-400 transition-colors"
            >
              + Add rule
            </button>
          )}
        </div>
      )}
    </div>
  );
}
