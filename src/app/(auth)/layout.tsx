import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-700/60 bg-zinc-900/45 p-7 shadow-xl">
        {children}
      </div>
    </div>
  );
}
