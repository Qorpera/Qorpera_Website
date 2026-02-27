"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\s/g, "") }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Verification failed");
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
        <p className="text-sm text-zinc-400">Enter the 6-digit code from your authenticator app.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          ref={inputRef}
          className="w-full rounded-lg bg-zinc-950/60 border border-zinc-800 px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono outline-none focus:border-zinc-600"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000 000"
          autoFocus
          required
        />

        {error ? (
          <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/30 rounded-lg px-3 py-2">
            {error}
          </div>
        ) : null}

        <button
          disabled={loading || code.replace(/\s/g, "").length < 6}
          className="w-full rounded-lg bg-white text-zinc-900 font-medium py-2 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <p className="text-xs text-zinc-500 text-center">
        Open your authenticator app (Google Authenticator, Authy, 1Password, etc.)
      </p>
    </div>
  );
}
