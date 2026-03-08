export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-10 text-center font-sans text-[13px] text-[var(--ink-muted)]">
      <p>
        <a href="mailto:jonas@qorpera.com" className="text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]">jonas@qorpera.com</a>
        {" · "}
        qorpera.com
        {" · "}
        Built in Copenhagen
      </p>
    </footer>
  );
}
