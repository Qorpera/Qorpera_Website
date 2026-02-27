"use client";

import { useState } from "react";

type State =
  | { phase: "idle" }
  | { phase: "setup"; qrDataUrl: string; secret: string }
  | { phase: "enabled" }
  | { phase: "disabling" };

export function TwoFactorSetup({ initialEnabled }: { initialEnabled: boolean }) {
  const [state, setState] = useState<State>(
    initialEnabled ? { phase: "enabled" } : { phase: "idle" },
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/setup");
      const data = (await res.json()) as { qrDataUrl?: string; secret?: string; error?: string };
      if (!res.ok || !data.qrDataUrl || !data.secret) throw new Error(data.error || "Setup failed");
      setState({ phase: "setup", qrDataUrl: data.qrDataUrl, secret: data.secret });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\s/g, "") }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Enable failed");
      setState({ phase: "enabled" });
      setCode("");
      setSuccess("Two-factor authentication is now enabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enable failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\s/g, "") }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Disable failed");
      setState({ phase: "idle" });
      setCode("");
      setSuccess("Two-factor authentication has been disabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Disable failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="py-6 border-b border-white/[0.07]">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wider text-white/35">Two-factor authentication</div>
        {state.phase === "enabled" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/40">
            Disabled
          </span>
        )}
      </div>

      {success ? (
        <div className="mb-4 rounded-md border border-teal-500/20 bg-teal-500/10 px-3 py-2.5 text-sm text-teal-300">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Idle — not enabled */}
      {state.phase === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-white/45">
            Add an extra layer of security. You&apos;ll need your authenticator app each time you log in.
          </p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="wf-btn px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy ? "Loading…" : "Enable 2FA"}
          </button>
        </div>
      )}

      {/* Setup — show QR */}
      {state.phase === "setup" && (
        <div className="space-y-5">
          <p className="text-sm text-white/45">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password…), then enter the 6-digit code to confirm.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.qrDataUrl} alt="TOTP QR code" width={180} height={180} className="rounded-lg" />
            </div>
            <div className="space-y-3 min-w-0">
              <div>
                <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Manual entry key</div>
                <code className="block rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono tracking-widest break-all">
                  {state.secret}
                </code>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-white/40">Enter the 6-digit code to confirm</label>
                <div className="flex gap-2">
                  <input
                    className="w-36 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-center text-lg font-mono tracking-[0.3em] outline-none focus:border-teal-500/40"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 7))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000 000"
                    autoFocus
                  />
                  <button
                    onClick={confirmEnable}
                    disabled={busy || code.replace(/\s/g, "").length < 6}
                    className="wf-btn px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {busy ? "Verifying…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => { setState({ phase: "idle" }); setCode(""); setError(null); }}
                    disabled={busy}
                    className="wf-btn-muted px-3 py-2 text-sm disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enabled */}
      {state.phase === "enabled" && (
        <div className="space-y-3">
          <p className="text-sm text-white/45">
            Your account is protected with an authenticator app. You&apos;ll be prompted for a code on every login.
          </p>
          <button
            onClick={() => { setState({ phase: "disabling" }); setCode(""); setError(null); setSuccess(null); }}
            className="wf-btn-muted px-4 py-2 text-sm"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {/* Disabling — confirm with code */}
      {state.phase === "disabling" && (
        <div className="space-y-3">
          <p className="text-sm text-white/45">Enter your current authenticator code to disable 2FA.</p>
          <div className="flex gap-2">
            <input
              className="w-36 rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-center text-lg font-mono tracking-[0.3em] outline-none focus:border-rose-500/40"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, "").slice(0, 7))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000 000"
              autoFocus
            />
            <button
              onClick={confirmDisable}
              disabled={busy || code.replace(/\s/g, "").length < 6}
              className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/15 disabled:opacity-60 transition-colors"
            >
              {busy ? "Disabling…" : "Disable"}
            </button>
            <button
              onClick={() => { setState({ phase: "enabled" }); setCode(""); setError(null); }}
              disabled={busy}
              className="wf-btn-muted px-3 py-2 text-sm disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
