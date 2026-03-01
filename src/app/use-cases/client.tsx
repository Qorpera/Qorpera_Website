"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  FloatingDots,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

interface UseCase {
  label: string;
  title: string;
  description: string;
  color: string;
  agents: { name: string; role: string; task: string }[];
}

const USE_CASES: UseCase[] = [
  {
    label: "Sales & outreach",
    title: "From lead to conversation, handled",
    color: "from-blue-500/20 to-cyan-500/20",
    description:
      "Finding leads, researching prospects, writing outreach, following up — your agents handle the full pipeline so opportunities don't slip through the cracks.",
    agents: [
      { name: "Kai", role: "Sales Rep", task: "Finds leads, scores them, and writes personalized outreach" },
      { name: "Nova", role: "Research Analyst", task: "Digs into prospects, industries, and competitors" },
      { name: "Ava", role: "Marketing", task: "Creates campaigns and content that drive inbound" },
      { name: "Zoe", role: "Customer Success", task: "Follows up with warm leads and nurtures relationships" },
    ],
  },
  {
    label: "Operations & process",
    title: "The work behind the work, automated",
    color: "from-emerald-500/20 to-teal-500/20",
    description:
      "SOPs, vendor tracking, inbox triage, invoices, scheduling — the operational load that keeps you from focusing on growth. Your agents take it on.",
    agents: [
      { name: "Jordan", role: "Operations", task: "Documents processes, tracks vendors, flags blockers" },
      { name: "Sam", role: "Exec Assistant", task: "Triages your inbox and manages scheduling" },
      { name: "Max", role: "Finance", task: "Builds reports, matches invoices, spots anomalies" },
      { name: "Ren", role: "Assistant", task: "Handles everything else that falls through the cracks" },
    ],
  },
  {
    label: "Customer experience",
    title: "Every customer feels like your only customer",
    color: "from-violet-500/20 to-purple-500/20",
    description:
      "Check-ins, support tickets, churn risk, upsell moments — your agents keep every relationship warm without you having to remember.",
    agents: [
      { name: "Zoe", role: "Customer Success", task: "Monitors client health and catches churn risk early" },
      { name: "Mara", role: "Support", task: "Answers questions in your voice, around the clock" },
      { name: "Kai", role: "Sales Rep", task: "Spots upsell and expansion opportunities" },
      { name: "Sam", role: "Exec Assistant", task: "Keeps client meetings and follow-ups on track" },
    ],
  },
  {
    label: "Research & strategy",
    title: "Decisions backed by data, not guesswork",
    color: "from-amber-500/20 to-orange-500/20",
    description:
      "Competitor moves, market trends, financial forecasts, content gaps — your agents surface what matters so you can act on it.",
    agents: [
      { name: "Nova", role: "Research Analyst", task: "Tracks competitors, surfaces trends, delivers briefs" },
      { name: "Max", role: "Finance", task: "Models scenarios and builds financial forecasts" },
      { name: "Sage", role: "SEO", task: "Audits visibility and writes content briefs" },
      { name: "Ava", role: "Marketing", task: "Analyzes what's working and recommends next moves" },
    ],
  },
];

/* ── Agent card with hover animation ──────────────────────────── */
function AgentCard({ name, role, task }: { name: string; role: string; task: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/60">
            {name[0]}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{name}</div>
            <div className="text-[10px] text-white/40">{role}</div>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-[#b8c5ce]">{task}</p>
      </div>
    </motion.div>
  );
}

/* ── Page content ──────────────────────────────────────────────── */

export function UseCasesClient() {
  return (
    <>
      {USE_CASES.map((uc, i) => (
        <Section key={uc.label} label={uc.label} title={uc.title}>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <FadeIn>
              <div className="space-y-4">
                <span className={`inline-block rounded-full bg-gradient-to-r ${uc.color} border border-white/[0.08] px-3 py-1 text-xs font-medium text-white/70`}>
                  {uc.label}
                </span>
                <p className="text-[#b8c5ce]">{uc.description}</p>
              </div>
            </FadeIn>
            <StaggerGroup className="grid gap-3 sm:grid-cols-2" stagger={0.08}>
              {uc.agents.map((a) => (
                <StaggerItem key={a.name}>
                  <AgentCard {...a} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </Section>
      ))}

      {/* Custom agents callout */}
      <Section label="Beyond the roster" title="Need something custom?">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8 text-center">
            <FloatingDots count={8} />
            <h3 className="relative text-lg font-semibold text-white">Custom agents</h3>
            <p className="relative mx-auto mt-3 max-w-lg text-sm text-[#b8c5ce]">
              If your workflow doesn't fit a standard role, you can define a
              custom agent with its own instructions, tools, and approval rules.
              It still learns from your company file and gets smarter with use.
            </p>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
