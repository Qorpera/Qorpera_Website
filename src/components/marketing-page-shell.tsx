"use client";

import { FadeIn, AnimatedLine } from "@/components/motion-primitives";

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
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">
            {label}
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
            {title}
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-4 max-w-2xl text-lg text-[#b8c5ce]">{subtitle}</p>
        </FadeIn>
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
    <section className="py-20">
      <AnimatedLine />
      <div className="pt-12">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-wider text-white/30">
            {label}
          </p>
          <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] text-white sm:text-3xl">
            {title}
          </h2>
        </FadeIn>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
