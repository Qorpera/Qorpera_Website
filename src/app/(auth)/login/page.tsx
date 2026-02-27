"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Login failed");
      if (j.requiresTwoFactor) {
        router.push(`/verify-2fa${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Zygenic</h1>
        <p className="text-sm text-zinc-400">Log in to your digital office.</p>
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
        <div className="space-y-1">
          <label className="text-sm text-zinc-300">Password</label>
          <input
            className="w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 outline-none focus:border-zinc-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
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
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <p>
          No account?{" "}
          <Link className="text-zinc-200 underline" href="/signup">
            Sign up
          </Link>
        </p>
        <Link className="text-zinc-200 underline" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
