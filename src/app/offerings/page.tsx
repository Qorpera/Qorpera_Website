import type { Metadata } from "next";
import { MarketingPageShell, Section } from "@/components/marketing-page-shell";
import { MarketingCta } from "@/components/marketing-cta";

export const metadata: Metadata = {
  title: "Offerings | Qorpera",
  description:
    "Explore the full Qorpera platform: 9 AI agents, integrations, hybrid processing, scheduling, and the company file.",
};

const AGENTS = [
  { name: "Mara", role: "Support", desc: "Knows your products and policies. Answers customers in your voice. Sorts and replies to tickets — escalating only when needed." },
  { name: "Kai", role: "Sales", desc: "Learns who your ideal buyer is. Finds leads that match. Writes outreach that sounds like you, not a template." },
  { name: "Zoe", role: "Customer Success", desc: "Remembers every client relationship. Spots problems early. Schedules check-ins and flags renewal risks." },
  { name: "Ava", role: "Marketing", desc: "Understands your brand voice. Writes content across channels. Plans campaigns based on what's actually working." },
  { name: "Max", role: "Finance", desc: "Knows your chart of accounts. Matches invoices. Builds reports you actually use, formatted how you like them." },
  { name: "Jordan", role: "Operations", desc: "Learns your processes and documents them. Keeps vendors and tasks on track. Flags bottlenecks before they escalate." },
  { name: "Sam", role: "Exec Assistant", desc: "Knows your priorities. Manages your inbox. Writes briefings, agendas, and follow-ups the way you like them." },
  { name: "Nova", role: "Research", desc: "Understands your industry context. Digs into topics you assign. Delivers summaries tailored to your goals and decisions." },
  { name: "Sage", role: "SEO", desc: "Audits your site for technical and content gaps. Finds the right keywords. Writes content briefs that match how people search." },
];

const INTEGRATIONS = [
  { name: "Slack", desc: "Send and receive messages. Get notified about agent activity in your channels." },
  { name: "HubSpot", desc: "Create contacts, update deals, and log activities directly from agent tasks." },
  { name: "Google Workspace", desc: "Access Drive files, read Gmail, and manage Calendar events." },
  { name: "Linear", desc: "Create issues, update project status, and track engineering work." },
];

const COMPANY_FILE_FIELDS = [
  { field: "Company identity", desc: "Name, pitch, mission, values — the foundation agents build on." },
  { field: "Customers & offerings", desc: "Who you serve and what you sell. Agents reference this in every interaction." },
  { field: "Processes & rules", desc: "Approval workflows, escalation paths, and operating procedures." },
  { field: "Business documents", desc: "Upload SOPs, product sheets, pricing guides — agents read and reference them." },
];

export default function OfferingsPage() {
  return (
    <MarketingPageShell
      label="Offerings"
      title="Everything in the platform"
      subtitle="Nine AI agents, real integrations, hybrid processing, and a knowledge base that makes it all work."
    >
      {/* --- Agent Roster --- */}
      <Section label="The team" title="Agent roster">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div
              key={a.name}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="text-base font-semibold text-white group-hover:text-white">
                {a.name}
              </div>
              <div className="text-xs text-white/40">{a.role}</div>
              <p className="mt-3 text-sm text-[#b8c5ce]">{a.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --- Custom Agents --- */}
      <Section label="Extend the team" title="Custom agents">
        <div className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8">
          <h3 className="text-lg font-semibold text-white">
            Build agents for your exact workflow
          </h3>
          <p className="mt-3 max-w-2xl text-sm text-[#b8c5ce]">
            Define a custom agent with its own system instructions, tool access,
            and approval rules. It reads from the same company file as every other
            agent and learns from your corrections the same way. Use it for
            niche processes that don't fit a standard role.
          </p>
        </div>
      </Section>

      {/* --- Integrations --- */}
      <Section label="Connected" title="Integrations">
        <div className="grid gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((ig) => (
            <div
              key={ig.name}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
            >
              <h3 className="text-base font-semibold text-white">{ig.name}</h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">{ig.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --- Hybrid Processing --- */}
      <Section label="Infrastructure" title="Hybrid processing">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <div className="text-3xl font-bold text-white">~80%</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
              Local processing
            </p>
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Routine tasks run on local AI models on your infrastructure.
              Faster, cheaper, and your data stays on your machines.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <div className="text-3xl font-bold text-white">~20%</div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
              Cloud escalation
            </p>
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Complex reasoning and multi-step tasks route to cloud models when
              needed. You control the threshold.
            </p>
          </div>
        </div>
      </Section>

      {/* --- Scheduling --- */}
      <Section label="Automation" title="Scheduling">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
          <p className="text-[#b8c5ce]">
            Set agents to run on daily, weekly, or monthly schedules. Morning
            inbox triage, weekly reports, monthly audits — define the cadence and
            let agents handle the rest. Each run produces output that goes
            through the same approval flow.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Daily", "Weekly", "Monthly"].map((freq) => (
              <div
                key={freq}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center"
              >
                <div className="text-sm font-semibold text-white">{freq}</div>
                <div className="mt-1 text-xs text-white/40">
                  {freq === "Daily" && "Inbox triage, lead checks, ticket reviews"}
                  {freq === "Weekly" && "Reports, campaign summaries, pipeline updates"}
                  {freq === "Monthly" && "Audits, metric snapshots, renewal alerts"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* --- The Company File --- */}
      <Section label="Knowledge base" title="The company file">
        <div className="space-y-4">
          <p className="max-w-2xl text-[#b8c5ce]">
            Every agent reads from the same source of truth — your company file.
            It's structured data about who you are, how you operate, and what the
            rules are. Update it once and every agent picks up the change.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {COMPANY_FILE_FIELDS.map((cf) => (
              <div
                key={cf.field}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
              >
                <h3 className="text-sm font-semibold text-white">{cf.field}</h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">{cf.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <MarketingCta />
    </MarketingPageShell>
  );
}
