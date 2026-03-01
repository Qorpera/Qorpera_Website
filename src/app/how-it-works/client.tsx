"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
  StepConnector,
  FloatingDots,
  GlowRing,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ── Data ─────────────────────────────────────────────────────── */

const LEARNING_CARDS = [
  {
    title: "Absorbs your operating manual",
    desc: "Every worker reads your company file — products, policies, tone, rules — before touching a single task.",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    title: "Gets trained by your corrections",
    desc: "Every edit you make before approving becomes training data. Your workers adapt — no retraining, no re-explaining.",
    icon: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z M19.5 7.125 16.875 4.5",
  },
  {
    title: "Builds institutional knowledge",
    desc: "Approved outputs become reference points. Over time, your AI workforce accumulates knowledge no competitor can replicate.",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
];

const WORKFLOW_STEPS = [
  { step: "1", title: "Worker does the job", desc: "Your AI worker handles the task — drafting emails, writing reports, answering tickets — based on your business context." },
  { step: "2", title: "Queues for review", desc: "The output appears in your inbox with a clear summary of what was done and why." },
  { step: "3", title: "You decide", desc: "One click to approve. Or edit inline — your worker sees exactly what you changed and why." },
  { step: "4", title: "Worker improves", desc: "Every correction feeds back. Unlike a human hire that plateaus, your AI workers keep compounding in capability." },
];

const COMPANY_FIELDS = [
  "Company name & pitch",
  "Mission & values",
  "Ideal customers",
  "Core offerings",
  "Strategic goals",
  "Departments & roles",
  "Approval rules",
  "Tools & systems",
  "Key metrics",
];

/* ── Animated progress bar ─────────────────────────────────────── */
function ProgressBar({ label, percent, delay }: { label: string; percent: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-white/20 to-white/40"
          initial={{ width: 0 }}
          animate={inView ? { width: `${percent}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
    </div>
  );
}

/* ── Page sections ─────────────────────────────────────────────── */

export function HowItWorksClient() {
  return (
    <>
      {/* --- Teach your business --- */}
      <Section label="Step 1" title="Describe the roles you need filled">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <FadeIn>
            <div className="space-y-4 text-[#b8c5ce]">
              <p>
                You fill out your Company Identity — a structured profile that
                tells your AI workforce who you are, what you sell, how you
                operate, and what the rules are.
              </p>
              <p>
                This isn't a chatbot prompt. It's the operating manual your
                digital workers follow — the same way a new hire would read your
                handbook before their first day.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <FloatingDots count={6} />
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-white/30">
                Company identity fields
              </p>
              <StaggerGroup className="space-y-2" stagger={0.05}>
                {COMPANY_FIELDS.map((f) => (
                  <StaggerItem key={f}>
                    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/70 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                      {f}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* --- How agents learn --- */}
      <Section label="Step 2" title="How your workforce learns">
        <StaggerGroup className="grid gap-6 sm:grid-cols-3" stagger={0.1}>
          {LEARNING_CARDS.map((c) => (
            <StaggerItem key={c.title}>
              <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
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
      </Section>

      {/* --- The approval workflow --- */}
      <Section label="Step 3" title="The approval workflow">
        <div className="space-y-0">
          {WORKFLOW_STEPS.map((s, i) => (
            <div key={s.step}>
              <FadeIn delay={i * 0.1}>
                <div className="flex gap-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-sm font-bold text-white/70">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#b8c5ce]">{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
              {i < WORKFLOW_STEPS.length - 1 && <StepConnector />}
            </div>
          ))}
        </div>
      </Section>

      {/* --- Getting smarter over time --- */}
      <Section label="Step 4" title="Your competitive moat grows">
        <div className="grid gap-6 sm:grid-cols-2">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <GlowRing className="-right-8 -top-8 h-32 w-32" />
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                Week 1
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">
                New hires ramping up
              </h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">
                Workers rely heavily on your company file. Outputs are close but
                need frequent edits. Every correction sharpens them — fast.
              </p>
              <div className="mt-5 space-y-3">
                <ProgressBar label="Approval rate" percent={45} delay={0.2} />
                <ProgressBar label="Context accuracy" percent={60} delay={0.35} />
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.12}>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <GlowRing className="-right-8 -top-8 h-32 w-32" />
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                Month 3
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">
                Fully trained workforce
              </h3>
              <p className="mt-2 text-sm text-[#b8c5ce]">
                Hundreds of corrections and approvals deep. Most outputs need
                only a quick review. This training data is yours — and it can't
                be bought.
              </p>
              <div className="mt-5 space-y-3">
                <ProgressBar label="Approval rate" percent={92} delay={0.4} />
                <ProgressBar label="Context accuracy" percent={95} delay={0.55} />
              </div>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={0.2}>
          <p className="mt-8 text-center text-[#b8c5ce]">
            The earlier you start, the bigger your advantage. Every week of
            corrections builds a workforce that competitors who start later
            can never catch up to.
          </p>
        </FadeIn>
      </Section>
    </>
  );
}
