"use client";

import Link from "next/link";
import { HeroParticleCanvas } from "./hero-particle-canvas";
import { TiltCard } from "./tilt-card";
import { ProductMock } from "./product-mock";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  SectionDivider,
  GlowRing,
  StepConnector,
} from "./motion-primitives";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

const AGENTS = [
  { name: "Mara", role: "Support Team", tasks: "A team of agents that runs your entire support queue — triaging, replying, escalating — all in your voice" },
  { name: "Kai", role: "Sales Team", tasks: "A team that owns your outbound pipeline — finding leads, researching prospects, writing outreach, following up" },
  { name: "Zoe", role: "Success Team", tasks: "A team that owns every client relationship — health checks, churn alerts, renewals, upsells" },
  { name: "Ava", role: "Marketing Team", tasks: "A team that runs your content engine — writing, planning campaigns, tracking what converts" },
  { name: "Max", role: "Finance Team", tasks: "A team that handles invoices, reconciliation, reporting, and anomaly detection end to end" },
  { name: "Jordan", role: "Ops Team", tasks: "A team that manages processes, vendors, and SOPs — keeping the business running without your input" },
  { name: "Sam", role: "Admin Team", tasks: "A team that owns your inbox, calendar, and briefings — nothing falls through the cracks" },
  { name: "Nova", role: "Research Team", tasks: "A team that delivers competitor intel, market analysis, and decision-ready briefs on demand" },
  { name: "Sage", role: "SEO Team", tasks: "A team that audits your site, finds keywords, and writes content briefs — full SEO coverage" },
];

const STEPS = [
  {
    n: "01",
    title: "Name the functions you need covered",
    body: "Tell Qorpera about your company — customers, products, processes, tone. This becomes the operating manual your agent teams follow from day one.",
  },
  {
    n: "02",
    title: "Your agent teams start working",
    body: "Pre-built teams of agents plug into the tools you already use — email, Slack, your CRM — and start handling real responsibilities, not just tasks.",
  },
  {
    n: "03",
    title: "You stay in the driver's seat",
    body: "Nothing goes out without your sign-off. Every correction makes them better. Over weeks, you'll spend less time reviewing and more time growing.",
  },
];

const BENEFITS = [
  {
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    title: "Each function gets a full team",
    body: "Not one bot per task — a coordinated team of agents per function. Your sales team prospects, researches, writes, and follows up together. Your support team triages, replies, and escalates in sync.",
  },
  {
    icon: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
    title: "Your advantage compounds",
    body: "Every correction, every approval builds a training history that's yours alone. Competitors who start later can never buy their way to where you'll be.",
  },
  {
    icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    title: "Nothing happens without your OK",
    body: "Every output goes through your inbox before it reaches anyone. You approve, edit, or decline — and every correction makes the next output better.",
  },
];

const PLANS = [
  {
    name: "Solo",
    price: "$299",
    period: "/mo",
    agents: "Up to 4 agent teams",
    desc: "Less than a day of freelance help — but your agent teams work all month, around the clock.",
    cta: "Get started",
    href: "/pricing",
    highlight: false,
  },
  {
    name: "Small Business",
    price: "From $1,500",
    period: "/mo",
    agents: "Up to 8 agent teams",
    desc: "Full agent teams across sales, support, ops, and more — coordinated and working together around the clock.",
    cta: "Get in touch",
    href: "/pricing",
    highlight: false,
  },
  {
    name: "Mid-size",
    price: "From $5,000",
    period: "/mo",
    agents: "Up to 20 agent teams",
    desc: "Full departmental coverage. Custom teams, dedicated support, and coordinated AI across every function.",
    cta: "Get in touch",
    href: "/pricing",
    highlight: false,
  },
];

