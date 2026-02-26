"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm wf-muted">
        {error.message || "An unexpected error occurred in your workspace."}
      </p>
      <button onClick={reset} className="wf-btn px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
