"use client";

import { useEffect, useState, useCallback } from "react";
import type { WorkflowRunView } from "@/lib/workflow-types";
import type { WorkflowGraph } from "@/lib/workflow-types";
import { WorkflowCanvas } from "@/components/workflow-canvas";

type Props = {
  runId: string;
  graph: WorkflowGraph;
};

export function WorkflowRunMonitor({ runId, graph }: Props) {
  const [run, setRun] = useState<WorkflowRunView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/runs/${runId}`);
      if (res.ok) {
        const data = (await res.json()) as { run: WorkflowRunView };
        setRun(data.run);
      }
    } catch {
      setError("Failed to load run");
    }
  }, [runId]);

  useEffect(() => {
    fetchRun();
    const interval = setInterval(fetchRun, 3000);
    return () => clearInterval(interval);
  }, [fetchRun]);

  if (error) return <p className="text-sm text-red-400/60 p-4">{error}</p>;
  if (!run) return <p className="text-sm text-white/30 p-4">Loading run...</p>;

  const isActive = run.status === "RUNNING";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className={[
              "w-2 h-2 rounded-full",
              run.status === "COMPLETED" ? "bg-emerald-400" :
              run.status === "RUNNING" ? "bg-blue-400 animate-pulse" :
              run.status === "FAILED" ? "bg-red-400" :
              "bg-white/30",
            ].join(" ")}
          />
          <span className="text-sm font-medium text-white/80">{run.status}</span>
          {isActive && <span className="text-xs text-white/30 animate-pulse">Polling every 3s</span>}
        </div>
        <div className="text-xs text-white/30">
          Started {new Date(run.startedAt).toLocaleString()}
          {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
        </div>
      </div>

      <div className="flex-1">
        <WorkflowCanvas
          graph={graph}
          onChange={() => {}}
          readOnly
          nodeStates={run.nodeStates}
        />
      </div>

      <div className="border-t border-white/[0.06] max-h-48 overflow-y-auto">
        <div className="px-5 py-3 space-y-2">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Node States</h4>
          {Object.entries(run.nodeStates).map(([nodeId, state]) => {
            const node = graph.nodes.find((n) => n.id === nodeId);
            return (
              <div key={nodeId} className="flex items-start gap-2 text-xs">
                <span
                  className={[
                    "w-1.5 h-1.5 rounded-full mt-1 shrink-0",
                    state.status === "completed" ? "bg-emerald-400" :
                    state.status === "running" ? "bg-blue-400" :
                    state.status === "failed" ? "bg-red-400" :
                    state.status === "skipped" ? "bg-white/20" :
                    "bg-white/10",
                  ].join(" ")}
                />
                <span className="text-white/60 min-w-[120px]">{node?.label ?? nodeId}</span>
                <span className="text-white/30 truncate">
                  {state.error ?? state.output?.slice(0, 100) ?? state.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
