import Link from "next/link";

export function MarketingPageShell({
  label,
  title,
  subtitle,
  children,
}: {
  label: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="pb-16 pt-12 sm:pt-20">
        <p className="text-xs font-medium uppercase tracking-wider text-white/30">
          {label}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#b8c5ce]">{subtitle}</p>
      </header>
      {children}
    </div>
  );
}

export function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/[0.06] py-20">
      <p className="text-xs font-medium uppercase tracking-wider text-white/30">
        {label}
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}
