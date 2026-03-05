import Link from "next/link";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[rgba(8,12,16,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <QorperaLogo className="h-9 w-auto" />
            <span className="font-heading text-[1.8rem] font-semibold tracking-[-0.02em] text-white">Qorpera</span>
          </Link>
          <nav className="flex items-center gap-1">
            {[
              { href: "/platform", label: "Platform" },
              { href: "/how-it-works", label: "How It Works" },
              { href: "/use-cases", label: "Use Cases" },
              { href: "/vision", label: "Vision" },
              { href: "/contact", label: "Contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/[0.04] hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function QorperaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="qp-streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.85" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="qp-streak2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0.45" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="50" r="28" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.85" />
      <path d="M 52 26 A 28 28 0 0 1 52 74 A 22 28 0 0 0 52 26 Z" fill="white" fillOpacity="0.08" />
      <polygon points="62,46 155,38 155,42 62,52" fill="url(#qp-streak)" />
      <polygon points="58,40 150,28 150,30 58,43" fill="url(#qp-streak2)" />
    </svg>
  );
}