const DEPARTMENTS = [
  {
    name: "Customer Support",
    agent: "Mara",
    bullets: [
      "Answers tickets using your product knowledge and tone of voice",
      "Sorts incoming messages by urgency and topic",
      "Drafts replies to common questions — you approve before they go out",
      "Escalates edge cases with full context so you can handle them fast",
    ],
  },
  {
    name: "Sales",
    agent: "Kai",
    bullets: [
      "Identifies leads that match your ideal customer profile",
      "Writes personalised outreach emails in your voice",
      "Follows up on cold leads with context-aware sequences",
      "Summarises pipeline activity and flags deals that need attention",
    ],
  },
  {
    name: "Finance",
    agent: "Max",
    bullets: [
      "Matches invoices to purchase orders and flags discrepancies",
      "Builds weekly and monthly reports formatted to your preferences",
      "Categorises transactions against your chart of accounts",
      "Prepares expense summaries and variance highlights for review",
    ],
  },
  {
    name: "Marketing",
    agent: "Ava",
    bullets: [
      "Writes blog posts, emails, and social copy in your brand voice",
      "Plans campaign calendars based on what's been working",
      "Repurposes long-form content into channel-specific formats",
      "Tracks content performance and suggests what to double down on",
    ],
  },
  {
    name: "Operations",
    agent: "Jordan",
    bullets: [
      "Documents your processes so nothing lives in someone's head",
      "Tracks vendor deliverables and flags missed deadlines",
      "Monitors recurring tasks and surfaces bottlenecks",
      "Keeps internal wikis and SOPs up to date as things change",
    ],
  },
  {
    name: "Admin",
    agent: "Sam",
    bullets: [
      "Triages your inbox and highlights what actually needs you",
      "Drafts meeting agendas and follow-up summaries",
      "Writes briefings tailored to your schedule and priorities",
      "Manages scheduling conflicts and sends polite declines for you",
    ],
  },
  {
    name: "Research",
    agent: "Nova",
    bullets: [
      "Digs into topics you assign and delivers structured summaries",
      "Monitors competitors, market shifts, and industry news",
      "Compiles data from multiple sources into decision-ready briefs",
      "Tailors depth and format to how you actually use research",
    ],
  },
  {
    name: "SEO",
    agent: "Sage",
    bullets: [
      "Audits your site for technical issues and content gaps",
      "Identifies high-value keywords based on your niche and competitors",
      "Writes content briefs that match search intent",
      "Tracks ranking changes and recommends where to focus next",
    ],
  },
];

