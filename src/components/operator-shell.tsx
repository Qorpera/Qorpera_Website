import Link from "next/link";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[rgba(250,250,250,0.85)] backdrop-blur-[20px]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="font-sans text-[20px] font-bold tracking-[-0.5px] text-[var(--ink)] no-underline">
            Qorpera
          </Link>
          <nav className="flex items-center gap-8">
            {[
              { href: "/how-it-works", label: "How it works" },
              { href: "/use-cases", label: "Use cases" },
              { href: "/platform", label: "Platform" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden font-sans text-sm font-medium text-[var(--ink-muted)] no-underline transition hover:text-[var(--ink)] sm:block"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="rounded-lg bg-[var(--ink)] px-5 py-2 font-sans text-sm font-semibold text-white no-underline transition hover:bg-[var(--ink-soft)]"
            >
              Request early access
            </Link>
          </nav>
        </div>
      </header>
      <main className="pt-16">{children}</main>
    </div>
  );
}
