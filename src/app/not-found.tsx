import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">404</p>
      <h1 className="text-2xl font-semibold text-slate-100">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
