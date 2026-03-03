"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  FloatingDots,
  GlowRing,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

const PILLARS = [
  {
    title: "Mapped Entities",
    desc: "People, companies, deals, projects — resolved across every connected system into a unified operational graph. The structural foundation AI reasons from.",
    icon: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
  },
  {
    title: "Permission Systems",
    desc: "Every AI action passes through your governance layer. Define who approves what, set boundaries per role and function, and know nothing happens outside your rules.",
    icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  },
  {
    title: "Decision Logging",
    desc: "Every action retains what data was used, which entities were touched, what rule allowed it, and whether human approval was required. Complete supervision and outcome visibility.",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
];

const LAYER_STEPS = [
  "Connect sources and ingest raw data",
  "Normalize into governed entities and events",
  "Map relationships in an operational entity graph",
  "Define policies, permissions, and approval rules",
  "AI reasons and acts within governed boundaries",
  "Every action logged for review and audit",
];

/* ── Orbit animation (decorative) ──────────────────────────────── */
function OrbitRing() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        className="absolute h-48 w-48 rounded-full border border-white/[0.04]"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/20" />
      </motion.div>
      <motion.div
        className="absolute h-72 w-72 rounded-full border border-white/[0.03]"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/15" />
      </motion.div>
    </div>
  );
}

/* ── Comparison vis ────────────────────────────────────────────── */
function ComparisonBlock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2">
      <motion.div
        className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
        initial={{ opacity: 0, x: -20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-white/30">
          Unstructured AI
        </p>
        <div className="mt-4 space-y-2">
          {["No entity awareness — AI doesn't know your business", "No governance — AI acts without boundaries", "AI just drafts faster — no real workflow execution"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-white/40">
              <span className="text-rose-400/60">&#x2717;</span>
              {item}
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div
        className="rounded-2xl border border-white/[0.10] bg-white/[0.035] p-6"
        initial={{ opacity: 0, x: 20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <p className="text-xs font-medium uppercase tracking-wider text-white/30">
          Qorpera
        </p>
        <div className="mt-4 space-y-2">
          {["Full workflow execution grounded in your entity graph", "Entity graph reasoning across every connected system", "Every action logged — complete audit trail and traceability"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-emerald-400/70">&#x2713;</span>
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Page content ──────────────────────────────────────────────── */

export function AboutClient() {
  return (
    <>
      {/* --- The problem --- */}
      <Section label="The problem" title="AI without structure is a liability, not an advantage.">
        <div className="space-y-8">
          <FadeIn>
            <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Most companies integrating AI face the same problem: the AI
                doesn't know your business, has no guardrails, and leaves no
                trail. You get speed without safety, and output without
                accountability.
              </p>
              <p>
                The real challenge isn't making AI faster — it's building the
                operational infrastructure that lets AI act securely, within
                governed boundaries, grounded in your actual business structure.
              </p>
            </div>
          </FadeIn>
          <ComparisonBlock />
        </div>
      </Section>

      {/* --- The approach --- */}
      <Section label="The approach" title="Governed operations, not chatbot assistants">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <FadeIn>
            <div className="space-y-4 text-[#b8c5ce]">
              <p>
                Qorpera builds the infrastructure AI needs to operate
                responsibly inside your business. We connect your systems, map
                your entities and relationships, and construct governance layers
                that enforce your rules.
              </p>
              <p>
                AI doesn't act on raw data. It queries a mapped operational
                model, checks permissions and policies, and only then proposes
                or executes actions — with full human oversight where
                consequences matter.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
                The six-layer architecture
              </p>
              <StaggerGroup className="space-y-3" stagger={0.08}>
                {LAYER_STEPS.map((item, i) => (
                  <StaggerItem key={i}>
                    <div className="flex gap-3 text-sm text-[#b8c5ce]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-[10px] font-bold text-white/60">
                        {i + 1}
                      </span>
                      {item}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* --- Core values --- */}
      <Section label="Values" title="What we build on">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            Qorpera is built on four principles: mapped entities and systems of
            truth, permission and approval systems, supervision and decision
            logging, and precise and educated decision making.
          </p>
        </FadeIn>
        <div className="relative mt-8">
          <StaggerGroup className="grid gap-6 sm:grid-cols-3" stagger={0.1}>
            {PILLARS.map((c) => (
              <StaggerItem key={c.title}>
                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    <svg className="h-5 w-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={c.icon} />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm text-[#b8c5ce]">{c.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </Section>

      {/* --- Human in the loop --- */}
      <Section label="Governance" title="Nothing with consequences happens without approval">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <FloatingDots count={8} />
            <OrbitRing />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Every output with cross-entity consequences, anything that
                can't be undone, and any action categorized as critical requires
                human approval. AI proposes — you decide.
              </p>
              <p>
                Every action is logged: what data was used, which entities were
                touched, what rule allowed it, whether human approval was
                required. Complete traceability from input to outcome.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* --- Mission --- */}
      <Section label="Mission" title="Disrupting the cost structure of digital work">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  The mission
                </h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  Disrupt the cost structure of digital work through the
                  distribution of secure, cheap, and reliable intelligence —
                  built on permission-awareness, outcome visibility, and human
                  oversight where consequences matter.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  The promise
                </h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  A secure and tailored operating system with reliable security
                  and intelligence layers that AI works in, not around. Your
                  business mapped. Your rules enforced. Your decisions educated.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
