"use client";

import { useState } from "react";

export function ResendVerificationBanner() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mb-4 mx-auto max-w-5xl flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5">
      <p className="text-xs text-amber-300/80">
        <span className="font-medium text-amber-300">Verify your email</span>
        {" — "}
        {status === "sent"
          ? "verification email sent! Check your inbox."
          : status === "error"
            ? "failed to send email. Check Settings → Connectors for email config."
            : "check your inbox for a link from Qorpera. Unverified accounts may lose access."}
      </p>
      {status !== "sent" && (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === "sending"}
          className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Resend"}
        </button>
      )}
    </div>
  );
}
