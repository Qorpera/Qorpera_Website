import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-700/60 bg-zinc-900/45 p-7 shadow-xl">
        {children}
      </div>
      <p className="mt-6 text-xs text-white/25 flex gap-4">
        <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
      </p>
    </div>
  );
}
