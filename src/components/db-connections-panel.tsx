"use client";

import { useState, useEffect, useTransition } from "react";
import type { DbConnectionView } from "@/lib/db-connections-store";

type FormState = {
  name: string;
  connectionString: string;
  allowedTablesRaw: string; // comma-separated
};

function defaultForm(): FormState {
  return { name: "", connectionString: "", allowedTablesRaw: "" };
}

function connToForm(c: DbConnectionView): FormState {
  return {
    name: c.name,
    connectionString: "",  // never prefill; user must re-enter to update
    allowedTablesRaw: c.allowedTables ? c.allowedTables.join(", ") : "",
  };
}

function parseAllowedTables(raw: string): string[] | null {
  const tables = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return tables.length > 0 ? tables : null;
}

export function DbConnectionsPanel() {
  const [connections, setConnections] = useState<DbConnectionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, startSave] = useTransition();
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/db-connections")
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEdit(c: DbConnectionView) {
    setEditingId(c.id);
    setForm(connToForm(c));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function handleSave() {
    startSave(async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        allowedTables: parseAllowedTables(form.allowedTablesRaw),
      };
      if (form.connectionString.trim()) payload.connectionString = form.connectionString.trim();
      if (!editingId) {
        if (!form.connectionString.trim()) return; // required for create
        payload.connectionString = form.connectionString.trim();
      }
      const url = editingId ? `/api/db-connections/${editingId}` : "/api/db-connections";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (editingId) {
        setConnections((prev) => prev.map((c) => (c.id === editingId ? data.connection : c)));
      } else {
        setConnections((prev) => [data.connection, ...prev]);
      }
      closeModal();
    });
  }

  function handleToggle(c: DbConnectionView) {
    const optimistic = connections.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x));
    setConnections(optimistic);
    fetch(`/api/db-connections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !c.enabled }),
    }).then((r) => {
      if (r.ok) return r.json().then((d) => setConnections((prev) => prev.map((x) => (x.id === c.id ? d.connection : x))));
      setConnections(connections);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this database connection? Agents will no longer be able to query it.")) return;
    fetch(`/api/db-connections/${id}`, { method: "DELETE" }).then((r) => {
      if (r.ok) setConnections((prev) => prev.filter((c) => c.id !== id));
    });
  }

  async function handleTest(id: string) {
    setTesting(id);
    const res = await fetch(`/api/db-connections/${id}/test`, { method: "POST" });
    const data = await res.json() as { ok: boolean; message: string };
    setTestResults((prev) => ({ ...prev, [id]: data }));
    setTesting(null);
    // Refresh to get updated lastTestStatus
    const listRes = await fetch("/api/db-connections");
    const listData = await listRes.json() as { connections: DbConnectionView[] };
    setConnections(listData.connections ?? []);
  }

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium mb-0.5">Database connections</div>
          <p className="text-sm text-white/45">
            Connect your databases so agents can run read-only SQL queries. Only SELECT statements are permitted.
            Use the <code className="text-xs bg-white/10 px-1 rounded">sql_query</code> tool to query a connection.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          + Add connection
        </button>
      </div>

      {loading && <p className="text-sm text-white/30">Loading…</p>}

      {!loading && connections.length === 0 && (
        <div className="text-center py-10 rounded-xl border border-dashed border-white/10">
          <p className="text-sm text-white/30 mb-1">No database connections yet.</p>
          <p className="text-xs text-white/20">Add a PostgreSQL connection string to let agents query your data.</p>
        </div>
      )}

      {connections.length > 0 && (
        <div className="border border-white/[0.08] rounded-lg divide-y divide-white/[0.06] overflow-hidden">
          {connections.map((c) => {
            const testResult = testResults[c.id];
            return (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2 flex-wrap">
                      {c.allowedTables && c.allowedTables.length > 0 ? (
                        <span>Tables: {c.allowedTables.join(", ")}</span>
                      ) : (
                        <span className="text-white/20">All tables (unrestricted)</span>
                      )}
                      {c.lastTestedAt && (
                        <span className={`${c.lastTestStatus === "ok" ? "text-emerald-400/60" : "text-rose-400/60"}`}>
                          · {c.lastTestStatus === "ok" ? "Connected" : c.lastTestStatus ?? "Unknown"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTest(c.id)}
                      disabled={testing === c.id}
                      className="px-2 py-1 text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
                    >
                      {testing === c.id ? "Testing…" : "Test"}
                    </button>
                    <button
                      onClick={() => handleToggle(c)}
                      title={c.enabled ? "Disable" : "Enable"}
                      className={`relative w-9 h-5 rounded-full transition-colors ${c.enabled ? "bg-teal-600" : "bg-zinc-700"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.enabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="px-2 py-1 text-xs text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2 py-1 text-xs text-white/30 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {testResult && (
                  <p className={`text-xs mt-1.5 ${testResult.ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            );
          })}
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
              <h2 className="text-white font-semibold text-sm">{editingId ? "Edit connection" : "Add database connection"}</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Production DB"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Connection string{editingId && <span className="text-zinc-600 ml-1">(leave blank to keep existing)</span>}
                </label>
                <input
                  type="password"
                  value={form.connectionString}
                  onChange={(e) => set("connectionString", e.target.value)}
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600 font-mono"
                />
                <p className="text-xs text-zinc-600 mt-1">Stored encrypted. Supports PostgreSQL and Neon connection strings.</p>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Allowed tables <span className="text-zinc-600">(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.allowedTablesRaw}
                  onChange={(e) => set("allowedTablesRaw", e.target.value)}
                  placeholder="users, orders, products"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600"
                />
                <p className="text-xs text-zinc-600 mt-1">Leave blank to allow SELECT on any table.</p>
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || (!editingId && !form.connectionString.trim())}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
