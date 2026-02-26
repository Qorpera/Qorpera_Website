"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Request failed");
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-zinc-400">
          If an account exists for <span className="text-zinc-200">{email}</span>, we sent a password reset link. It expires in 1 hour.
        </p>
        <Link className="text-sm text-zinc-200 underline" href="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="text-sm text-zinc-400">Enter your email and we'll send a reset link.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-zinc-300">Email</label>
          <input
            className="w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
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
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-zinc-400">
        Remember your password?{" "}
        <Link className="text-zinc-200 underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
