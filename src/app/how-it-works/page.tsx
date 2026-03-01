import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";

export const metadata: Metadata = {
  title: "How It Works | Qorpera",
  description:
    "Learn how Qorpera AI agents learn your business, follow your rules, and get smarter with every interaction.",
};

const LEARNING_CARDS = [
  {
    title: "Reads your company file",
    desc: "Every agent starts by absorbing your products, policies, tone of voice, and strategic goals.",
  },
  {
    title: "Learns from corrections",
    desc: "When you edit an agent's work before approving, it remembers the change and adjusts next time.",
  },
  {
    title: "Studies approved outputs",
    desc: "Every piece of work you sign off on becomes a reference point for future tasks.",
  },
];

const WORKFLOW_STEPS = [
  { step: "1", title: "Agent works", desc: "Your agent drafts the email, report, or response based on what it knows about your business." },
  { step: "2", title: "Queues for review", desc: "The output appears in your inbox with a clear summary of what was done and why." },
  { step: "3", title: "You approve, edit, or decline", desc: "One click to approve. Or edit inline — the agent sees exactly what you changed." },
  { step: "4", title: "Agent learns", desc: "Your feedback feeds back into the agent's understanding of how you operate." },
];

const COMPANY_FIELDS = [
  "Company name & pitch",
  "Mission & values",
  "Ideal customers",
  "Core offerings",
  "Strategic goals",
  "Departments & roles",
  "Approval rules",
  "Tools & systems",
  "Key metrics",
];

export default function HowItWorksPage() {
  return (
    <MarketingPageShell
      label="How it works"
      title="From setup to autopilot"
      subtitle="Qorpera agents don't start from scratch. You teach them your business once — then they learn more with every task you review."
    >
      {/* --- Teach your business --- */}
      <Section label="Step 1" title="Teach your business">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-[#b8c5ce]">
            <p>
              When you onboard, you fill out your Company Identity — a structured
              profile that tells agents who you are, what you sell, how you talk
              to customers, and what the rules are.
            </p>
            <p>
              This isn't a chatbot prompt. It's a living knowledge base that
              every agent on your team references before doing anything.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-white/30">
              Company identity fields
            </p>
            <ul className="space-y-2">
              {COMPANY_FIELDS.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/70"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* --- How agents learn --- */}
      <Section label="Step 2" title="How agents learn">
        <div className="grid gap-6 sm:grid-cols-3">
          {LEARNING_CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
            >
              <h3 className="text-base font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --- The approval workflow --- */}
      <Section label="Step 3" title="The approval workflow">
        <div className="space-y-4">
          {WORKFLOW_STEPS.map((s) => (
            <div
              key={s.step}
              className="flex gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-sm font-bold text-white/70">
                {s.step}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-[#b8c5ce]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* --- Getting smarter over time --- */}
      <Section label="Step 4" title="Getting smarter over time">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-white/30">
              Week 1
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Learning your basics
            </h3>
            <p className="mt-2 text-sm text-[#b8c5ce]">
              Agents rely heavily on your company file. Outputs are close but
              need frequent edits. Every correction sharpens them.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-white/30">
              Month 3
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">
              Running on pattern
            </h3>
            <p className="mt-2 text-sm text-[#b8c5ce]">
              Agents have absorbed hundreds of corrections and approvals. Most
              outputs need only a quick review before going out.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-[#b8c5ce]">
          The more you use Qorpera, the less you need to correct. Your agents
          converge on how you actually run your business.
        </p>
      </Section>

      <MarketingCta />
    </MarketingPageShell>
  );
}
