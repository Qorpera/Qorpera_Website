"use client";

import { useState } from "react";
import Link from "next/link";
import type { DelegatedTaskView, WorkerAgentTarget } from "@/lib/orchestration-store";
import { AgentRunStream } from "@/components/agent-run-stream";

export function ChiefAdvisorDelegationPanel({
  initialTasks,
  availableTargets,
}: {
  initialTasks: DelegatedTaskView[];
  availableTargets: WorkerAgentTarget[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [toAgentTarget, setToAgentTarget] = useState<WorkerAgentTarget>(availableTargets[0] ?? "ASSISTANT");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [streamingTaskId, setStreamingTaskId] = useState<string | null>(null);
  const hasTargets = availableTargets.length > 0;

  async function delegateNow() {
    if (!hasTargets) {
      setStatus("Activate a team role before delegating tasks.");
      return;
    }
    if (!title.trim() || !instructions.trim()) {
      setStatus("Title and instructions are required.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/agents/delegated-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAgent: "CHIEF_ADVISOR",
          toAgentTarget,
          title,
          instructions,
          dueLabel: "Now",
          triggerSource: "DELEGATED",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; task?: DelegatedTaskView };
      if (!res.ok || !data.task) throw new Error(data.error || "Failed to delegate");
      const newTask = data.task;
      setTasks((curr) => [newTask, ...curr]);
      setTitle("");
      setInstructions("");
      setStatus(`Delegated to ${toAgentTarget.replaceAll("_", " ").toLowerCase()}`);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Failed to delegate");
    } finally {
      setBusy(false);
    }
  }

  async function schedulerTick() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/scheduler/tick", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: { created?: DelegatedTaskView[]; utcTime?: string };
      };
      if (!res.ok || !data.result) throw new Error(data.error || "Scheduler tick failed");
      const result = data.result;
      if (result.created?.length) { const created = result.created; setTasks((curr) => [...created, ...curr]); }
      setStatus(`Scheduler tick ran (${result.created?.length ?? 0} tasks created) at ${result.utcTime ?? "now"} UTC`);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Scheduler tick failed");
    } finally {
      setBusy(false);
    }
  }

  async function setTaskStatus(id: string, nextStatus: DelegatedTaskView["status"]) {
    const res = await fetch("/api/agents/delegated-tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    const data = (await res.json().catch(() => ({}))) as { task?: DelegatedTaskView };
    if (!res.ok || !data.task) return;
    setTasks((curr) => curr.map((t) => (t.id === id ? data.task! : t)));
  }

  return (
    <section className="wf-panel rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Delegate work / orchestrate agents</h2>
        <div className="flex gap-2">
          <button type="button" onClick={schedulerTick} disabled={busy} className="wf-btn px-3 py-1.5 text-sm disabled:opacity-60">
            Run scheduler tick
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              try {
                const res = await fetch("/api/agents/delegated-tasks/run", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ limit: 5 }),
                });
                const data = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  result?: { processed?: DelegatedTaskView[] };
                };
                if (!res.ok || !data.result) throw new Error(data.error || "Queue run failed");
                if (data.result.processed?.length) {
                  const processedMap = new Map(data.result.processed.map((t) => [t.id, t]));
                  setTasks((curr) => curr.map((t) => processedMap.get(t.id) ?? t));
                }
                setStatus(`Ran queue (${data.result.processed?.length ?? 0} tasks processed)`);
              } catch (e: unknown) {
                setStatus(e instanceof Error ? e.message : "Queue run failed");
              } finally {
                setBusy(false);
              }
            }}
            className="wf-btn-primary px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Run queued tasks
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
        <label className="text-sm">
          Delegate to
          <select
            value={toAgentTarget}
            onChange={(e) => setToAgentTarget(e.target.value as WorkerAgentTarget)}
            disabled={!hasTargets}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
          >
            {hasTargets ? (
              availableTargets.map((target) => (
                <option key={target} value={target}>
                  {target === "ASSISTANT" ? "Assistant" : "Project Manager"}
                </option>
              ))
            ) : (
              <option value="">No hired workers</option>
            )}
          </select>
        </label>
        <label className="text-sm">
          Task title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            placeholder="Ex: Build daily support triage summary + draft reply batch"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        Delegation instructions
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="mt-2 h-28 w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-3"
          placeholder="What should the agent do, which tools can it use, what approvals are required, and what output should it produce?"
        />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm wf-muted">
          {hasTargets
            ? "Chief Advisor can delegate work, wake team roles, and use scheduler ticks to trigger scheduled routines."
            : "Activate at least one team role to enable delegation and scheduled routines."}
          {!hasTargets ? (
            <>
              {" "}
              <Link href="/agents/hire" className="underline underline-offset-2 hover:text-white">
                Add Team Roles
              </Link>
            </>
          ) : null}
        </div>
        <button type="button" onClick={delegateNow} disabled={busy || !hasTargets} className="wf-btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {busy ? "Working..." : "Delegate task"}
        </button>
      </div>
      {status ? <div className="mt-3 text-sm wf-muted">{status}</div> : null}

      <div className="mt-5 space-y-3">
        <div className="text-sm font-medium">Delegated task queue</div>
        {tasks.length === 0 ? (
          <div className="wf-soft rounded-2xl p-4 text-sm wf-muted">No delegated tasks yet.</div>
        ) : (
          tasks.slice(0, 20).map((task) => (
            <div key={task.id} className="wf-soft rounded-2xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-base font-medium">{task.title}</div>
                  <div className="mt-1 text-sm wf-muted">
                    {task.fromAgent} {"->"} {task.toAgentTarget} · {task.triggerSource.toLowerCase()} · {new Date(task.createdAt).toLocaleString()}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm">{task.instructions}</div>
                  {task.traces?.length ? (
                    <details className="mt-3 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3">
                      <summary className="cursor-pointer text-xs uppercase tracking-[0.12em] wf-muted">
                        Tool trace ({task.traces.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {task.traces.map((trace) => (
                          <div key={trace.id} className="rounded-lg border border-[rgba(255,255,255,0.05)] px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{trace.toolName}</span>
                              <span className="wf-chip rounded-full px-2 py-0.5 text-[10px]">{trace.phase}</span>
                              <span className="wf-chip rounded-full px-2 py-0.5 text-[10px]">{trace.status}</span>
                              {trace.latencyMs != null ? (
                                <span className="text-xs wf-muted">{trace.latencyMs}ms</span>
                              ) : null}
                            </div>
                            {trace.inputSummary ? <div className="mt-1 text-xs wf-muted">In: {trace.inputSummary}</div> : null}
                            {trace.outputSummary ? <div className="mt-1 text-xs wf-muted">Out: {trace.outputSummary}</div> : null}
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  {task.status === "REVIEW" ? (
                    <div className="mt-2 rounded-lg border border-orange-400/20 bg-orange-500/10 px-2.5 py-2 text-xs text-orange-100">
                      Output generated and moved to review. Check Business Logs and Review queue/workflow before external actions.
                    </div>
                  ) : null}
                  {streamingTaskId === task.id ? (
                    <AgentRunStream
                      taskId={task.id}
                      onDone={async (taskStatus) => {
                        // Refetch the updated task (with traces) then clear stream
                        try {
                          const res = await fetch("/api/agents/delegated-tasks");
                          const data = (await res.json().catch(() => ({}))) as { tasks?: DelegatedTaskView[] };
                          if (data.tasks) setTasks(data.tasks.slice(0, 20));
                        } catch { /* non-fatal */ }
                        setStreamingTaskId(null);
                        setStatus(`Task completed with status: ${taskStatus.toLowerCase()}`);
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-[170px]">
                  <div className="mb-2 text-xs uppercase tracking-[0.12em] wf-muted">Status</div>
                  <div className="grid gap-1">
                    {task.status === "REVIEW" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const res = await fetch("/api/agents/delegated-tasks/approve-execute", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ taskId: task.id }),
                            });
                            const data = (await res.json().catch(() => ({}))) as {
                              task?: DelegatedTaskView;
                              executed?: number;
                              failed?: number;
                              error?: string;
                            };
                            if (!res.ok || !data.task) throw new Error(data.error || "Approve + execute failed");
                            setTasks((curr) => curr.map((t) => (t.id === task.id ? data.task! : t)));
                            setStatus(`Approved connector execution for "${task.title}" (${data.executed ?? 0} executed, ${data.failed ?? 0} failed)`);
                          } catch (e: unknown) {
                            setStatus(e instanceof Error ? e.message : "Approve + execute failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-2 py-1 text-xs text-left text-orange-100"
                      >
                        approve + execute
                      </button>
                    ) : null}
                    {(task.status === "QUEUED" || task.status === "PAUSED") ? (
                      <button
                        type="button"
                        onClick={() => setStreamingTaskId(task.id)}
                        disabled={streamingTaskId !== null}
                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs text-left text-emerald-100 disabled:opacity-40"
                      >
                        run now
                      </button>
                    ) : null}
                    {(["QUEUED", "RUNNING", "REVIEW", "DONE", "PAUSED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void setTaskStatus(task.id, s)}
                        className={`rounded-lg border px-2 py-1 text-xs text-left ${
                          task.status === s ? "border-teal-400/40 bg-teal-500/10" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                        }`}
                      >
                        {s.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
