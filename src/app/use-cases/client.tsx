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
    title: "A full sales team, not a single SDR",
    color: "from-blue-500/20 to-cyan-500/20",
    description:
      "An SDR costs $50k+/year and works alone. Your AI sales team is a group of agents working together — prospecting, researching, writing outreach, and following up in coordination.",
    agents: [
      { name: "Kai", role: "Lead agent", task: "Coordinates the team — owns pipeline, delegates research and outreach" },
      { name: "Nova", role: "Research", task: "Builds prospect briefs and competitive intelligence for the team" },
      { name: "Ava", role: "Campaigns", task: "Runs inbound campaigns that feed leads into Kai's pipeline" },
      { name: "Zoe", role: "Nurture", task: "Warms leads and keeps relationships alive post-contact" },
    ],
  },
  {
    label: "Operations & process",
    title: "A full ops team, not one coordinator",
    color: "from-emerald-500/20 to-teal-500/20",
    description:
      "SOPs, vendor tracking, inbox triage, invoices, scheduling — work that normally requires 1-2 full-time hires. Your AI ops team is a group of agents that handle it together.",
    agents: [
      { name: "Jordan", role: "Lead agent", task: "Coordinates the team — owns processes, vendors, and bottleneck alerts" },
      { name: "Sam", role: "Admin", task: "Runs inbox triage and calendar management for the team" },
      { name: "Max", role: "Finance", task: "Handles reporting, invoice matching, and anomaly detection" },
      { name: "Ren", role: "General", task: "Picks up everything that falls between the cracks" },
    ],
  },
  {
    label: "Customer experience",
    title: "A full CX team, not one support rep",
    color: "from-violet-500/20 to-purple-500/20",
    description:
      "A support rep costs $35k+/year and works 8 hours. Your AI customer team is a group of agents working together 24/7 — resolving tickets, monitoring health, and catching churn risk.",
    agents: [
      { name: "Zoe", role: "Lead agent", task: "Coordinates the team — owns client health and early churn detection" },
      { name: "Mara", role: "Support", task: "Answers tickets in your voice, around the clock" },
      { name: "Kai", role: "Expansion", task: "Identifies upsell and cross-sell opportunities" },
      { name: "Sam", role: "Scheduling", task: "Manages client meetings and follow-up cadence" },
    ],
  },
  {
    label: "Research & strategy",
    title: "A full research team, not one analyst",
    color: "from-amber-500/20 to-orange-500/20",
    description:
      "Competitor tracking, market analysis, financial modeling, SEO audits — work that's expensive to outsource and slow to do alone. Your AI research team delivers it on demand, together.",
    agents: [
      { name: "Nova", role: "Lead agent", task: "Coordinates the team — assigns research, compiles briefs, surfaces trends" },
      { name: "Max", role: "Finance", task: "Models scenarios and builds financial forecasts" },
      { name: "Sage", role: "SEO", task: "Audits visibility and writes content briefs" },
      { name: "Ava", role: "Analysis", task: "Analyzes what's converting and recommends next moves" },
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
      <Section label="Beyond the roster" title="Need a team we haven't listed?">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8 text-center">
            <FloatingDots count={8} />
            <h3 className="relative text-lg font-semibold text-white">Custom agent teams</h3>
            <p className="relative mx-auto mt-3 max-w-lg text-sm text-[#b8c5ce]">
              If a function doesn't fit the standard roster, we build a custom
              team of agents for your exact workflow — same company file, same
              learning loop, same approval rules. Any function your business needs covered.
            </p>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
