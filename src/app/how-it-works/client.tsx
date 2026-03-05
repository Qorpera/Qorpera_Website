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
    desc: "OAuth into HubSpot, Google Workspace, Linear, Slack — or upload a CSV. No config files, no mapping tables. Just authenticate and go.",
    details: [
      "One-click OAuth for major platforms",
      "CSV import for custom data",
      "API connectors for specialized tools",
    ],
    color: "#3b82f6",
  },
  {
    time: "5 — 10 min",
    title: "AI presents its findings",
    desc: "Qorpera scans your connected systems and builds a knowledge graph. It shows you the entities it found, the relationships it discovered, and a statistical overview of your operations.",
    details: [
      "Entities resolved across systems automatically",
      "Relationship graph visualized",
      "Statistical summary of your operational data",
    ],
    color: "#06b6d4",
  },
  {
    time: "10 — 20 min",
    title: "Teach it your pain points",
    desc: "Describe the situations that matter to your business in plain language: \"When an invoice is 30 days overdue and the customer has an open support ticket, flag it.\" Qorpera translates these into detection rules.",
    details: [
      "Natural language situation descriptions",
      "AI suggests triggers and context automatically",
      "Set governance level per situation type",
    ],
    color: "#a855f7",
  },
  {
    time: "20 — 25 min",
    title: "AI presents its plan",
    desc: "Qorpera shows you the situation types it will monitor, the response strategies it proposes, and the governance rules it will follow. Review, adjust, and approve.",
    details: [
      "Situation types with proposed response strategies",
      "Governance rules per situation type",
      "Preview of what approval workflows will look like",
    ],
    color: "#f59e0b",
  },
  {
    time: "25+ min",
    title: "Go live",
    desc: "Situations start appearing as they're detected. You approve or reject each one. The system learns from your decisions and improves over time.",
    details: [
      "Real situations from your live data",
      "Approve/reject with full context",
      "Accuracy tracking begins immediately",
    ],
    color: "#10b981",
  },
];

const TRUST_PHASES = [
  {
    phase: "Phase 1",
    title: "Full supervision",
    desc: "Every detected situation is presented for your approval. AI proposes actions but never acts alone. You see exactly what it would do and why.",
    duration: "First 1-2 weeks",
    pct: "0% autonomous",
    color: "#f43f5e",
  },
  {
    phase: "Phase 2",
    title: "Accuracy tracking",
    desc: "The system tracks your approval rate per situation type. Types where you consistently approve build a track record. You start to see which situations the AI handles reliably.",
    duration: "Weeks 2-4",
    pct: "~20% autonomous",
    color: "#f59e0b",
  },
  {
    phase: "Phase 3",
    title: "Graduated autonomy",
    desc: "High-accuracy situation types are flagged for graduation. You choose which ones to let the AI handle autonomously. Novel or complex situations still require approval.",
    duration: "Month 2+",
    pct: "50-70% autonomous",
    color: "#a855f7",
  },
  {
    phase: "Phase 4",
    title: "Steady state",
    desc: "80-90% of routine situations are handled autonomously. You focus on exceptions, strategy, and new situation types. The system continues learning and improving.",
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
      <Section label="Onboarding" title="Five steps. Twenty-five minutes. Fully operational.">
        <OnboardingTimeline />
      </Section>

      {/* Trust Gradient */}
      <Section label="Trust gradient" title="AI earns autonomy. You stay in control.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              Qorpera doesn&apos;t start with autonomy — it starts with full supervision.
              As the AI proves its accuracy on each situation type, it earns the right
              to act independently. You control the graduation criteria.
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
      <Section label="After go-live" title="The system gets better at your business every day.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Every approved action teaches the system what good looks like. Every rejected
                action teaches it what to avoid. Over weeks and months, Qorpera becomes
                increasingly accurate at handling the routine situations that consume
                your team&apos;s time.
              </p>
              <p>
                You&apos;re not training a chatbot — you&apos;re building an operational
                intelligence layer that compounds in value. New situation types can be added
                anytime. The trust gradient applies to each one independently.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
