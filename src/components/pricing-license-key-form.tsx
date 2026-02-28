"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PricingLicenseKeyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/plan-license-keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (res.status === 401) {
        router.push(`/login?returnTo=/pricing`);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to activate license key");
        return;
      }

      setSuccess(`Your ${data.planName} plan has been activated!`);
      setCode("");
      setTimeout(() => router.push("/agents"), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-8 text-center">
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-4 transition hover:text-teal-400 hover:decoration-teal-500/50"
        >
          Have a license key?
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="QP-XXXX-XXXX-XXXX"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-teal-500/50"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
        >
          {loading ? "Activating..." : "Activate"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-center text-sm text-teal-300">
          {success}
        </div>
      )}
    </div>
  );
}
