"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const detail = error.digest
    ? `Reference: ${error.digest}`
    : process.env.NODE_ENV === "development"
      ? error.message
      : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm wf-muted">
        {detail || "An unexpected error occurred in your workspace."}
      </p>
      <button onClick={reset} className="wf-btn px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
