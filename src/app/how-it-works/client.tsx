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
    title: "Connect your tools",
    desc: "OAuth into HubSpot, Google Workspace, Linear, Slack — or upload a CSV. These are the systems Qorpera will watch on your behalf.",
    details: [
      "One-click OAuth for major platforms",
      "CSV import for custom data",
      "API connectors for specialized tools",
    ],
    color: "#3b82f6",
  },
  {
    time: "5 — 10 min",
    title: "See what's already there",
    desc: "Qorpera scans your connected systems, resolves entities across them, and shows you a unified map of your operation — contacts, companies, deals, and the relationships between them. Most leaders have never seen this view of their own business.",
    details: [
      "Entities resolved across systems automatically",
      "Cross-system relationships discovered",
      "A unified picture you've never had before",
    ],
    color: "#06b6d4",
  },
  {
    time: "10 — 20 min",
    title: "Tell it what matters",
    desc: "Describe the situations that matter to you in plain language: \"When a major account has rising support tickets and a renewal coming up, I need to know.\" Qorpera translates these into detection rules across all your connected systems.",
    details: [
      "Natural language situation descriptions",
      "AI suggests triggers and context automatically",
      "Set governance level per situation type",
    ],
    color: "#a855f7",
  },
  {
    time: "20 — 25 min",
    title: "Review the plan",
    desc: "Qorpera shows you the situation types it will monitor, the response strategies it proposes, and the governance rules it will follow. You approve what makes sense, adjust what doesn't.",
    details: [
      "Situation types with proposed responses",
      "Governance rules you control",
      "Preview of the approval workflow",
    ],
    color: "#f59e0b",
  },
  {
    time: "25+ min",
    title: "Start seeing clearly",
    desc: "Situations begin surfacing as they develop across your business. For the first time, you're seeing what's actually happening — not what someone told you is happening.",
    details: [
      "Real situations from your live data",
      "Full context and relationship awareness",
      "The picture gets clearer every day",
    ],
    color: "#10b981",
  },
];

const TRUST_PHASES = [
  {
    phase: "Phase 1",
    title: "Full supervision",
    desc: "Every detected situation is presented for your review. Qorpera proposes actions but never acts alone. You see exactly what it would do and why — and you decide.",
    duration: "First 1-2 weeks",
    pct: "0% autonomous",
    color: "#f43f5e",
  },
  {
    phase: "Phase 2",
    title: "Building trust",
    desc: "The system tracks how often you approve its proposals per situation type. You start to see which situations it handles reliably — and which need your judgment.",
    duration: "Weeks 2-4",
    pct: "~20% autonomous",
    color: "#f59e0b",
  },
  {
    phase: "Phase 3",
    title: "Selective delegation",
    desc: "High-accuracy situation types can be graduated to autonomous handling. You choose which ones. Novel or complex situations still surface for your decision.",
    duration: "Month 2+",
    pct: "50-70% autonomous",
    color: "#a855f7",
  },
  {
    phase: "Phase 4",
    title: "Steady state",
    desc: "80-90% of routine situations are handled autonomously. You focus on the exceptions, the strategic calls, and the new situation types. The system continues learning.",
    duration: "Ongoing",
    pct: "80-90% autonomous",
    color: "#10b981",
  },
];

/* -- Components --------------------------------------------------- */

function OnboardingTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-emerald-500/30" />
      <div className="space-y-10">
        {ONBOARDING_STEPS.map((step, i) => (
          <motion.div
            key={step.time}
            className="relative flex gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
              style={{ backgroundColor: `${step.color}15`, color: step.color }}
            >
              {i + 1}
            </div>
            <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${step.color}15`, color: step.color }}
                >
                  {step.time}
                </span>
              </div>
              <h3 className="mt-3 text-[16px] font-semibold text-white/85">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/35">{step.desc}</p>
              <div className="mt-4 space-y-1.5">
                {step.details.map((d) => (
                  <div key={d} className="flex items-start gap-2 text-[12px] text-white/30">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-white/20" />
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
      <Section label="Onboarding" title="Five steps. Twenty-five minutes. A completely different view.">
        <OnboardingTimeline />
      </Section>

      {/* Trust Gradient */}
      <Section label="Trust gradient" title="You decide how much to delegate.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              Qorpera starts fully supervised. It surfaces situations and proposes
              responses — you approve or reject. As it proves accuracy on each
              situation type, you choose what to let it handle autonomously.
              You stay in control of the graduation criteria.
            </p>
          </div>
        </FadeIn>
        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2" stagger={0.1}>
          {TRUST_PHASES.map((phase) => (
            <StaggerItem key={phase.phase}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `${phase.color}15`, color: phase.color }}
                  >
                    {phase.phase}
                  </span>
                  <span className="text-[11px] text-white/25">{phase.duration}</span>
                </div>
                <h3 className="mt-3 text-[16px] font-semibold text-white/85">{phase.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/35">{phase.desc}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: phase.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: phase.pct }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-[11px] text-white/30">{phase.pct}</span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* What happens after */}
      <Section label="After go-live" title="The picture gets clearer every day.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Every approved action teaches the system what matters to you. Every
                rejected action teaches it what doesn&apos;t. Over weeks and months,
                Qorpera becomes increasingly precise at surfacing the situations you
                actually need to see.
              </p>
              <p>
                You&apos;re not training a chatbot — you&apos;re building an operational
                intelligence layer that compounds in value. The longer it runs, the
                clearer your view of your own business becomes.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
