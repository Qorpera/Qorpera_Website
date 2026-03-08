"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";

/* -- Data --------------------------------------------------------- */

const SCENARIOS = [
  {
    question: "Revenue dropped 8% this month — why?",
    color: "#2563eb",
    today: "You ask your finance team. They pull a report. Maybe they notice a few lost deals. Your sales lead mentions a churning account. It takes a week to piece together a partial picture.",
    withQorpera: "Qorpera shows you the three accounts that churned, the two stalled enterprise deals, the support escalations that preceded the churn, and the invoice disputes that delayed payments — all connected, with timeline and context.",
    insight: "You don't just see that revenue is down. You see the specific situations that caused it, when they started developing, and what's still in motion.",
  },
  {
    question: "Is our biggest account about to churn?",
    color: "#7c3aed",
    today: "Your account manager says everything is fine. But they haven't connected the three support tickets this week, the delayed contract renewal, and the competitor demo the champion just attended.",
    withQorpera: "Qorpera surfaces the converging signals: rising support volume, engagement drop-off, renewal stall, and external signals — assembled into a single situation with urgency context and recommended actions.",
    insight: "You see what your account manager can't — the cross-system pattern that only becomes visible when every signal is watched simultaneously.",
  },
  {
    question: "Are we going to hit our number this quarter?",
    color: "#d97706",
    today: "Your sales lead gives you a forecast based on pipeline stages. But pipeline stages don't capture the stalled deals with no activity, the proposals waiting for legal, or the champions who changed jobs.",
    withQorpera: "Qorpera shows you the actual state of every deal: which have real momentum, which are stalled and why, which have risk signals your team hasn't flagged, and which have context changes that shift their probability.",
    insight: "Not a forecast — the actual developing situations across your pipeline, with the context to make your own judgment.",
  },
  {
    question: "What should I be worried about right now?",
    color: "#dc2626",
    today: "You don't know what you don't know. Problems surface when they become crises — a key hire resigns, a vendor contract lapses, a compliance deadline passes.",
    withQorpera: "Qorpera surfaces developing situations ranked by urgency: the contract expiring in 12 days that nobody has renewed, the vendor whose performance has degraded over three months, the support pattern that suggests a product issue.",
    insight: "Instead of reacting to crises, you see situations developing while there's still time to act. The awareness gap between you and your business shrinks to near zero.",
  },
  {
    question: "What's actually happening across our departments?",
    color: "#0891b2",
    today: "You get weekly updates from each department head. Each one tells you their version — filtered through their priorities, their tools, and what they think you want to hear.",
    withQorpera: "Qorpera gives you the cross-departmental picture: the sales deal that depends on a product fix that's blocked by an engineering bottleneck, the support trend that's actually a billing issue, the HR situation that explains the ops slowdown.",
    insight: "The situations that matter most often span departments. No single person on your team can see them — but Qorpera can.",
  },
  {
    question: "Did we actually fix that problem — or just talk about it?",
    color: "#059669",
    today: "You raised a concern in a leadership meeting two weeks ago. Someone was supposed to handle it. You're not sure if they did, and you don't want to micromanage by asking.",
    withQorpera: "Qorpera tracks situation resolution. You can see whether the underlying signals have changed: did the support tickets stop? Did the account re-engage? Did the process bottleneck clear? The data tells you — no follow-up meeting required.",
    insight: "You stop relying on people's reports about whether things improved. You see the actual state of the situation directly.",
  },
];

const BUYER_PROFILES = [
  {
    role: "CEO / Founder",
    title: "The full picture you've never had",
    desc: "You're making the biggest decisions with the most mediated view. Qorpera gives you direct operational awareness — not filtered through your team's interpretations, but drawn straight from your systems.",
    examples: "Revenue drivers, churn signals, cross-department situations, strategic risks",
    color: "#2563eb",
  },
  {
    role: "COO / VP Ops",
    title: "Cross-system intelligence in real time",
    desc: "You're responsible for operations that span dozens of tools and multiple teams. Qorpera shows you the situations developing across all of them — the ones that fall between the cracks of individual departments.",
    examples: "Process bottlenecks, vendor issues, operational risks, cross-team dependencies",
    color: "#7c3aed",
  },
  {
    role: "CFO / VP Finance",
    title: "The context behind the numbers",
    desc: "Your dashboards tell you what happened. Qorpera tells you why — connecting financial metrics to the operational situations that drive them, in real time.",
    examples: "Revenue variance analysis, cash flow risks, contract renewals, billing disputes",
    color: "#d97706",
  },
];

/* -- Page content ------------------------------------------------- */

export function UseCasesClient() {
  return (
    <>
      {/* Leadership Scenarios */}
      <Section label="Scenarios" title="The questions that keep leaders up at night.">
        <StaggerGroup className="space-y-6" stagger={0.08}>
          {SCENARIOS.map((s) => (
            <StaggerItem key={s.question}>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)]">
                <h3 className="font-sans text-[17px] font-semibold" style={{ color: s.color }}>
                  &ldquo;{s.question}&rdquo;
                </h3>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--ink-muted)]">
                      How you find out today
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--ink-muted)]">{s.today}</p>
                  </div>
                  <div>
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--ink-muted)]">
                      With Qorpera
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">{s.withQorpera}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-[var(--surface-warm)] px-4 py-3">
                  <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
                    <span className="font-medium text-[var(--ink)]">The difference: </span>
                    {s.insight}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* Who it's for */}
      <Section label="Who it's for" title="Built for the people steering the company.">
        <StaggerGroup className="grid gap-6 md:grid-cols-3" stagger={0.1}>
          {BUYER_PROFILES.map((profile) => (
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
                  <span className="text-[var(--ink-soft)]">Surfaces:</span> {profile.examples}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>
    </>
  );
}
