"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";

/* -- Data --------------------------------------------------------- */

const WORK_TAKEOVERS = [
  {
    area: "Accounts receivable",
    color: "#2563eb",
    today: "Someone checks overdue invoices, looks up account context in the CRM, writes a follow-up email, logs the activity, sets a reminder. Every week. For every invoice.",
    withQorpera: "Qorpera sees the overdue invoice, pulls the full customer context — support history, email sentiment, contract status — writes a follow-up that reflects the actual relationship, sends it, and logs everything. If the account looks like a churn risk, it escalates instead of following up.",
    byproduct: "You stop chasing invoices. You also discover which late payments are routine and which are early warning signs — because the system that handles them understands the difference.",
  },
  {
    area: "Pipeline management",
    color: "#7c3aed",
    today: "Your sales lead manually reviews deals, checks for activity, nudges reps about stalled opportunities. Pipeline reviews happen weekly — by which time deals have been dead for days.",
    withQorpera: "Qorpera monitors every deal continuously. It detects stalls, flags missing follow-ups, notices when a champion goes quiet or changes roles, and drafts the next-step email for the rep. Deals don't die silently anymore.",
    byproduct: "Your pipeline forecast becomes real — not because someone built a better dashboard, but because the system working your deals knows exactly where each one stands.",
  },
  {
    area: "Customer health",
    color: "#d97706",
    today: "Account managers track their own book of business using gut feel and whatever they remember from last week. Churn signals get noticed when they become cancellation requests.",
    withQorpera: "Qorpera watches every signal across every account — support tickets, email tone, usage patterns, payment behavior, contract timelines. When signals converge, it acts: sends a check-in, books a call, or escalates to leadership before the customer is gone.",
    byproduct: "You see every account's health in real time. Not because someone built a health score — because the AI working those accounts is continuously assessing them.",
  },
  {
    area: "Meeting preparation",
    color: "#dc2626",
    today: "Before every customer call, someone spends 15–30 minutes pulling data from the CRM, checking recent emails, scanning support tickets, reviewing the last invoice. Or they wing it.",
    withQorpera: "Qorpera assembles the briefing automatically — recent interactions, open issues, payment status, deal stage, sentiment trajectory — and has it ready before the meeting starts. Every call, every time, without anyone asking.",
    byproduct: "Your team walks into every meeting fully prepared. You also notice patterns across customers that only become visible when every interaction is being tracked and synthesized.",
  },
  {
    area: "CRM hygiene",
    color: "#0891b2",
    today: "Reps are supposed to update the CRM after every interaction. They don't. Data decays. Reports become unreliable. Someone periodically does a cleanup sprint that lasts a week.",
    withQorpera: "Qorpera reads email conversations, extracts the relevant updates, and writes them back to the CRM — contact changes, deal progress, next steps, notes. Automatically. After every interaction.",
    byproduct: "Your CRM becomes a source of truth for the first time. Not because you enforced a process — because the AI that works your deals keeps its own records current.",
  },
  {
    area: "Operational reporting",
    color: "#059669",
    today: "Every Monday, someone assembles a report from five different tools. It takes hours. By the time leadership reads it, the data is stale and the context is missing.",
    withQorpera: "Qorpera generates operational summaries continuously — not by aggregating numbers, but by describing what actually happened, what changed, and what needs attention. Delivered when you want them, in the format you want.",
    byproduct: "Leadership gets an unmediated view of the business. Not filtered through what each department chooses to report — drawn directly from the systems where work happens.",
  },
];

const WHO_ITS_FOR = [
  {
    role: "CEO / Founder",
    title: "Your business runs while you focus on strategy",
    desc: "The routine operations that eat your team's time — follow-ups, updates, monitoring, reporting — get handled automatically. And because the AI doing the work sees everything, you get the operational awareness that used to require a dozen meetings.",
    handles: "Invoice follow-ups, customer health monitoring, operational reporting, cross-department awareness",
    color: "#2563eb",
  },
  {
    role: "COO / VP Ops",
    title: "Operations that coordinate themselves",
    desc: "The work that falls between departments — the handoffs, the follow-ups, the things that need someone to notice and act — Qorpera handles it. Your role shifts from coordinator to policy-maker.",
    handles: "Process automation, cross-team handoffs, vendor management, contract renewals, bottleneck resolution",
    color: "#7c3aed",
  },
  {
    role: "CFO / VP Finance",
    title: "Financial operations with context and judgment",
    desc: "Collections, renewals, dispute resolution, variance analysis — done automatically, but with the full business context that turns a generic template into the right action at the right time.",
    handles: "AR automation, renewal management, billing dispute resolution, cash flow monitoring, financial reporting",
    color: "#d97706",
  },
];

/* -- Page content ------------------------------------------------- */

export function UseCasesClient() {
  return (
    <>
      {/* Work takeovers */}
      <Section label="What it takes over" title="The routine work your team does manually — handled.">
        <StaggerGroup className="space-y-6" stagger={0.08}>
          {WORK_TAKEOVERS.map((w) => (
            <StaggerItem key={w.area}>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)]">
                <h3 className="font-sans text-[17px] font-semibold" style={{ color: w.color }}>
                  {w.area}
                </h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--ink-muted)]">
                      How it works today
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--ink-muted)]">{w.today}</p>
                  </div>
                  <div>
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--ink-muted)]">
                      With Qorpera
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">{w.withQorpera}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-[var(--surface-warm)] px-4 py-3">
                  <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                    <span className="font-medium text-[var(--ink)]">The byproduct: </span>
                    {w.byproduct}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* Who it's for */}
      <Section label="Who it's for" title="Built for the people who want their business to run itself.">
        <StaggerGroup className="grid gap-6 md:grid-cols-3" stagger={0.1}>
          {WHO_ITS_FOR.map((profile) => (
            <StaggerItem key={profile.role}>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)]">
                <span
                  className="rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold"
                  style={{ backgroundColor: `${profile.color}15`, color: profile.color }}
                >
                  {profile.role}
                </span>
                <h3 className="mt-3 font-sans text-base font-semibold text-[var(--ink)]">{profile.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">{profile.desc}</p>
                <p className="mt-3 text-xs text-[var(--ink-muted)]">
                  <span className="text-[var(--ink-soft)]">Handles:</span> {profile.handles}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>
    </>
  );
}
