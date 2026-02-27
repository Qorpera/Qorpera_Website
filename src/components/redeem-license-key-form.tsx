"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RedeemLicenseKeyForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ planName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/plan-license-keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to redeem license key");
        return;
      }
      setSuccess({ planName: data.planName });
      setCode("");
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
      <h3 className="mb-1 text-sm font-semibold text-white/70">Redeem License Key</h3>
      <p className="mb-4 text-xs text-white/40">
        Enter your license key to activate a plan on your account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm tracking-widest text-white/80 placeholder:text-white/25 placeholder:tracking-normal outline-none focus:border-teal-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.trim().length < 4}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
        >
          {loading ? "Redeeming…" : "Redeem"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-teal-500/25 bg-teal-500/8 px-4 py-3">
          <div className="text-sm font-semibold text-teal-300">Plan activated!</div>
          <div className="mt-0.5 text-xs text-teal-400/70">
            Your <span className="font-medium text-teal-300">{success.planName}</span> plan is now active.
          </div>
        </div>
      )}
    </div>
  );
}
