"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  FloatingDots,
  GlowRing,
  AnimatedLine,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

const TWIN_CARDS = [
  {
    title: "Your Customers",
    desc: "Who they are, what they buy, how they talk, what matters to them. Every agent interaction draws from this.",
    icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  },
  {
    title: "Your Processes",
    desc: "How work gets done — approval chains, escalation paths, SOPs. Agents follow the same rules your team does.",
    icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z",
  },
  {
    title: "Your Standards",
    desc: "Tone of voice, formatting preferences, quality bars. Agents don't just do the work — they do it your way.",
    icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z",
  },
];

const INTERNALIZATION_STEPS = [
  "Read your company file before every task",
  "Reference uploaded business documents",
  "Apply your approval rules and escalation paths",
  "Adapt tone and formatting to your standards",
  "Incorporate corrections from previous reviews",
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
          Generic AI
        </p>
        <div className="mt-4 space-y-2">
          {["Re-explain context every time", "Corrects never stick", "Same mistakes, different day"].map((item) => (
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
          {["Knows your business from day one", "Every correction makes it smarter", "Gets better the more you use it"].map((item) => (
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
      <Section label="The gap" title="Why generic AI falls short">
        <div className="space-y-8">
          <FadeIn>
            <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                General-purpose AI doesn't know your customers, your products, or
                your rules. Every time you use it, you're starting from zero —
                re-explaining context, correcting tone, fixing details.
              </p>
              <p>
                The result: AI that's fast but wrong. Outputs that need so much
                editing they barely save time. A tool that never gets better no
                matter how much you use it.
              </p>
            </div>
          </FadeIn>
          <ComparisonBlock />
        </div>
      </Section>

      {/* --- AI that learns your business --- */}
      <Section label="The approach" title="Start with what you know">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <FadeIn>
            <div className="space-y-4 text-[#b8c5ce]">
              <p>
                Qorpera flips the model. Instead of starting with AI and trying to
                bolt on business context, we start with your business and give it
                AI capabilities.
              </p>
              <p>
                You create a company file — a structured profile of your business
                identity, customers, processes, and standards. Every agent reads
                from it. When they draft an email, build a report, or answer a
                customer, they already know the context.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
                How agents internalize your rules
              </p>
              <StaggerGroup className="space-y-3" stagger={0.08}>
                {INTERNALIZATION_STEPS.map((item, i) => (
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

      {/* --- The digital twin --- */}
      <Section label="The model" title="A digital twin of your business">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            Over time, Qorpera builds a working model of how your business
            operates — not a copy, but a reflection that gets clearer with every
            interaction.
          </p>
        </FadeIn>
        <div className="relative mt-8">
          <StaggerGroup className="grid gap-6 sm:grid-cols-3" stagger={0.1}>
            {TWIN_CARDS.map((c) => (
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
      <Section label="Trust" title="Nothing happens without your OK">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <FloatingDots count={8} />
            <OrbitRing />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Every agent output goes through your inbox before it reaches anyone.
                You review, approve, edit, or decline. There are no autonomous
                customer-facing actions.
              </p>
              <p>
                When you do edit, the correction isn't wasted. The agent sees exactly
                what you changed and why, and uses that to do better next time.
                Over weeks, you'll find yourself editing less and approving more.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* --- Getting smarter --- */}
      <Section label="Trajectory" title="Getting smarter, not just faster">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Feedback loops
                </h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  Every approval, every edit, every correction feeds back into the
                  agent's understanding. Patterns emerge. Your agents learn which
                  customers need formal language, which reports need charts, which
                  tickets can be resolved with a template.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Continuous improvement
                </h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  Unlike a hire that plateaus, your AI workforce keeps compounding.
                  The company file grows. Corrections accumulate. Approval rates
                  climb. What starts as a useful tool becomes an indispensable
                  part of how you operate.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
