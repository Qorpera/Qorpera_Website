import Link from "next/link";

/* ── Reusable content primitives for doc pages ───────────────── */

export function PageHeader({
  group,
  title,
}: {
  group: string;
  title: string;
}) {
  return (
    <div className="mb-10">
      <p className="mb-1 font-sans text-[12px] font-medium text-[var(--ink-muted)]">
        {group} &rsaquo; {title}
      </p>
      <h1 className="font-sans text-[32px] font-bold leading-[1.2] tracking-[-0.5px] text-[var(--ink)]">
        {title}
      </h1>
    </div>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[15.5px] leading-[1.75] text-[var(--ink-soft)]">
      {children}
    </p>
  );
}

export function H2({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="mt-14 font-sans text-[22px] font-bold tracking-[-0.3px] text-[var(--ink)]"
    >
      {children}
    </h2>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-[14px] leading-[1.75] text-[var(--ink-muted)]">
      {children}
    </p>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 border-l-[3px] border-[var(--accent)] bg-[var(--accent-glow)] py-3.5 pl-4 pr-5">
      <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
        {children}
      </p>
    </div>
  );
}

export function DocLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--accent)] no-underline hover:underline"
    >
      {children}
    </Link>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15.5px] leading-[1.75] text-[var(--ink-soft)]">
      {children}
    </ul>
  );
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

export function Term({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[var(--surface-warm)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ink)]">
      {children}
    </code>
  );
}
