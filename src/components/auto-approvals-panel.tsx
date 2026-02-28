"use client";

import { useState, useEffect, useTransition } from "react";
import type { AutoApprovalRuleView } from "@/lib/auto-approval-store";

// Common tool names for the dropdown
const TOOL_SUGGESTIONS = [
  { value: "*", label: "* — All approval-required tools" },
  { value: "slack_post_message", label: "slack_post_message" },
  { value: "slack_send_dm", label: "slack_send_dm" },
  { value: "hubspot_create_contact", label: "hubspot_create_contact" },
  { value: "hubspot_update_deal", label: "hubspot_update_deal" },
  { value: "google_send_email", label: "google_send_email" },
  { value: "google_create_calendar_event", label: "google_create_calendar_event" },
  { value: "linear_create_issue", label: "linear_create_issue" },
  { value: "linear_update_issue", label: "linear_update_issue" },
  { value: "github_create_issue", label: "github_create_issue" },
  { value: "github_create_pr", label: "github_create_pr" },
  { value: "notion_create_page", label: "notion_create_page" },
];

type FormState = {
  name: string;
  toolName: string;
  conditionJson: string;
};

function defaultForm(): FormState {
  return { name: "", toolName: "*", conditionJson: "" };
}

export function AutoApprovalsPanel() {
  const [rules, setRules] = useState<AutoApprovalRuleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    fetch("/api/auto-approvals")
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setConditionError(null);
    setModalOpen(true);
  }

  function openEdit(r: AutoApprovalRuleView) {
    setEditingId(r.id);
    setForm({ name: r.name, toolName: r.toolName, conditionJson: r.conditionJson ?? "" });
    setConditionError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function validateCondition(val: string): boolean {
    if (!val.trim()) return true;
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setConditionError("Must be a JSON object, e.g. {\"channel\": \"#general\"}");
        return false;
      }
      setConditionError(null);
      return true;
    } catch {
      setConditionError("Invalid JSON");
      return false;
    }
  }

  function handleSave() {
    if (!validateCondition(form.conditionJson)) return;
    startSave(async () => {
      const payload = {
        name: form.name,
        toolName: form.toolName,
        conditionJson: form.conditionJson.trim() || null,
      };
      const url = editingId ? `/api/auto-approvals/${editingId}` : "/api/auto-approvals";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (editingId) {
        setRules((prev) => prev.map((r) => (r.id === editingId ? data.rule : r)));
      } else {
        setRules((prev) => [data.rule, ...prev]);
      }
      closeModal();
    });
  }

  function handleToggle(r: AutoApprovalRuleView) {
    const optimistic = rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x));
    setRules(optimistic);
    fetch(`/api/auto-approvals/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    }).then((res) => {
      if (res.ok) return res.json().then((d) => setRules((prev) => prev.map((x) => (x.id === r.id ? d.rule : x))));
      setRules(rules);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this auto-approval rule?")) return;
    fetch(`/api/auto-approvals/${id}`, { method: "DELETE" }).then((r) => {
      if (r.ok) setRules((prev) => prev.filter((x) => x.id !== id));
    });
  }

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium mb-0.5">Auto-approval rules</div>
          <p className="text-sm text-white/45">
            Skip the approval inbox for specific tool calls that match your rules. Use <code className="text-xs bg-white/10 px-1 rounded">*</code> to match all tools, or add JSON conditions to match by argument values.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          + Add rule
        </button>
      </div>

      {loading && <p className="text-sm text-white/30">Loading…</p>}

      {!loading && rules.length === 0 && (
        <div className="text-center py-10 rounded-xl border border-dashed border-white/10">
          <p className="text-sm text-white/30 mb-1">No auto-approval rules yet.</p>
          <p className="text-xs text-white/20">Rules let specific tool actions bypass human review.</p>
        </div>
      )}

      {rules.length > 0 && (
        <div className="border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] overflow-hidden">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-mono bg-white/5 px-1.5 rounded text-teal-300/70">{r.toolName}</span>
                  {r.conditionJson && (
                    <span className="font-mono text-white/30 truncate max-w-xs">{r.conditionJson}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(r)}
                  title={r.enabled ? "Disable" : "Enable"}
                  className={`relative w-9 h-5 rounded-full transition-colors ${r.enabled ? "bg-teal-600" : "bg-zinc-700"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.enabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="px-2 py-1 text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-2 py-1 text-xs text-white/30 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-[rgba(12,18,24,0.98)] border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">{editingId ? "Edit rule" : "New auto-approval rule"}</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Rule name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Auto-approve Slack posts to #general"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tool name</label>
                <div className="relative">
                  <input
                    list="tool-suggestions"
                    type="text"
                    value={form.toolName}
                    onChange={(e) => set("toolName", e.target.value)}
                    placeholder="slack_post_message or *"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600"
                  />
                  <datalist id="tool-suggestions">
                    {TOOL_SUGGESTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Use <code className="bg-zinc-800 px-1 rounded">*</code> to match all approval-required tools.</p>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Conditions <span className="text-zinc-600">(optional JSON)</span></label>
                <textarea
                  value={form.conditionJson}
                  onChange={(e) => {
                    set("conditionJson", e.target.value);
                    if (e.target.value) validateCondition(e.target.value);
                    else setConditionError(null);
                  }}
                  placeholder={'{"channel": "#general"}'}
                  rows={3}
                  className={`w-full bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none resize-none ${conditionError ? "border-red-600" : "border-zinc-700 focus:border-teal-600"}`}
                />
                {conditionError && <p className="text-xs text-red-400 mt-1">{conditionError}</p>}
                {!conditionError && (
                  <p className="text-xs text-zinc-600 mt-1">All key-value pairs must match tool arguments. Leave blank to match any call.</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.toolName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
