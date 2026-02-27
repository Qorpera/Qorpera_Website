"use client";

import { useState } from "react";
import type { RecurringTaskView } from "@/lib/recurring-tasks-store";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(daysOfWeek: string[], scheduleTime: string): string {
  const sorted = [...daysOfWeek].sort();
  const isWeekdays = sorted.join(",") === "1,2,3,4,5";
  const isEveryDay = sorted.join(",") === "0,1,2,3,4,5,6";
  const isWeekends = sorted.join(",") === "0,6";
  let dayStr: string;
  if (isEveryDay) dayStr = "Every day";
  else if (isWeekdays) dayStr = "Weekdays";
  else if (isWeekends) dayStr = "Weekends";
  else dayStr = sorted.map((d) => DAY_SHORT[parseInt(d)]).join(", ");
  return `${dayStr} · ${scheduleTime} UTC`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function agentLabel(target: string): string {
  if (target === "CHIEF_ADVISOR") return "Chief Advisor";
  return target.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

function agentColor(target: string): string {
  if (target === "CHIEF_ADVISOR") return "text-teal-400 bg-teal-400/10 border-teal-400/20";
  if (target === "SALES_REP") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  if (target === "MARKETING_COORDINATOR") return "text-purple-400 bg-purple-400/10 border-purple-400/20";
  if (target === "FINANCE_ANALYST") return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  return "text-white/60 bg-white/5 border-white/10";
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

type Props = {
  initialTasks: RecurringTaskView[];
  hiredKinds: string[];
};

export function SchedulePanel({ initialTasks, hiredKinds }: Props) {
  const [tasks, setTasks] = useState<RecurringTaskView[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [agentTarget, setAgentTarget] = useState("CHIEF_ADVISOR");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [selectedDays, setSelectedDays] = useState<string[]>(["1", "2", "3", "4", "5"]);
  const [saving, setSaving] = useState(false);

  const allAgentTargets = ["CHIEF_ADVISOR", ...hiredKinds.filter((k) => k !== "CHIEF_ADVISOR")];

  function toggleDay(d: string) {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleCreate() {
    if (!title.trim() || !instructions.trim() || selectedDays.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentTarget,
          title: title.trim(),
          instructions: instructions.trim(),
          scheduleTime: `${hour}:${minute}`,
          daysOfWeek: selectedDays,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [data.task, ...prev]);
        setTitle("");
        setInstructions("");
        setSelectedDays(["1", "2", "3", "4", "5"]);
        setHour("09");
        setMinute("00");
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !current } : t));
    await fetch(`/api/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scheduled task?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Scheduled Tasks</h1>
          <p className="text-sm text-white/40 mt-0.5">Recurring tasks that run automatically on your chosen schedule.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
          >
            New task
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-5 space-y-4">
          <h2 className="text-sm font-medium text-white/80">New scheduled task</h2>

          {/* Agent */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 uppercase tracking-wide">Agent</label>
            <select
              value={agentTarget}
              onChange={(e) => setAgentTarget(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            >
              {allAgentTargets.map((t) => (
                <option key={t} value={t}>{agentLabel(t)}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly campaign report"
              className="w-full rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 uppercase tracking-wide">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              placeholder="Describe what the agent should do…"
              className="w-full rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-teal-500/50 resize-none"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 uppercase tracking-wide">Time (UTC)</label>
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
              >
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <span className="text-white/40 text-sm">:</span>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="rounded-xl bg-white/5 border border-white/[0.08] text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
              >
                {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Days */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wide">Days</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, i) => {
                const d = String(i);
                const active = selectedDays.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                        : "bg-white/5 text-white/40 border-white/[0.08] hover:text-white/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <div className="w-px h-5 bg-white/10 mx-1" />
              <button
                onClick={() => setSelectedDays(["1", "2", "3", "4", "5"])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/5 text-white/40 hover:text-white/60 transition-colors"
              >
                Weekdays
              </button>
              <button
                onClick={() => setSelectedDays(["0", "1", "2", "3", "4", "5", "6"])}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/5 text-white/40 hover:text-white/60 transition-colors"
              >
                Every day
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim() || !instructions.trim() || selectedDays.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save task"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-10 text-center">
          <p className="text-sm text-white/30">No scheduled tasks yet. Create one to automate recurring agent work.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`border border-white/[0.06] bg-white/[0.02] rounded-2xl px-5 py-4 flex items-start gap-4 transition-opacity ${
                task.isActive ? "opacity-100" : "opacity-50"
              }`}
            >
              {/* Left */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${agentColor(task.agentTarget)}`}>
                    {agentLabel(task.agentTarget)}
                  </span>
                  <span className="text-sm font-medium text-white truncate">{task.title}</span>
                </div>
                <p className="text-xs text-white/30 truncate">{task.instructions}</p>
              </div>

              {/* Center */}
              <div className="shrink-0 text-right space-y-1 hidden sm:block">
                <p className="text-xs text-white/60">{formatSchedule(task.daysOfWeek, task.scheduleTime)}</p>
                <p className="text-xs text-white/30">Last run: {relativeTime(task.lastRunAt)}</p>
              </div>

              {/* Right actions */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => handleToggle(task.id, task.isActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    task.isActive
                      ? "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20"
                      : "bg-white/5 text-white/30 border-white/[0.08] hover:text-white/50"
                  }`}
                >
                  {task.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  aria-label="Delete task"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
