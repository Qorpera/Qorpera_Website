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
  { name: "Slack", desc: "Send and receive messages. Get notified about agent activity in your channels.", icon: "M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" },
  { name: "HubSpot", desc: "Create contacts, update deals, and log activities directly from agent tasks.", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
  { name: "Google Workspace", desc: "Access Drive files, read Gmail, and manage Calendar events.", icon: "M22 12l-10 8L2 12l10-8z" },
  { name: "Linear", desc: "Create issues, update project status, and track engineering work.", icon: "M3 12h18M12 3l9 9-9 9" },
];

const COMPANY_FILE_FIELDS = [
  { field: "Company identity", desc: "Name, pitch, mission, values — the foundation agents build on." },
  { field: "Customers & offerings", desc: "Who you serve and what you sell. Agents reference this in every interaction." },
  { field: "Processes & rules", desc: "Approval workflows, escalation paths, and operating procedures." },
  { field: "Business documents", desc: "Upload SOPs, product sheets, pricing guides — agents read and reference them." },
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
      <Section label="The team" title="Agent roster">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {AGENTS.map((a) => (
            <StaggerItem key={a.name}>
              <AgentRosterCard {...a} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* --- Custom Agents --- */}
      <Section label="Extend the team" title="Custom agents">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-8">
            <FloatingDots count={10} />
            <div className="relative">
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
      <Section label="Infrastructure" title="Hybrid processing">
        <div className="grid gap-6 sm:grid-cols-2">
          <FadeIn>
            <HybridBar label="Local processing" percent={80} delay={0.2} />
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Routine tasks run on local AI models on your infrastructure.
              Faster, cheaper, and your data stays on your machines.
            </p>
          </FadeIn>
          <FadeIn delay={0.12}>
            <HybridBar label="Cloud escalation" percent={20} delay={0.5} />
            <p className="mt-3 text-sm text-[#b8c5ce]">
              Complex reasoning and multi-step tasks route to cloud models when
              needed. You control the threshold.
            </p>
          </FadeIn>
        </div>
      </Section>

      {/* --- Scheduling --- */}
      <Section label="Automation" title="Scheduling">
        <FadeIn>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p className="text-[#b8c5ce]">
              Set agents to run on daily, weekly, or monthly schedules. Morning
              inbox triage, weekly reports, monthly audits — define the cadence and
              let agents handle the rest. Each run produces output that goes
              through the same approval flow.
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
      <Section label="Knowledge base" title="The company file">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            Every agent reads from the same source of truth — your company file.
            It's structured data about who you are, how you operate, and what the
            rules are. Update it once and every agent picks up the change.
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
