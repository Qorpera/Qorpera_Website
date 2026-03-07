import { QorperaLogo } from "@/components/operator-shell";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.04] py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <QorperaLogo className="h-5 w-auto" />
          <span className="text-[13px] text-white/30">Qorpera</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/25">
          <Link href="/platform" className="transition hover:text-white/50">Platform</Link>
          <Link href="/how-it-works" className="transition hover:text-white/50">How It Works</Link>
          <Link href="/use-cases" className="transition hover:text-white/50">Use Cases</Link>
          <Link href="/vision" className="transition hover:text-white/50">Vision</Link>
          <Link href="/contact" className="transition hover:text-white/50">Contact</Link>
        </nav>
        <span className="text-[12px] text-white/20">Operational intelligence for the people steering the company</span>
      </div>
    </footer>
  );
}
