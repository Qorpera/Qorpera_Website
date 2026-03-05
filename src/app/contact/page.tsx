import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { MarketingFooter } from "@/components/marketing-footer";

export const metadata: Metadata = {
  title: "Contact — Qorpera",
  description: "Get in touch with the Qorpera team to see how AI-driven situation detection can transform your operations.",
};

export default function ContactPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-0 h-[500px] w-[500px] rounded-full bg-purple-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.1fr]">
          {/* Left — Info */}
          <div className="pt-4">
            <h1 className="text-4xl font-medium tracking-[-0.03em] text-white">
              Let&apos;s talk about your
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
                operations
              </span>
            </h1>

            <p className="mt-5 text-[15px] leading-relaxed text-white/45">
              Qorpera works with companies on a contract basis. Tell us about your business and
              we&apos;ll show you how situation-driven AI can detect what matters and act on it — within 25 minutes.
            </p>

            <div className="mt-10 space-y-6">
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                title="Personalized Demo"
                description="Connect your tools live and see the situations Qorpera detects in your actual operations."
              />
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                }
                title="Custom Implementation"
                description="We configure situation types, governance rules, and integrations tailored to your workflows."
              />
              <InfoRow
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                }
                title="Governed from Day One"
                description="Full audit trails, trust gradient, and human-in-the-loop approval — AI earns autonomy, you stay in control."
              />
            </div>
          </div>

          {/* Right — Form */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
            <h2 className="text-lg font-semibold text-white">Get in Touch</h2>
            <p className="mt-1 text-[13px] text-white/35">
              Fill out the form and our team will get back to you within one business day.
            </p>
            <ContactForm />
          </div>
        </div>
      </div>

      {/* Footer */}
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
        {icon}
      </div>
      <div>
        <h3 className="text-[14px] font-medium text-white/80">{title}</h3>
        <p className="mt-0.5 text-[13px] text-white/35">{description}</p>
      </div>
    </div>
  );
}
