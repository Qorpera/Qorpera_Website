"use client";

import Link from "next/link";
import {
  FadeIn,
} from "@/components/motion-primitives";
import { motion } from "framer-motion";

const FIVE_LAYERS = [
  {
    num: "01",
    title: "Event Stream",
    desc: "Connected tools feed raw events into Qorpera — emails, CRM updates, support tickets, invoices, calendar changes. The AI's sensory input.",
    color: "#3b82f6",
  },
  {
    num: "02",
    title: "Knowledge Graph",
    desc: "Every entity is automatically resolved across systems. A contact in HubSpot, a sender in Gmail, and a requester in Linear become one person — with full relationship context.",
    color: "#06b6d4",
  },
  {
    num: "03",
    title: "Situation Engine",
    desc: "Patterns in the event stream are detected and assembled into situations: what triggered it, what context surrounds it, and how urgent it is.",
    color: "#a855f7",
  },
  {
    num: "04",
    title: "Reasoning + Action",
    desc: "For each situation, the AI reasons about what to do, checks governance rules, and either acts autonomously or escalates for human approval.",
    color: "#f59e0b",
  },
  {
    num: "05",
    title: "Continuous Learning",
    desc: "Every outcome is tracked. Accuracy per situation type improves over time. The system gets better at your business, not just at language.",
    color: "#10b981",
  },
];

const TRUST_STEPS = [
  { label: "Supervised", desc: "AI detects situations and proposes actions. You approve everything.", pct: "0%" },
  { label: "Tracking accuracy", desc: "The system tracks approval rates per situation type. You see what it gets right.", pct: "25%" },
  { label: "Graduation", desc: "Situation types with high accuracy are flagged for autonomous handling.", pct: "50%" },
  { label: "Partial autonomy", desc: "Graduated situations run automatically. Novel situations still require approval.", pct: "75%" },
  { label: "Steady state", desc: "80-90% of situations handled autonomously. You focus on exceptions and strategy.", pct: "90%" },
];

/* -- Main --------------------------------------------------------- */

