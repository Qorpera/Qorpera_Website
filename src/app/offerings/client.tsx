"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  FloatingDots,
  GlowRing,
  CountUp,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

const AGENTS = [
  { name: "Mara", role: "Support Team", desc: "A team of agents that runs your entire support queue. Triages, replies, escalates — all coordinated, all in your voice." },
  { name: "Kai", role: "Sales Team", desc: "A team that owns your outbound pipeline. Prospecting, research, outreach, follow-up — multiple agents working the funnel together." },
  { name: "Zoe", role: "Success Team", desc: "A team that manages every client relationship. Health checks, churn alerts, check-ins, renewals — all coordinated." },
  { name: "Ava", role: "Marketing Team", desc: "A team that runs your content engine. Writing, campaigns, performance tracking — multiple agents collaborating across channels." },
  { name: "Max", role: "Finance Team", desc: "A team that handles invoices, reconciliation, and reporting end to end. Multiple agents matching, checking, and building reports together." },
  { name: "Jordan", role: "Ops Team", desc: "A team that owns your processes. SOPs, vendor tracking, bottleneck alerts — coordinated agents keeping the business running." },
  { name: "Sam", role: "Admin Team", desc: "A team that manages your inbox, calendar, and briefings. Multiple agents triaging, scheduling, and drafting in sync." },
  { name: "Nova", role: "Research Team", desc: "A team that delivers competitor intel, market analysis, and decision-ready briefs. Multiple agents researching in parallel." },
  { name: "Sage", role: "SEO Team", desc: "A team that audits your site, finds keywords, and writes content briefs. Technical and content agents working together." },
];

const INTEGRATIONS = [
  { name: "Slack", desc: "Send and receive messages. Get notified about agent activity in your channels.", icon: "M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" },
  { name: "HubSpot", desc: "Create contacts, update deals, and log activities directly from agent tasks.", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
  { name: "Google Workspace", desc: "Access Drive files, read Gmail, and manage Calendar events.", icon: "M22 12l-10 8L2 12l10-8z" },
  { name: "Linear", desc: "Create issues, update project status, and track engineering work.", icon: "M3 12h18M12 3l9 9-9 9" },
];

const COMPANY_FILE_FIELDS = [
  { field: "Company identity", desc: "Name, pitch, mission, values — the operating manual every agent team reads on day one." },
  { field: "Customers & offerings", desc: "Who you serve and what you sell. Every agent across every team references this in every interaction." },
  { field: "Processes & rules", desc: "Approval workflows, escalation paths, SOPs — your agent teams follow the same rules your human team does." },
  { field: "Business documents", desc: "Upload product sheets, pricing guides, handbooks — your agent teams read and reference them like new hires." },
];

/* ── Agent card with shimmer ──────────────────────────────────── */
function AgentRosterCard({ name, role, desc }: { name: string; role: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ borderColor: "rgba(255,255,255,0.12)" }}
    >
      {/* Shimmer sweep on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
        }}
        initial={{ x: "-100%" }}
        animate={{ x: hovered ? "100%" : "-100%" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-bold text-white/50">
            {name[0]}
          </div>
          <div>
            <div className="text-base font-semibold text-white">{name}</div>
            <div className="text-xs text-white/40">{role}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-[#b8c5ce]">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Animated bar for hybrid processing ───────────────────────── */
function HybridBar({ label, percent, delay }: { label: string; percent: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
      <GlowRing className="-right-10 -top-10 h-28 w-28" />
      <div className="relative">
        <div className="text-3xl font-bold text-white">
          <CountUp value={percent} prefix="~" suffix="%" className="text-3xl font-bold text-white" />
        </div>
        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
          {label}
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-white/15 to-white/35"
            initial={{ width: 0 }}
            animate={inView ? { width: `${percent}%` } : { width: 0 }}
            transition={{ duration: 1.2, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Page content ──────────────────────────────────────────────── */

export function OfferingsClient() {
  return (
    <>
      {/* --- Agent Roster --- */}
      <Section label="The workforce" title="Agent teams you can hire">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {AGENTS.map((a) => (
            <StaggerItem key={a.name}>
              <AgentRosterCard {...a} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* --- Custom Agents --- */}
      <Section label="Any function" title="Custom agent teams">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8">
            <FloatingDots count={10} />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">
                Build a team for any function in your business
              </h3>
              <p className="mt-3 max-w-2xl text-sm text-[#b8c5ce]">
                Need a function that doesn't fit the standard roster? We build
                custom agent teams for your exact workflows — same company file,
                same learning loop, same approval rules. Any function you need
                covered, with agents that collaborate.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* --- Integrations --- */}
      <Section label="Connected" title="Integrations">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2" stagger={0.08}>
          {INTEGRATIONS.map((ig) => (
            <StaggerItem key={ig.name}>
              <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <svg className="h-4 w-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ig.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">{ig.name}</h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">{ig.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* --- Hybrid Processing --- */}
      <Section label="Why it's so cheap" title="Hybrid processing">
        <div className="grid gap-6 sm:grid-cols-2">
          <FadeIn>
            <HybridBar label="Handled locally" percent={80} delay={0.2} />
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Most work runs on efficient local models — fast, private, and
              practically free. This is why your AI workforce costs a fraction
              of a human hire.
            </p>
          </FadeIn>
          <FadeIn delay={0.12}>
            <HybridBar label="Cloud escalation" percent={20} delay={0.5} />
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Complex reasoning and high-stakes tasks route to cloud models
              automatically. You get premium intelligence only when it's needed.
            </p>
          </FadeIn>
        </div>
      </Section>

      {/* --- Scheduling --- */}
      <Section label="Automation" title="They work on your schedule">
        <FadeIn>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="text-[#b8c5ce]">
              Set your agent teams to run on daily, weekly, or monthly schedules.
              Morning inbox triage, weekly reports, monthly audits — define the
              cadence and your teams handle the rest. Like having departments
              that never need reminding.
            </p>
            <StaggerGroup className="mt-6 grid gap-3 sm:grid-cols-3" stagger={0.1}>
              {[
                { freq: "Daily", tasks: "Inbox triage, lead checks, ticket reviews" },
                { freq: "Weekly", tasks: "Reports, campaign summaries, pipeline updates" },
                { freq: "Monthly", tasks: "Audits, metric snapshots, renewal alerts" },
              ].map((s) => (
                <StaggerItem key={s.freq}>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center transition-colors hover:border-white/[0.10] hover:bg-white/[0.04]">
                    <div className="text-sm font-semibold text-white">{s.freq}</div>
                    <div className="mt-1 text-xs text-white/40">{s.tasks}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </FadeIn>
      </Section>

      {/* --- The Company File --- */}
      <Section label="Knowledge base" title="The operating manual">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            Every agent across every team reads from the same source of truth — your company file.
            Think of it as the employee handbook for your AI workforce. Update it
            once and every team picks up the change instantly.
          </p>
        </FadeIn>
        <StaggerGroup className="mt-6 grid gap-4 sm:grid-cols-2" stagger={0.08}>
          {COMPANY_FILE_FIELDS.map((cf) => (
            <StaggerItem key={cf.field}>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
                <h3 className="text-sm font-semibold text-white">{cf.field}</h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">{cf.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>
    </>
  );
}
