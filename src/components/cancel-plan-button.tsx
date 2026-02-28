"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelPlanButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Cancellation failed");
      router.refresh();
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/8 p-4 space-y-3">
        <p className="text-sm text-white/70">
          Your plan will remain active until the end of the billing period. Agents will be deactivated at that time.
        </p>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, cancel plan"}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null); }}
            disabled={loading}
            className="rounded-md border border-white/12 px-4 py-1.5 text-sm text-white/55 transition hover:text-white/80 disabled:opacity-50"
          >
            Keep plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-4 text-xs text-rose-400/60 transition hover:text-rose-400 underline-offset-2 hover:underline"
    >
      Cancel plan
    </button>
  );
}
