"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { WorkflowView } from "@/lib/workflow-types";

type Template = { slug: string; name: string; description: string; category: string };

export function WorkflowListPanel() {
  const [workflows, setWorkflows] = useState<WorkflowView[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = (await res.json()) as { workflows: WorkflowView[] };
        setWorkflows(data.workflows);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows/templates");
      if (res.ok) {
        const data = (await res.json()) as { templates: Template[] };
        setTemplates(data.templates);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
  }, [fetchWorkflows, fetchTemplates]);

  async function createFromTemplate(slug: string) {
    setCreating(true);
    try {
      const { WORKFLOW_TEMPLATES } = await import("@/lib/workflow-templates");
      const tpl = WORKFLOW_TEMPLATES.find((t) => t.slug === slug);
      if (!tpl) return;
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name,
          description: tpl.description,
          graphJson: JSON.stringify(tpl.graph),
          templateSlug: tpl.slug,
        }),
      });
      if (res.ok) {
        await fetchWorkflows();
        setShowCreate(false);
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function createBlank() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        await fetchWorkflows();
        setShowCreate(false);
        setNewName("");
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function deleteWorkflow(id: string) {
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    await fetchWorkflows();
  }

  const statusColors: Record<string, string> = {
    DRAFT: "text-white/40 bg-white/[0.04] border-white/[0.08]",
    ACTIVE: "text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/20",
    PAUSED: "text-amber-400 bg-amber-500/[0.06] border-amber-500/20",
    ARCHIVED: "text-white/20 bg-white/[0.02] border-white/[0.04]",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white/90">Workflows</h2>
          <p className="text-sm text-white/40 mt-0.5">
            Build visual multi-step agent pipelines
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Workflow"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-white/80 mb-2">Start from Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => createFromTemplate(t.slug)}
                  disabled={creating}
                  className="text-left px-4 py-3 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <p className="text-xs font-medium text-white/80">{t.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{t.description}</p>
                  <span className="text-[9px] text-teal-400/60 font-medium mt-1 inline-block">{t.category}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <h3 className="text-sm font-medium text-white/80 mb-2">Or Start Blank</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workflow name..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 outline-none focus:border-teal-500/40"
                onKeyDown={(e) => e.key === "Enter" && createBlank()}
              />
              <button
                onClick={createBlank}
                disabled={creating || !newName.trim()}
                className="px-4 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <Link href={`/workflows/${wf.id}`} className="text-sm font-medium text-white/80 hover:text-white/95 transition-colors">
                {wf.name}
              </Link>
              {wf.description && (
                <p className="text-xs text-white/30 mt-0.5 truncate">{wf.description}</p>
              )}
            </div>

            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColors[wf.status] ?? ""}`}>
              {wf.status}
            </span>

            <span className="text-[10px] text-white/25 whitespace-nowrap">
              v{wf.version}
              {wf.lastRunAt && ` · Last run ${new Date(wf.lastRunAt).toLocaleDateString()}`}
            </span>

            <button
              onClick={() => deleteWorkflow(wf.id)}
              className="text-xs text-white/20 hover:text-red-400/60 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}

        {workflows.length === 0 && !showCreate && (
          <div className="text-center py-12">
            <p className="text-sm text-white/30">No workflows yet</p>
            <p className="text-xs text-white/20 mt-1">Create one from a template or start blank</p>
          </div>
        )}
      </div>
    </div>
  );
}
