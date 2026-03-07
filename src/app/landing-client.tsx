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
    desc: "Your CRM, payments, email, support, and calendar feed raw events into Qorpera continuously. Nothing is missed.",
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
    desc: "Patterns are detected and assembled into situations: what triggered it, what context surrounds it, how urgent it is, and why it matters to your business.",
    color: "#a855f7",
  },
  {
    num: "04",
    title: "Reasoning + Action",
    desc: "For each situation, the AI reasons about what to do, checks governance rules, and either acts autonomously or surfaces it for your decision.",
    color: "#f59e0b",
  },
  {
    num: "05",
    title: "Continuous Learning",
    desc: "Every outcome is tracked. The system gets better at your business over time — not just at language, but at understanding what matters to you.",
    color: "#10b981",
  },
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
                See your own{" "}
                <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
                  business clearly.
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-4 text-center text-sm font-medium uppercase tracking-wider text-white/35">
                Operational intelligence for the people steering the company
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

      {/* ── The Problem ── white section */}
      <section className="bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] text-zinc-900 sm:text-4xl lg:text-5xl">
              You&apos;re playing telephone
              <br />
              <span className="text-zinc-300">with your own operations.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-zinc-400">
              Revenue is down 8% this month — but why? You ask your team.
              They give you a filtered, partial, delayed picture based on whatever
              each person happens to have noticed. Your understanding of your own business
              is a game of telephone played across six tools and four people&apos;s incomplete mental models.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── The Shift ── white section */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeIn>
            <p className="text-xs font-medium uppercase tracking-widest text-purple-500/60">
              The shift
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              Not dashboards. Not metrics.
              <br />
              <span className="text-zinc-300">The actual picture.</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-zinc-400">
              Qorpera gives you the full picture directly — not summary dashboards
              or lagging metrics, but the actual situations developing across your CRM,
              payments, email, and support, with the context to understand what matters
              and why.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-zinc-400">
              It&apos;s the operational awareness you&apos;d have if you could
              personally watch every tool and every account simultaneously.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8">
              <Link
                href="/vision"
                className="text-sm font-medium text-zinc-400 transition hover:text-zinc-900"
              >
                Read our vision &rarr;
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
              Not a productivity tool.
              <br />
              <span className="text-zinc-300">A strategic one.</span>
            </h2>
          </FadeIn>
          <div className="mt-16 grid gap-12 sm:grid-cols-2">
            <FadeIn delay={0.1}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">How you see your business today</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Your view is filtered through your team's incomplete mental models",
                    "Dashboards show lagging metrics — you see that revenue is down, not why",
                    "Problems surface when they become crises",
                    "Six tools, four people, one game of telephone",
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
                    "Direct visibility into developing situations across your business",
                    "Real context — not just what happened, but what it means and why it matters",
                    "Developing situations surfaced before they become problems",
                    "One intelligence layer across every connected system",
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
              Under the hood
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              How Qorpera sees what others miss.
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
              See what&apos;s actually happening in your business.
            </h2>
            <p className="mt-4 text-[15px] text-white/35">
              Book a demo. We&apos;ll connect your tools and show you the situations
              developing in your operations right now — the ones your dashboards
              aren&apos;t showing you.
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
