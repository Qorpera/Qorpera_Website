"use client";

import { useState, useTransition } from "react";
import type { ScheduleView } from "@/lib/schedule-store";

// ── Agent options ──────────────────────────────────────────────────
const AGENT_OPTIONS: { value: string; label: string }[] = [
  { value: "CHIEF_ADVISOR", label: "Chief Advisor" },
  { value: "ASSISTANT", label: "Assistant" },
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "CUSTOMER_SUCCESS", label: "Customer Success" },
  { value: "MARKETING_COORDINATOR", label: "Marketing Coordinator" },
  { value: "FINANCE_ANALYST", label: "Finance Analyst" },
  { value: "OPERATIONS_MANAGER", label: "Operations Manager" },
  { value: "EXECUTIVE_ASSISTANT", label: "Executive Assistant" },
  { value: "RESEARCH_ANALYST", label: "Research Analyst" },
  { value: "SEO_SPECIALIST", label: "SEO Specialist" },
];

const AGENT_LABEL: Record<string, string> = Object.fromEntries(AGENT_OPTIONS.map((o) => [o.value, o.label]));

// ── Timezone options ───────────────────────────────────────────────
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "UTC", label: "UTC" },
];

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Time helpers ───────────────────────────────────────────────────
function parse24hToAmPm(t: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  const [h, m] = t.split(":").map(Number);
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, ampm };
}

