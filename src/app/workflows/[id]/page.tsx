"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflow-canvas";
import type { WorkflowGraph } from "@/lib/workflow-types";

type WorkflowDetail = {
  id: string;
  name: string;
  description: string;
  status: string;
  graphJson: string;
  version: number;
};

export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [graph, setGraph] = useState<WorkflowGraph>({ nodes: [], edges: [] });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchWorkflow = useCallback(async () => {
    const res = await fetch(`/api/workflows/${params.id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { workflow: WorkflowDetail };
    setWorkflow(data.workflow);
    try {
      setGraph(JSON.parse(data.workflow.graphJson) as WorkflowGraph);
    } catch {
      setGraph({ nodes: [], edges: [] });
    }
  }, [params.id]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  async function save() {
    if (!workflow) return;
    setSaving(true);
    await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graphJson: JSON.stringify(graph) }),
    });
    setDirty(false);
    setSaving(false);
  }

  async function toggleStatus() {
    if (!workflow) return;
    const newStatus = workflow.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await fetch(`/api/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchWorkflow();
  }

  async function runWorkflow() {
    if (!workflow) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { runId: string };
        router.push(`/workflows/${workflow.id}/runs/${data.runId}`);
      }
    } catch { /* ignore */ }
    setRunning(false);
  }

  if (!workflow) return <div className="p-6 text-sm text-white/30">Loading...</div>;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/workflows")}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-sm font-semibold text-white/90">{workflow.name}</h1>
          <span className="text-[10px] text-white/25">v{workflow.version}</span>
          {dirty && <span className="text-[10px] text-amber-400/60">Unsaved</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleStatus}
            className={[
              "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
              workflow.status === "ACTIVE"
                ? "text-amber-400 border-amber-500/20 bg-amber-500/[0.06] hover:bg-amber-500/10"
                : "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.06] hover:bg-emerald-500/10",
            ].join(" ")}
          >
            {workflow.status === "ACTIVE" ? "Pause" : "Activate"}
          </button>

          <button
            onClick={save}
            disabled={saving || !dirty}
            className="px-3 py-1 rounded-lg text-xs font-medium text-white/60 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={runWorkflow}
            disabled={running || graph.nodes.length === 0}
            className="px-3 py-1 rounded-lg text-xs font-medium text-teal-300 border border-teal-500/20 bg-teal-500/10 hover:bg-teal-500/20 transition-colors disabled:opacity-40"
          >
            {running ? "Starting..." : "Run"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <WorkflowCanvas
          graph={graph}
          onChange={(g) => { setGraph(g); setDirty(true); }}
        />
      </div>
    </div>
  );
}
