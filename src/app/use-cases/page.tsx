import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";

export const metadata: Metadata = {
  title: "Use Cases | Qorpera",
  description:
    "See how solo founders, e-commerce stores, service firms, and SaaS teams use Qorpera AI agents.",
};

interface UseCase {
  label: string;
  title: string;
  description: string;
  agents: { name: string; role: string; task: string }[];
}

const USE_CASES: UseCase[] = [
  {
    label: "Solo founder",
    title: "One person, full team",
    description:
      "You're running everything alone — inbox, outreach, support, research. Qorpera gives you a team that already knows your business.",
    agents: [
      { name: "Sam", role: "Exec Assistant", task: "Manages your inbox and writes briefings" },
      { name: "Mara", role: "Support", task: "Answers customers in your voice" },
      { name: "Kai", role: "Sales", task: "Finds leads and writes outreach" },
      { name: "Nova", role: "Research", task: "Digs into topics and delivers summaries" },
    ],
  },
  {
    label: "E-commerce store",
    title: "Scale without scaling headcount",
    description:
      "Tickets are piling up, invoices need chasing, and you haven't touched marketing in weeks. Your agents handle the backlog.",
    agents: [
      { name: "Mara", role: "Support", task: "Sorts and replies to support tickets" },
      { name: "Max", role: "Finance", task: "Matches invoices and builds reports" },
      { name: "Ava", role: "Marketing", task: "Writes campaigns based on what's working" },
      { name: "Sage", role: "SEO", task: "Audits your site and writes content briefs" },
    ],
  },
  {
    label: "Professional services",
    title: "Keep every client relationship warm",
    description:
      "When you're juggling clients, process documentation, scheduling, and finances — things slip. Your agents keep the plates spinning.",
    agents: [
      { name: "Zoe", role: "Customer Success", task: "Tracks client relationships and check-ins" },
      { name: "Jordan", role: "Operations", task: "Documents processes and tracks tasks" },
      { name: "Sam", role: "Exec Assistant", task: "Manages scheduling and priorities" },
      { name: "Max", role: "Finance", task: "Handles invoicing and financial reports" },
    ],
  },
  {
    label: "Growing SaaS team",
    title: "Move faster without more hires",
    description:
      "Pipeline, support, content, and market research all need attention. Your agents cover the gaps so your team can focus on building.",
    agents: [
      { name: "Kai", role: "Sales", task: "Manages pipeline and writes outreach" },
      { name: "Mara", role: "Support", task: "Handles tickets in your product's language" },
      { name: "Ava", role: "Marketing", task: "Plans campaigns and writes content" },
      { name: "Nova", role: "Research", task: "Tracks competitors and market trends" },
    ],
  },
];

export default function UseCasesPage() {
  return (
    <MarketingPageShell
      label="Use cases"
      title="Built for how you actually work"
      subtitle="Every business is different. Here's how teams like yours put Qorpera agents to work."
    >
      {USE_CASES.map((uc, i) => (
        <Section key={uc.label} label={`Scenario ${i + 1}`} title={uc.title}>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <span className="inline-block rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60">
                {uc.label}
              </span>
              <p className="text-[#b8c5ce]">{uc.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {uc.agents.map((a) => (
                <div
                  key={a.name}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                >
                  <div className="text-sm font-semibold text-white">
                    {a.name}
                  </div>
                  <div className="text-xs text-white/40">{a.role}</div>
                  <p className="mt-2 text-xs text-[#b8c5ce]">{a.task}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      ))}

      {/* Custom agents callout */}
      <Section label="Beyond the roster" title="Need something custom?">
        <div className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8 text-center">
          <h3 className="text-lg font-semibold text-white">Custom agents</h3>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#b8c5ce]">
            If your workflow doesn't fit a standard role, you can define a
            custom agent with its own instructions, tools, and approval rules.
            It still learns from your company file and gets smarter with use.
          </p>
        </div>
      </Section>

      <MarketingCta />
    </MarketingPageShell>
  );
}
