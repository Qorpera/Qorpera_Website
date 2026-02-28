"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // In production, error.message may contain internal details — show digest only
  const detail = error.digest
    ? `Reference: ${error.digest}`
    : process.env.NODE_ENV === "development"
      ? error.message
      : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm wf-muted">
        {detail || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="wf-btn px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