function format24h(hour: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour;
  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ── Frequency label helpers ────────────────────────────────────────
function frequencyLabel(s: ScheduleView): string {
  const tp = parse24hToAmPm(s.timeOfDay);
  const timeStr = `${tp.hour}:${String(tp.minute).padStart(2, "0")} ${tp.ampm}`;
  const tzAbbr = s.timezone === "UTC" ? "UTC" : s.timezone.split("/").pop()?.replace("_", " ") ?? s.timezone;
  if (s.frequency === "DAILY") return `Every day at ${timeStr} ${tzAbbr}`;
  if (s.frequency === "WEEKLY") {
    const dow = s.dayOfWeek != null ? DOW_LABELS[s.dayOfWeek] : "Monday";
    return `Every ${dow} at ${timeStr} ${tzAbbr}`;
  }
  // MONTHLY
  const day = s.dayOfMonth ?? 1;
  const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  return `Monthly on the ${day}${suffix} at ${timeStr} ${tzAbbr}`;
}

function formatNextRun(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Default new-schedule state ─────────────────────────────────────
type FormState = {
  title: string;
  agentKind: string;
  instructions: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  ampm: "AM" | "PM";
  timezone: string;
};

function defaultForm(): FormState {
  return {
    title: "",
    agentKind: "SALES_REP",
    instructions: "",
    frequency: "WEEKLY",
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    hour: 9,
    minute: 0,
    ampm: "AM",
    timezone: "America/New_York",
  };
}

function scheduleToForm(s: ScheduleView): FormState {
  const tp = parse24hToAmPm(s.timeOfDay);
  return {
    title: s.title,
    agentKind: s.agentKind,
    instructions: s.instructions,
    frequency: s.frequency as "DAILY" | "WEEKLY" | "MONTHLY",
    dayOfWeek: s.dayOfWeek ?? 1,
    dayOfMonth: s.dayOfMonth ?? 1,
    hour: tp.hour,
    minute: tp.minute,
    ampm: tp.ampm,
    timezone: s.timezone,
  };
}

// ── Main component ─────────────────────────────────────────────────
export function SchedulesPanel({ initialSchedules }: { initialSchedules: ScheduleView[] }) {
  const [schedules, setSchedules] = useState<ScheduleView[]>(initialSchedules);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, startSave] = useTransition();

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setModalOpen(true);
  }

  function openEdit(s: ScheduleView) {
    setEditingId(s.id);
    setForm(scheduleToForm(s));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function buildPayload(f: FormState) {
    return {
      agentKind: f.agentKind,
      title: f.title,
      instructions: f.instructions,
      frequency: f.frequency,
      dayOfWeek: f.frequency === "WEEKLY" ? f.dayOfWeek : null,
      dayOfMonth: f.frequency === "MONTHLY" ? f.dayOfMonth : null,
      timeOfDay: format24h(f.hour, f.minute, f.ampm),
      timezone: f.timezone,
    };
  }

  function handleSave() {
    startSave(async () => {
      const payload = buildPayload(form);
      const url = editingId ? `/api/schedules/${editingId}` : "/api/schedules";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (editingId) {
        setSchedules((prev) => prev.map((s) => (s.id === editingId ? data.schedule : s)));
      } else {
        setSchedules((prev) => [data.schedule, ...prev]);
      }
      closeModal();
    });
  }

  function handleToggle(s: ScheduleView) {
    const optimistic = schedules.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x));
    setSchedules(optimistic);
    fetch(`/api/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    }).then((r) => {
      if (r.ok) return r.json().then((d) => setSchedules((prev) => prev.map((x) => (x.id === s.id ? d.schedule : x))));
      // revert on failure
      setSchedules(schedules);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this schedule?")) return;
    fetch(`/api/schedules/${id}`, { method: "DELETE" }).then((r) => {
      if (r.ok) setSchedules((prev) => prev.filter((s) => s.id !== id));
    });
  }

  const set = (key: keyof FormState, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Scheduled Tasks</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Recurring agent tasks that run automatically on your schedule.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Schedule
        </button>
      </div>

      {/* Empty state */}
      {schedules.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-zinc-700">
          <p className="text-zinc-400 text-sm mb-4">No scheduled tasks yet.</p>
          <p className="text-zinc-500 text-xs mb-6 max-w-xs mx-auto">
            Set up recurring tasks like "Every Monday at 9am, have my Sales Rep pull last week&apos;s leads and email me a summary."
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create your first schedule
          </button>
        </div>
      )}

      {/* Schedule cards */}
      <div className="space-y-3">
        {schedules.map((s) => (
          <div
            key={s.id}
            className="bg-[rgba(255,255,255,0.04)] border border-zinc-800 rounded-xl p-4 flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white text-sm font-medium truncate">{s.title}</span>
                <span className="px-1.5 py-0.5 bg-teal-900/60 text-teal-300 text-xs rounded font-mono">
                  {AGENT_LABEL[s.agentKind] ?? s.agentKind}
                </span>
              </div>
              <p className="text-zinc-400 text-xs">{frequencyLabel(s)}</p>
              <p className="text-zinc-500 text-xs mt-0.5">Next run: {formatNextRun(s.nextRunAt)}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Enabled toggle */}
              <button
                onClick={() => handleToggle(s)}
                title={s.enabled ? "Disable" : "Enable"}
                className={`relative w-9 h-5 rounded-full transition-colors ${s.enabled ? "bg-teal-600" : "bg-zinc-700"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>

              {/* Edit */}
              <button
                onClick={() => openEdit(s)}
                className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Edit
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(s.id)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-[rgba(12,18,24,0.98)] border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editingId ? "Edit Schedule" : "New Schedule"}</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Weekly leads summary"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Agent */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Agent</label>
                <select
                  value={form.agentKind}
                  onChange={(e) => set("agentKind", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-600"
                >
                  {AGENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => set("instructions", e.target.value)}
                  placeholder="Pull last week's leads from HubSpot, summarize pipeline changes, and email me a report."
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-teal-600 resize-none"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Frequency</label>
                <div className="flex gap-1">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => set("frequency", f)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        form.frequency === f
                          ? "bg-teal-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                      }`}
                    >
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* WEEKLY: day-of-week pills */}
              {form.frequency === "WEEKLY" && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Day of week</label>
                  <div className="flex gap-1 flex-wrap">
                    {DOW_LABELS.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => set("dayOfWeek", i)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                          form.dayOfWeek === i
                            ? "bg-teal-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MONTHLY: day of month */}
              {form.frequency === "MONTHLY" && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Day of each month</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.dayOfMonth}
                      onChange={(e) => set("dayOfMonth", Math.min(31, Math.max(1, Number(e.target.value))))}
                      className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-teal-600"
                    />
                    <span className="text-xs text-zinc-400">of each month</span>
                  </div>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Time</label>
                <div className="flex gap-2">
                  {/* Hour */}
                  <select
                    value={form.hour}
                    onChange={(e) => set("hour", Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-teal-600"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  {/* Minute */}
                  <select
                    value={form.minute}
                    onChange={(e) => set("minute", Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-teal-600"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>

                  {/* AM/PM */}
                  <div className="flex gap-1">
                    {(["AM", "PM"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => set("ampm", a)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          form.ampm === a
                            ? "bg-teal-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-600"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.instructions.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
