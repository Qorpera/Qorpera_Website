import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "Contact — Qorpera",
  description: "Request early access to Qorpera. We'll connect your tools and show you the situations Qorpera finds — live, on your data.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-20">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr]">
          {/* Left — Info */}
          <div className="pt-4">
            <h1 className="font-sans text-4xl font-bold tracking-[-0.5px] text-[var(--ink)]">
              See your own
              <br />
              <span className="text-[var(--accent)]">business clearly.</span>
            </h1>

            <p className="mt-5 text-[15px] leading-relaxed text-[var(--ink-soft)]">
              We&apos;ll connect your tools, show you the situations Qorpera finds
              in your data, and walk through what you&apos;ve been missing — live,
              on your business.
            </p>

            <div className="mt-10 space-y-6">
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                title="Live on Your Data"
                description="We connect your actual tools and show you the situations Qorpera finds — in your data, not a demo environment."
              />
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                }
                title="Your Concerns, Your Language"
                description="Tell us what keeps you up at night. The AI converts your operational concerns into situation detection — no configuration required."
              />
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                }
                title="You Stay in Control"
                description="Full audit trails, trust gradient, and human-in-the-loop approval. The AI earns autonomy — you decide how much to delegate."
              />
            </div>
          </div>

          {/* Right — Form */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8">
            <h2 className="font-sans text-lg font-semibold text-[var(--ink)]">Request Early Access</h2>
            <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
              Fill out the form and our team will get back to you within one business day.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}

function InfoRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-glow)] text-[var(--accent)]">
        {icon}
      </div>
      <div>
        <h3 className="font-sans text-sm font-medium text-[var(--ink)]">{title}</h3>
        <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">{description}</p>
      </div>
    </div>
  );
}
