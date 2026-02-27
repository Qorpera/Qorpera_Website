"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>
        <p className="text-sm text-zinc-400">This link is missing required parameters.</p>
        <Link className="text-sm text-zinc-200 underline" href="/forgot-password">
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      let res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      // Retry once on 404 (Turbopack cold-compile can 404 on first hit)
      if (res.status === 404) {
        res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, token, password }),
        });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Reset failed");
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Password updated</h1>
        <p className="text-sm text-zinc-400">Your password has been reset. You can now log in.</p>
        <Link
          className="inline-block rounded-lg bg-white text-zinc-900 font-medium px-4 py-2"
          href="/login"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-sm text-zinc-400">
          Enter a new password for <span className="text-zinc-200">{email}</span>.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-zinc-300">New password (min 8 chars)</label>
          <input
            className="w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-zinc-300">Confirm password</label>
          <input
            className="w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            required
            minLength={8}
          />
        </div>

        {error ? (
          <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/30 rounded-lg px-3 py-2">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-white text-zinc-900 font-medium py-2 disabled:opacity-60"
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
