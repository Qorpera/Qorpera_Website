import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";

export const metadata: Metadata = {
  title: "Qorpera Explained",
  description:
    "Why generic AI falls short for business, and how Qorpera builds AI that actually learns how you operate.",
};

const TWIN_CARDS = [
  {
    title: "Your Customers",
    desc: "Who they are, what they buy, how they talk, what matters to them. Every agent interaction draws from this.",
  },
  {
    title: "Your Processes",
    desc: "How work gets done — approval chains, escalation paths, SOPs. Agents follow the same rules your team does.",
  },
  {
    title: "Your Standards",
    desc: "Tone of voice, formatting preferences, quality bars. Agents don't just do the work — they do it your way.",
  },
];

export default function AboutPage() {
  return (
    <MarketingPageShell
      label="Qorpera explained"
      title="AI that learns your business"
      subtitle="Most AI tools give you a blank prompt and wish you luck. Qorpera starts with your business and builds from there."
    >
      {/* --- The problem --- */}
      <Section label="The gap" title="Why generic AI falls short">
        <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
          <p>
            General-purpose AI doesn't know your customers, your products, or
            your rules. Every time you use it, you're starting from zero —
            re-explaining context, correcting tone, fixing details.
          </p>
          <p>
            The result: AI that's fast but wrong. Outputs that need so much
            editing they barely save time. A tool that never gets better no
            matter how much you use it.
          </p>
        </div>
      </Section>

      {/* --- AI that learns your business --- */}
      <Section label="The approach" title="Start with what you know">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-[#b8c5ce]">
            <p>
              Qorpera flips the model. Instead of starting with AI and trying to
              bolt on business context, we start with your business and give it
              AI capabilities.
            </p>
            <p>
              You create a company file — a structured profile of your business
              identity, customers, processes, and standards. Every agent reads
              from it. When they draft an email, build a report, or answer a
              customer, they already know the context.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
              How agents internalize your rules
            </p>
            <ol className="space-y-3">
              {[
                "Read your company file before every task",
                "Reference uploaded business documents",
                "Apply your approval rules and escalation paths",
                "Adapt tone and formatting to your standards",
                "Incorporate corrections from previous reviews",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm text-[#b8c5ce]"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-[10px] font-bold text-white/60">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* --- The digital twin --- */}
      <Section label="The model" title="A digital twin of your business">
        <div className="space-y-6">
          <p className="max-w-2xl text-[#b8c5ce]">
            Over time, Qorpera builds a working model of how your business
            operates — not a copy, but a reflection that gets clearer with every
            interaction.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {TWIN_CARDS.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
              >
                <h3 className="text-base font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* --- Human in the loop --- */}
      <Section label="Trust" title="Nothing happens without your OK">
        <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
          <p>
            Every agent output goes through your inbox before it reaches anyone.
            You review, approve, edit, or decline. There are no autonomous
            customer-facing actions.
          </p>
          <p>
            When you do edit, the correction isn't wasted. The agent sees exactly
            what you changed and why, and uses that to do better next time.
            Over weeks, you'll find yourself editing less and approving more.
          </p>
        </div>
      </Section>

      {/* --- Getting smarter --- */}
      <Section label="Trajectory" title="Getting smarter, not just faster">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                Feedback loops
              </h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">
                Every approval, every edit, every correction feeds back into the
                agent's understanding. Patterns emerge. Your agents learn which
                customers need formal language, which reports need charts, which
                tickets can be resolved with a template.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Continuous improvement
              </h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">
                Unlike a hire that plateaus, your AI workforce keeps compounding.
                The company file grows. Corrections accumulate. Approval rates
                climb. What starts as a useful tool becomes an indispensable
                part of how you operate.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <MarketingCta />
    </MarketingPageShell>
  );
}
