"use client";

import { useState, useEffect, useCallback } from "react";

type Checkpoint = {
  id: string;
  phaseIndex: number;
  phaseName: string;
  turnsCompleted: number;
  createdAt: string;
};

type TaskProgress = {
  task: {
    id: string;
    title: string;
    status: string;
    isLongRunning: boolean;
    currentPhase: number;
    totalPhases: number;
    progressPct: number;
    lastCheckpointAt: string | null;
  };
  checkpoints: Checkpoint[];
};

export function TaskProgressPanel({ taskId }: { taskId: string }) {
  const [data, setData] = useState<TaskProgress | null>(null);
  const [resuming, setResuming] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/agents/delegated-tasks/${taskId}/progress`);
    if (res.ok) setData(await res.json());
  }, [taskId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!data) return <div className="text-sm text-gray-500">Loading progress...</div>;

  const { task, checkpoints } = data;
  const canResume = task.isLongRunning && ["FAILED", "PAUSED"].includes(task.status) && checkpoints.length > 0;

  const handleResume = async () => {
    setResuming(true);
    try {
      await fetch(`/api/agents/delegated-tasks/${taskId}/resume`, { method: "POST" });
      await refresh();
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{task.title}</h3>
        <span className={`rounded px-2 py-0.5 text-xs ${
          task.status === "DONE" ? "bg-emerald-900/40 text-emerald-400"
            : task.status === "RUNNING" ? "bg-blue-900/40 text-blue-400"
            : task.status === "FAILED" ? "bg-red-900/40 text-red-400"
            : "bg-gray-800 text-gray-400"
        }`}>
          {task.status}
        </span>
      </div>

      {task.isLongRunning && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Phase {task.currentPhase + 1} of {task.totalPhases}</span>
              <span>{task.progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-500"
                style={{ width: `${task.progressPct}%` }}
              />
            </div>
          </div>

          {checkpoints.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Checkpoints</p>
              {checkpoints.map((cp) => (
                <div key={cp.id} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-4 h-4 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-400 text-[10px]">
                    {cp.phaseIndex + 1}
                  </span>
                  <span className="flex-1">{cp.phaseName || `Phase ${cp.phaseIndex + 1}`}</span>
                  <span className="text-gray-600">{cp.turnsCompleted} turns</span>
                  <span className="text-gray-600">{new Date(cp.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}

          {canResume && (
            <button
              onClick={handleResume}
              disabled={resuming}
              className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {resuming ? "Resuming..." : "Resume from Checkpoint"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
