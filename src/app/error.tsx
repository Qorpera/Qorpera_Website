"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm wf-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="wf-btn px-4 py-2 text-sm">
        Try again
      </button>
    </div>
  );
}