export function LandingClient() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero with video background */}
      <div className="relative pt-16 pb-16 text-center">
        {/* Full-width video background */}
        <div className="pointer-events-none absolute inset-0 -top-20 overflow-hidden">
          <video
            className="h-full w-full object-cover opacity-40 object-[60%_center]"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgb(8,12,16)]/60 via-transparent to-[rgb(8,12,16)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgb(8,12,16)_0%,_transparent_70%)] opacity-70" />
        </div>
        <div className="relative mx-auto flex min-h-[45vh] max-w-7xl flex-col items-center justify-between px-6">
          {/* Header + subheader at top */}
          <div className="flex flex-col items-center">
            <FadeIn delay={0.1}>
              <h1 className="text-center text-4xl font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                AI integrated{" "}
                <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
                  operations.
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-center text-sm font-medium uppercase tracking-wider text-white/35">
                The operating system for AI-driven work
              </p>
            </FadeIn>
          </div>

          {/* Spacer — lets the video breathe */}
          <div className="flex-1" />

          {/* Scroll indicator at bottom */}
          <FadeIn delay={0.4}>
            <div className="flex flex-col items-center gap-3">
              <p className="text-[12px] tracking-wider text-white/25">Scroll to learn more</p>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg className="h-5 w-5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── Problem ── white section */}
      <section className="bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] text-zinc-900 sm:text-4xl lg:text-5xl">
              AI that does more
              <br />
              <span className="text-zinc-300">than answer questions.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-zinc-400">
              Qorpera doesn&apos;t wait for you to ask. It watches your systems, detects
              situations that need attention, and acts on them safely — governed, audited, and improving over time.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Trust Gradient ── white section */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <p className="text-xs font-medium uppercase tracking-widest text-purple-500/60">
              Trust gradient
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              AI earns autonomy.
              <br />
              <span className="text-zinc-300">You stay in control.</span>
            </h2>
          </FadeIn>
          {/* Progress bar visualization */}
          <div className="mx-auto mt-16 max-w-2xl">
            {/* Track */}
            <div className="relative h-2 w-full rounded-full bg-zinc-100">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                initial={{ width: "0%" }}
                whileInView={{ width: "90%" }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: [0.21, 0.47, 0.32, 0.98] }}
              />
              {TRUST_STEPS.map((step, i) => {
                const left = i === 0 ? 0 : i === 1 ? 25 : i === 2 ? 50 : i === 3 ? 75 : 90;
                return (
                  <div
                    key={step.label}
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${left}%` }}
                  >
                    <motion.div
                      className="h-4 w-4 -translate-x-1/2 rounded-full border-2 border-purple-500 bg-white"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.2, duration: 0.3, ease: "backOut" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="relative mt-6 h-16">
              {TRUST_STEPS.map((step, i) => {
                const left = i === 0 ? 0 : i === 1 ? 25 : i === 2 ? 50 : i === 3 ? 75 : 90;
                return (
                  <motion.div
                    key={step.label}
                    className="absolute -translate-x-1/2 text-center"
                    style={{ left: `${left}%`, maxWidth: "120px" }}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.2, duration: 0.4 }}
                  >
                    <span className="block text-[12px] font-semibold text-zinc-700">{step.label}</span>
                    <span className="mt-0.5 block text-[10px] text-zinc-400">{step.pct}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <FadeIn delay={0.4}>
            <div className="mx-auto mt-4 h-px max-w-2xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
            <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-zinc-500">
              Qorpera starts fully supervised. As it proves accuracy on each situation type,
              it graduates to handle more on its own — until 80-90% runs autonomously.
            </p>
            <div className="mt-6">
              <Link
                href="/how-it-works"
                className="text-sm font-medium text-zinc-400 transition hover:text-zinc-900"
              >
                See the full lifecycle &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Before / After ── white section */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <h2 className="text-center text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              Not a chatbot. Not a connector.
              <br />
              <span className="text-zinc-300">An operating system.</span>
            </h2>
          </FadeIn>
          <div className="mt-16 grid gap-12 sm:grid-cols-2">
            <FadeIn delay={0.1}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Before Qorpera</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "You bring context to AI every time",
                    "Automations break on edge cases",
                    "Nobody monitors cross-system patterns",
                    "Enterprise AI costs millions",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[15px] text-zinc-400">
                      <span className="mt-1 text-zinc-300">&mdash;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-900">With Qorpera</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "AI watches your business continuously",
                    "Situations detected and reasoned about",
                    "Cross-system intelligence, governed action",
                    "Live in 25 minutes, fraction of the cost",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[15px] text-zinc-900">
                      <span className="mt-1 text-purple-500">&mdash;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Five Layers ── white section */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6">
          <FadeIn>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Five layers
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              From raw events to intelligent action.
            </h2>
          </FadeIn>
          <div className="mt-16 space-y-12">
            {FIVE_LAYERS.map((layer, i) => (
              <FadeIn key={layer.num} delay={i * 0.06}>
                <div className="flex items-start gap-6">
                  <span className="mt-1 text-[13px] font-semibold text-zinc-300">{layer.num}</span>
                  <div>
                    <h3 className="text-[17px] font-medium text-zinc-900">{layer.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-zinc-500">{layer.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.3}>
            <div className="mt-12 text-center">
              <Link
                href="/platform"
                className="text-sm font-medium text-zinc-400 transition hover:text-zinc-900"
              >
                Deep-dive on the architecture &rarr;
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── dark section */}
      <section className="bg-[rgb(8,12,16)] py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl">
              See it working on your business.
            </h2>
            <p className="mt-4 text-[15px] text-white/35">
              Book a demo. We&apos;ll connect your tools, show you the situations
              Qorpera finds, and walk through the trust gradient — live.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-zinc-900 transition hover:bg-zinc-200"
              >
                Request a Demo
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-xl border border-white/[0.10] px-8 py-3.5 text-[15px] font-medium text-white/50 transition hover:border-white/[0.15] hover:text-white/80"
              >
                How It Works
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
