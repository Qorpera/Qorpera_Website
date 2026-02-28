"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== "delete my account") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/signup");
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
      >
        Delete account
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[rgba(8,12,16,0.97)] p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Delete your account</h2>
            <p className="text-sm text-white/50 mb-4">
              This permanently deletes your account, all agents, data, and active
              subscriptions. There is no undo.
            </p>

            <p className="text-xs text-white/40 mb-2">
              Type <span className="font-mono text-white/70">delete my account</span> to confirm
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="delete my account"
              className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-rose-500/40 mb-4"
            />

            {error && (
              <p className="mb-3 text-xs text-rose-400">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setConfirm(""); setError(null); }}
                disabled={loading}
                className="wf-btn px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== "delete my account" || loading}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
