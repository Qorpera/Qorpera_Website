"use client";

import { useState } from "react";

export function ReportIssueButton({
  agentKind,
  sourceRef,
}: {
  agentKind: string;
  sourceRef?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (!message.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/agent-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKind, message, sourceRef }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to submit");
      setResult({ ok: true, text: "Feedback submitted" });
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setResult(null);
      }, 1500);
    } catch (e: unknown) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-white/50 transition hover:text-white/75 hover:bg-white/[0.05]"
      >
        Report issue
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe the issue…"
        rows={3}
        maxLength={5000}
        className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-teal-500/50 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !message.trim()}
          className="rounded-md border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-xs text-teal-300 transition hover:bg-teal-500/20 disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); setMessage(""); }}
          className="rounded-md border border-white/[0.1] px-3 py-1 text-xs text-white/50 hover:text-white/75 transition"
        >
          Cancel
        </button>
        {result ? (
          <span className={`text-xs ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>{result.text}</span>
        ) : null}
      </div>
    </div>
  );
}
