"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkflowRunMonitor } from "@/components/workflow-run-monitor";
import type { WorkflowGraph } from "@/lib/workflow-types";

export default function WorkflowRunPage() {
  const params = useParams<{ id: string; runId: string }>();
  const router = useRouter();
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);

  const fetchGraph = useCallback(async () => {
    const res = await fetch(`/api/workflows/${params.id}`);
    if (!res.ok) return;
    const data = (await res.json()) as { workflow: { graphJson: string } };
    try {
      setGraph(JSON.parse(data.workflow.graphJson) as WorkflowGraph);
    } catch { /* ignore */ }
  }, [params.id]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  if (!graph) return <div className="p-6 text-sm text-white/30">Loading...</div>;

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] shrink-0">
        <button
          onClick={() => router.push(`/workflows/${params.id}`)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          ← Back to Editor
        </button>
        <h1 className="text-sm font-semibold text-white/90">Run {params.runId.slice(0, 8)}...</h1>
      </div>

      <div className="flex-1 min-h-0">
        <WorkflowRunMonitor runId={params.runId} graph={graph} />
      </div>
    </div>
  );
}
