"use client";

import { useState } from "react";

export function CancelAgentButton({
  jobId,
  agentName,
  activeUntil,
}: {
  jobId: string;
  agentName: string;
  activeUntil: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--foreground)]/60">
          Cancel {agentName}? Active until {activeUntil}.
        </span>
        <form
          action="/api/agents/fire"
          method="post"
          onSubmit={() => setSubmitting(true)}
        >
          <input type="hidden" name="jobId" value={jobId} />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl border border-rose-800/40 bg-rose-950/20 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-950/40 hover:text-rose-200 disabled:opacity-50"
          >
            {submitting ? "Cancelling..." : "Confirm"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--foreground)]/60 transition hover:bg-white/5"
        >
          Keep
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-2xl border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-950/40 hover:text-rose-200"
    >
      Cancel subscription
    </button>
  );
}
