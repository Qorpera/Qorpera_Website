"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const detail = error.digest
    ? `Reference: ${error.digest}`
    : process.env.NODE_ENV === "development"
      ? error.message
      : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-white/50">
        {detail || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-400">
        Try again
      </button>
    </div>
  );
}
