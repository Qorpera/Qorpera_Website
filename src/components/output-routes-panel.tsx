"use client";

import { useState, useEffect, useCallback } from "react";

type OutputRoute = {
  id: string;
  name: string;
  agentTarget: string;
  routeType: string;
  routeTarget: string;
  onCompleted: boolean;
  onFailed: boolean;
  enabled: boolean;
  createdAt: string;
};

const AGENT_TARGETS = [
  { value: "*", label: "All agents" },
  { value: "CHIEF_ADVISOR", label: "Chief Advisor" },
  { value: "ASSISTANT", label: "Mara (Assistant)" },
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "CUSTOMER_SUCCESS", label: "Customer Success" },
  { value: "MARKETING_COORDINATOR", label: "Marketing Coordinator" },
  { value: "FINANCE_ANALYST", label: "Finance Analyst" },
  { value: "OPERATIONS_MANAGER", label: "Operations Manager" },
  { value: "EXECUTIVE_ASSISTANT", label: "Executive Assistant" },
  { value: "RESEARCH_ANALYST", label: "Research Analyst" },
  { value: "SEO_SPECIALIST", label: "SEO Specialist" },
];

const ROUTE_TYPES = [
  { value: "slack", label: "Slack" },
  { value: "email", label: "Email" },
  { value: "webhook", label: "Webhook" },
];

const EMPTY_FORM = {
  name: "",
  agentTarget: "*",
  routeType: "slack",
  routeTarget: "",
  onCompleted: true,
  onFailed: false,
};

export function OutputRoutesPanel() {
  const [routes, setRoutes] = useState<OutputRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/output-routes");
      const data = await res.json() as { routes: OutputRoute[] };
      setRoutes(data.routes ?? []);
    } catch {
      setError("Failed to load output routes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.routeTarget.trim()) { setError("Destination is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/output-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create route");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch {
      setError("Failed to create route");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(route: OutputRoute) {
    try {
      await fetch("/api/settings/output-routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: route.id, enabled: !route.enabled }),
      });
      setRoutes((prev) => prev.map((r) => r.id === route.id ? { ...r, enabled: !r.enabled } : r));
    } catch {
      setError("Failed to update route");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this output route?")) return;
    try {
      await fetch(`/api/settings/output-routes?id=${id}`, { method: "DELETE" });
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete route");
    }
  }

  function routeTargetPlaceholder() {
    if (form.routeType === "slack") return "Channel ID, e.g. C0123456789 or https://hooks.slack.com/...";
    if (form.routeType === "email") return "recipient@example.com";
    return "https://your-webhook-endpoint.example.com";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">Output Auto-Routing</h2>
          <p className="text-[rgba(180,200,220,0.55)] text-xs mt-0.5">
            Automatically deliver task digests to Slack, email, or webhooks when agents complete or fail tasks.
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="text-xs px-3 py-1.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Route"}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[rgba(180,200,220,0.6)] mb-1">Route name (optional)</label>
              <input
                type="text"
                placeholder="e.g. Ops Slack alerts"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs text-white placeholder-[rgba(180,200,220,0.3)] focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-[rgba(180,200,220,0.6)] mb-1">Agent</label>
              <select
                value={form.agentTarget}
                onChange={(e) => setForm((f) => ({ ...f, agentTarget: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                {AGENT_TARGETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[rgba(180,200,220,0.6)] mb-1">Destination type</label>
              <select
                value={form.routeType}
                onChange={(e) => setForm((f) => ({ ...f, routeType: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                {ROUTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[rgba(180,200,220,0.6)] mb-1">Destination</label>
              <input
                type="text"
                placeholder={routeTargetPlaceholder()}
                value={form.routeTarget}
                onChange={(e) => setForm((f) => ({ ...f, routeTarget: e.target.value }))}
                className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-xs text-white placeholder-[rgba(180,200,220,0.3)] focus:outline-none focus:border-teal-500/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.onCompleted}
                onChange={(e) => setForm((f) => ({ ...f, onCompleted: e.target.checked }))}
                className="accent-teal-500"
              />
              <span className="text-xs text-[rgba(180,200,220,0.7)]">On completed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.onFailed}
                onChange={(e) => setForm((f) => ({ ...f, onFailed: e.target.checked }))}
                className="accent-teal-500"
              />
              <span className="text-xs text-[rgba(180,200,220,0.7)]">On failed</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="ml-auto text-xs px-4 py-1.5 rounded-md bg-teal-500 text-white hover:bg-teal-400 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Add Route"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-[rgba(180,200,220,0.4)] text-xs py-4 text-center">Loading…</div>
      ) : routes.length === 0 ? (
        <div className="text-[rgba(180,200,220,0.35)] text-xs py-6 text-center border border-dashed border-[rgba(255,255,255,0.08)] rounded-lg">
          No output routes configured. Add one to auto-deliver task digests.
        </div>
      ) : (
        <div className="space-y-2">
          {routes.map((route) => {
            const agentLabel = AGENT_TARGETS.find((a) => a.value === route.agentTarget)?.label ?? route.agentTarget;
            const typeLabel = ROUTE_TYPES.find((t) => t.value === route.routeType)?.label ?? route.routeType;
            const events = [route.onCompleted && "completed", route.onFailed && "failed"].filter(Boolean).join(" + ");
            return (
              <div
                key={route.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  route.enabled
                    ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] opacity-60"
                }`}
              >
                <button
                  onClick={() => handleToggle(route)}
                  className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${route.enabled ? "bg-teal-500" : "bg-[rgba(255,255,255,0.12)]"}`}
                  title={route.enabled ? "Disable" : "Enable"}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${route.enabled ? "left-[18px]" : "left-0.5"}`}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-xs font-medium truncate">
                      {route.name || `${typeLabel} → ${agentLabel}`}
                    </span>
                    <span className="text-[rgba(180,200,220,0.4)] text-[10px]">·</span>
                    <span className="text-teal-400 text-[10px]">{typeLabel}</span>
                    <span className="text-[rgba(180,200,220,0.4)] text-[10px]">·</span>
                    <span className="text-[rgba(180,200,220,0.5)] text-[10px]">{agentLabel}</span>
                    {events && (
                      <>
                        <span className="text-[rgba(180,200,220,0.4)] text-[10px]">·</span>
                        <span className="text-[rgba(180,200,220,0.5)] text-[10px]">on {events}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[rgba(180,200,220,0.4)] text-[10px] truncate mt-0.5">{route.routeTarget}</div>
                </div>
                <button
                  onClick={() => handleDelete(route.id)}
                  className="text-[rgba(255,100,100,0.5)] hover:text-red-400 text-xs transition-colors flex-shrink-0"
                  title="Delete route"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
