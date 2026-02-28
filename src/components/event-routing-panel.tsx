"use client";

import { useState, useCallback } from "react";

type RoutingRule = {
  id: string;
  provider: string;
  eventPattern: string;
  agentTarget: string;
  priority: number;
  enabled: boolean;
  conditionJson: string | null;
  transformJson: string | null;
};

const PROVIDERS = ["*", "hubspot", "slack", "github", "linear", "calendly", "whatsapp", "twilio"];
const AGENTS = ["CHIEF_ADVISOR", "ASSISTANT", "SALES_REP", "CUSTOMER_SUCCESS", "MARKETING_COORDINATOR", "FINANCE_ANALYST", "OPERATIONS_MANAGER", "EXECUTIVE_ASSISTANT", "RESEARCH_ANALYST", "SEO_SPECIALIST"];

export function EventRoutingPanel({ initialRules }: { initialRules: RoutingRule[] }) {
  const [rules, setRules] = useState<RoutingRule[]>(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: "*", eventPattern: "*", agentTarget: "CHIEF_ADVISOR", priority: 50 });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/events/routing");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules);
    }
  }, []);

  const createRule = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/events/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ provider: "*", eventPattern: "*", agentTarget: "CHIEF_ADVISOR", priority: 50 });
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: RoutingRule) => {
    await fetch("/api/events/routing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    await refresh();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/events/routing?id=${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Event Routing Rules</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-500"
        >
          {showForm ? "Cancel" : "Add Rule"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400">Provider</span>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
              >
                {PROVIDERS.map((p) => <option key={p} value={p}>{p === "*" ? "All providers" : p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Event Pattern</span>
              <input
                value={form.eventPattern}
                onChange={(e) => setForm({ ...form, eventPattern: e.target.value })}
                placeholder="e.g. contact.*, push, *"
                className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Route to Agent</span>
              <select
                value={form.agentTarget}
                onChange={(e) => setForm({ ...form, agentTarget: e.target.value })}
                className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
              >
                {AGENTS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Priority (lower = higher)</span>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                className="mt-1 block w-full rounded bg-black/30 border border-white/10 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          <button
            onClick={createRule}
            disabled={saving}
            className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Rule"}
          </button>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="text-sm text-gray-500">No routing rules configured. Events will be processed by the default scheduler.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                rule.enabled ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-900/50 px-1.5 py-0.5 text-xs text-teal-300">{rule.provider}</span>
                  <span className="text-sm text-white font-mono">{rule.eventPattern}</span>
                  <span className="text-xs text-gray-500">→</span>
                  <span className="text-sm text-gray-300">{rule.agentTarget.replace(/_/g, " ")}</span>
                  <span className="text-xs text-gray-600">p{rule.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRule(rule)}
                  className={`rounded px-2 py-1 text-xs ${
                    rule.enabled ? "bg-emerald-900/40 text-emerald-400" : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {rule.enabled ? "On" : "Off"}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