/* ── Department strip with expandable panels ───────────────────── */
function DepartmentStrip() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="border-y border-white/[0.06]">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 py-3">
        <span className="mr-3 text-xs font-medium uppercase tracking-widest text-white/25">
          Agent teams for
        </span>
        {DEPARTMENTS.map((dept) => {
          const isOpen = open === dept.name;
          return (
            <button
              key={dept.name}
              onClick={() => setOpen(isOpen ? null : dept.name)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
                isOpen
                  ? "bg-white/[0.08] text-white/80"
                  : "text-[#b8c5ce] hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              <span className={`h-1 w-1 rounded-full transition-colors ${isOpen ? "bg-white/50" : "bg-white/20"}`} />
              {dept.name}
              <motion.svg
                className="ml-0.5 h-3 w-3 text-white/30"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path d="M3 4.5 6 7.5 9 4.5" />
              </motion.svg>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key={open}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            {(() => {
              const dept = DEPARTMENTS.find((d) => d.name === open)!;
              return (
                <div className="border-t border-white/[0.06] px-1 pb-5 pt-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-white/50">
                      {dept.agent[0]}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white">{dept.agent}</span>
                      <span className="ml-2 text-xs text-white/35">leads your {dept.name.toLowerCase()} team</span>
                    </div>
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {dept.bullets.map((b, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.05 }}
                        className="flex items-start gap-2 text-sm text-[#b8c5ce]"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/25" />
                        {b}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Animated progress bar ─────────────────────────────────────── */
function AnimatedBar({ width, delay }: { width: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-purple-600/60 to-purple-400/40"
        initial={{ width: 0 }}
        animate={inView ? { width } : { width: 0 }}
        transition={{ duration: 1.2, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      />
    </div>
  );
}

/* ── Pricing CTA button with flirt animation ──────────────────── */
function PricingCta({ href, label, highlight }: { href: string; label: string; highlight: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      <Link
        href={href}
        className={`relative block overflow-hidden rounded-full py-2.5 text-center text-sm font-medium transition-all ${
          highlight
            ? "bg-purple-600 text-white hover:bg-purple-500"
            : "border border-white/[0.10] bg-white/[0.04] text-white/80 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-white"
        }`}
      >
        <motion.span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
        />
        <span className="relative">{label}</span>
      </Link>
    </motion.div>
  );
}

/* ── Main client component ─────────────────────────────────────── */
export function MarketingLandingClient() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-slate-500/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-1/3 h-[400px] w-[400px] rounded-full bg-slate-400/[0.03] blur-3xl" />
        <HeroParticleCanvas />

        <div className="relative">
          <FadeIn>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI that knows<br />
              your business.
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#b8c5ce] sm:text-xl">
              AI workers that learn how your business runs, then take action on their own — finding leads, resolving tickets, chasing invoices, writing outreach. They don't wait to be told. Just name the role and they automate it.
            </p>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-purple-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
              >
                Map your business — free
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-white/[0.10] bg-white/[0.04] px-7 py-3 text-sm text-white/80 transition-colors hover:bg-white/[0.07]"
              >
                See pricing
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />Full teams, not single agents</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />No coding, no setup — pay and play</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />Nothing goes out without your OK</span>
            </div>
          </FadeIn>
        </div>

        {/* Product mock */}
        <FadeIn delay={0.35}>
          <TiltCard className="relative mt-16">
            <div className="pointer-events-none absolute inset-x-4 -bottom-8 top-8 mx-auto max-w-4xl rounded-3xl bg-black/30 blur-2xl" />
            <ProductMock />
          </TiltCard>
        </FadeIn>
      </section>

      {/* ── DEPARTMENT STRIP ─────────────────────────────────────── */}
      <FadeIn>
        <DepartmentStrip />
      </FadeIn>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-20">
        <SectionDivider />
        <div className="pt-12">
          <FadeIn>
            <div className="mb-12 max-w-xl">
              <div className="text-xs font-medium uppercase tracking-wider text-white/30">How it works</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Three steps to a<br />fully staffed business.
              </h2>
            </div>
          </FadeIn>

          <div className="grid gap-0 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div className={`relative p-6 ${i < 2 ? "border-b border-white/[0.06] md:border-b-0 md:border-r" : ""}`}>
                  <motion.div
                    className="text-6xl font-bold text-white/[0.04] select-none"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.12 }}
                  >
                    {step.n}
                  </motion.div>
                  <div className="mt-1 text-lg font-semibold text-white">{step.title}</div>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#b8c5ce]">{step.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT ROSTER ─────────────────────────────────────────── */}
      <section className="py-20">
        <SectionDivider />
        <div className="pt-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:items-start">
            <FadeIn>
              <div className="lg:sticky lg:top-8">
                <div className="text-xs font-medium uppercase tracking-wider text-white/30">Your AI workforce</div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  Pre-built teams.<br />Ready to hire.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#b8c5ce]">
                  Each function gets a coordinated team of agents — not one bot with a label on it. They learn your business, follow your rules, and work together to cover the entire function.
                </p>
                <Link
                  href="/use-cases"
                  className="mt-6 inline-flex rounded-lg border border-white/[0.10] bg-white/[0.04] px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.07]"
                >
                  See what they can do
                </Link>
              </div>
            </FadeIn>

            <StaggerGroup className="grid gap-3 sm:grid-cols-2" stagger={0.05}>
              {AGENTS.map((a) => (
                <StaggerItem key={a.name}>
                  <motion.div
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white">{a.name}</span>
                      <span className="ml-auto rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/40">
                        {a.role}
                      </span>
                    </div>
                    <div className="mt-2.5 text-xs leading-relaxed text-white/35 transition-colors group-hover:text-white/50">
                      {a.tasks}
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}

              <StaggerItem>
                <motion.div
                  className="group rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] p-4 transition-colors hover:border-white/[0.15]"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-white/60">+ Custom team</span>
                  </div>
                  <div className="mt-2.5 text-xs leading-relaxed text-white/35">
                    Need a function we haven't listed? We build custom agent teams for your exact workflows — onboarding, compliance, inventory, whatever you need covered.
                  </div>
                </motion.div>
              </StaggerItem>
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* ── HYBRID ORCHESTRATION ─────────────────────────────────── */}
      <section className="py-20">
        <SectionDivider />
        <div className="pt-12">
          <FadeIn>
            <div className="max-w-xl">
              <div className="text-xs font-medium uppercase tracking-wider text-white/30">Cost structure</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                A full team for less<br />than one hire.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#b8c5ce]">
                A single employee costs $40k–$80k a year. Qorpera gives you full agent teams across every function for a fraction of that — and they work 24/7, never take sick days, and get better every month.
              </p>
            </div>
          </FadeIn>

          <div className="mt-10 space-y-0">
            <FadeIn>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
                <GlowRing className="-right-8 -top-8 h-24 w-24" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 text-3xl font-bold text-white">~80%</div>
                    <div>
                      <div className="text-sm font-semibold text-white">Everyday tasks</div>
                      <div className="mt-1 text-xs text-[#b8c5ce]">Sorting tickets · writing drafts · updating reports · answering FAQs</div>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50">
                    On our machine
                  </span>
                </div>
                <div className="relative mt-5">
                  <AnimatedBar width="80%" delay={0.2} />
                </div>
              </div>
            </FadeIn>

            <StepConnector />

            <FadeIn delay={0.1}>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
                <GlowRing className="-right-8 -top-8 h-24 w-24" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 text-3xl font-bold text-white">~20%</div>
                    <div>
                      <div className="text-sm font-semibold text-white">Tricky situations</div>
                      <div className="mt-1 text-xs text-[#b8c5ce]">Unhappy customers · big proposals · complicated questions · unusual requests</div>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50">
                    Cloud models
                  </span>
                </div>
                <div className="relative mt-5">
                  <AnimatedBar width="20%" delay={0.5} />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── WHY QORPERA ──────────────────────────────────────────── */}
      <section className="py-20">
        <SectionDivider />
        <div className="pt-12">
          <FadeIn>
            <div className="mb-12 max-w-xl">
              <div className="text-xs font-medium uppercase tracking-wider text-white/30">Why Qorpera</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Not a tool you use.<br />A team you hire.
              </h2>
            </div>
          </FadeIn>

          <StaggerGroup className="grid gap-5 md:grid-cols-3" stagger={0.1}>
            {BENEFITS.map((b) => (
              <StaggerItem key={b.title}>
                <motion.div
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    <svg className="h-5 w-5 text-white/50" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={b.icon} />
                    </svg>
                  </div>
                  <div className="mt-4 text-base font-semibold text-white">{b.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-[#b8c5ce]">{b.body}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────── */}
      <section className="py-20">
        <SectionDivider />
        <div className="pt-12">
          <FadeIn>
            <div className="mb-12 max-w-xl">
              <div className="text-xs font-medium uppercase tracking-wider text-white/30">Pricing</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Full teams, not hourly help.
              </h2>
            </div>
          </FadeIn>

          <StaggerGroup className="grid gap-4 md:grid-cols-3" stagger={0.1}>
            {PLANS.map((plan) => (
              <StaggerItem key={plan.name}>
                <motion.div
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 ${
                    plan.highlight
                      ? "border-purple-500/20 bg-white/[0.04]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  }`}
                  whileHover={{ y: -4, borderColor: "rgba(168,85,247,0.25)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: "linear-gradient(105deg, transparent 40%, rgba(168,85,247,0.06) 50%, transparent 60%)" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                  />
                  <div className="relative flex flex-1 flex-col">
                    {plan.highlight && (
                      <div className="mb-4 inline-block self-start rounded-full border border-purple-400/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300/70">
                        Most popular
                      </div>
                    )}
                    <div className="text-sm font-medium text-[#b8c5ce]">{plan.name}</div>
                    <div className="mt-1.5 text-2xl font-bold text-white">
                      {plan.price}
                      <span className="text-sm font-normal text-[#b8c5ce]">{plan.period}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/45">{plan.agents}</div>
                    <p className="mt-3 text-sm leading-relaxed text-[#b8c5ce]">{plan.desc}</p>
                    <div className="mt-auto pt-5">
                      <PricingCta href={plan.href} label={plan.cta} highlight={plan.highlight} />
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="py-24">
        <SectionDivider />
        <div className="relative pt-12">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 rounded-full bg-slate-500/[0.03] blur-3xl" />
          <GlowRing className="left-1/4 top-0 h-48 w-48" />

          <FadeIn>
            <div className="relative">
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start building your<br />
                AI teams today.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-[#b8c5ce]">
                Build your company file for free, see which functions agent teams can cover, and get a consult — no credit card, no commitment. The earlier you start, the smarter your teams get.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-purple-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
              >
                Map your business — free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-white/[0.10] bg-white/[0.04] px-7 py-3 text-sm text-white/80 transition-colors hover:bg-white/[0.07]"
              >
                Log in
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
