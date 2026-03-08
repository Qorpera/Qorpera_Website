"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* -- Data --------------------------------------------------------- */

const ONBOARDING_STEPS = [
  {
    time: "0 — 5 min",
    title: "Connect",
    desc: "Sign up and authenticate with your tools — HubSpot, Stripe, Gmail, Google Sheets. No configuration screens, no column mapping, no schema design. Just authenticate and go.",
    details: [
      "One-click OAuth for major platforms",
      "CSV import for custom data",
      "API connectors for specialized tools",
    ],
    color: "#2563eb",
  },
  {
    time: "5 — 10 min",
    title: "Learn",
    desc: "The AI processes your data and builds its understanding of your business. It discovers entities, properties, relationships. A contact in HubSpot and a customer in Stripe become one person with full context.",
    details: [
      "Entities resolved across systems automatically",
      "Cross-system relationships discovered",
      "A unified model you've never had before",
    ],
    color: "#0891b2",
  },
  {
    time: "10 — 20 min",
    title: "Orient",
    desc: "The AI asks about your team — who does what, who manages which accounts, who should know when things need attention. Then it asks what keeps you up at night. You describe your operational concerns in plain language.",
    details: [
      "\"We lose track of overdue invoices\"",
      "\"Sometimes customers churn and we didn't see it coming\"",
      "AI converts concerns into situation types with detection logic",
    ],
    color: "#7c3aed",
  },
  {
    time: "20 — 25 min",
    title: "Confirm",
    desc: "The AI presents its plan: \"Here's what I'll watch for. For the first two weeks, I'll show you everything I find and you tell me if I'm seeing the right things.\" Review, adjust, approve.",
    details: [
      "Situation types with detection strategies",
      "Governance rules you control",
      "Preview of the assessment workflow",
    ],
    color: "#d97706",
  },
  {
    time: "25+ min",
    title: "See",
    desc: "Situations start appearing. You see your business through the AI's eyes — cross-tool patterns, developing risks, emerging opportunities. For the first time, you have the full picture.",
    details: [
      "Real situations from your live data",
      "Full cross-system context",
      "Validate what matters — the picture gets clearer every day",
    ],
    color: "#059669",
  },
];

/* -- Components --------------------------------------------------- */

function OnboardingTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="relative">
      {/* Vertical line */}
      <div className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-[#2563eb]/30 via-[#7c3aed]/20 to-[#059669]/30" />
      <div className="space-y-10">
        {ONBOARDING_STEPS.map((step, i) => (
          <motion.div
            key={step.time}
            className="relative flex gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <div
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-sans text-[10px] font-bold"
              style={{ backgroundColor: `${step.color}15`, color: step.color }}
            >
              {i + 1}
            </div>
            <div className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold"
                  style={{ backgroundColor: `${step.color}15`, color: step.color }}
                >
                  {step.time}
                </span>
              </div>
              <h3 className="mt-3 font-sans text-base font-semibold text-[var(--ink)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)]">{step.desc}</p>
              <div className="mt-4 space-y-1.5">
                {step.details.map((d) => (
                  <div key={d} className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--ink-muted)]/40" />
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* -- Page content ------------------------------------------------- */

export function HowItWorksClient() {
  return (
    <>
      {/* Onboarding Timeline */}
      <Section label="Getting started" title="Like orienting a brilliant new hire — not configuring an enterprise platform.">
        <OnboardingTimeline />
      </Section>

      {/* Trust Gradient — Observe / Propose / Act */}
      <Section label="Trust gradient" title="Valuable from day one. More capable over time.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              Qorpera earns trust through demonstrated competence, not configuration.
              It starts by showing you what it sees. Then it starts recommending actions.
              Then — only when it has proven consistent judgment — it suggests handling
              routine situations on its own.
            </p>
          </div>
        </FadeIn>
        <StaggerGroup className="mt-10 space-y-8" stagger={0.1}>
          {[
            {
              num: "1",
              title: "Observe",
              time: "Week 1-2",
              desc: "Connect your tools. The AI watches, detects cross-system situations, and shows you what it sees — with full context. You tell it whether it's seeing the right things. This phase is immediately valuable: you're getting cross-system operational intelligence from day one.",
            },
            {
              num: "2",
              title: "Propose",
              time: "Week 2-4",
              desc: "Once the AI demonstrates it sees the right things, it begins recommending actions. \"Send a reminder to Meridian — here's why, here's the email, here's what happened last time.\" You approve, edit, or reject. Every response teaches the AI.",
            },
            {
              num: "3",
              title: "Act",
              time: "Month 2+",
              desc: "After demonstrating consistent judgment — typically 10-15 correct proposals without corrections — the AI suggests handling that situation type autonomously. You control exactly how much autonomy it earns. And you can revoke it at any time.",
            },
          ].map((phase) => (
            <StaggerItem key={phase.num}>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-glow)] font-sans text-[13px] font-semibold text-[var(--accent)]">
                    {phase.num}
                  </span>
                  <div>
                    <h3 className="font-sans text-base font-semibold text-[var(--ink)]">{phase.title}</h3>
                    <span className="font-sans text-[11px] text-[var(--ink-muted)]">{phase.time}</span>
                  </div>
                </div>
                <p className="mt-3 pl-11 text-[13px] leading-relaxed text-[var(--ink-soft)]">
                  {phase.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <FadeIn delay={0.4}>
          <div className="mt-8 rounded-xl bg-[var(--surface-warm)] px-6 py-4">
            <p className="text-[13px] leading-relaxed text-[var(--ink-soft)]">
              Most customers find the <span className="font-medium text-[var(--ink)]">&ldquo;Observe&rdquo;</span> phase
              alone is worth the investment — they see situations they would have missed
              entirely. Action authority is a bonus, not a requirement.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* What happens after */}
      <Section label="After go-live" title="The AI gets better at your business every day.">
        <FadeIn>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-8">
            <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
              <p>
                Every situation the AI detects, every assessment it makes, every outcome
                that follows — it&apos;s all recorded. Did the reminder email result in
                payment? Did the churn intervention save the customer? This feedback
                loop is what makes Qorpera fundamentally different from a monitoring tool.
              </p>
              <p>
                Dashboards are static. Qorpera learns from every decision, getting better
                at detecting what matters and understanding what works. The steady state
                is an AI that handles 80-90% of routine operational responses, with humans
                focusing on the novel, the sensitive, and the strategic — while retaining
                full visibility into everything the AI is doing.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
