"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  GlowRing,
} from "@/components/motion-primitives";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* -- Data --------------------------------------------------------- */

const COMPARISONS = [
  {
    name: "Palantir / Foundry",
    color: "#3b82f6",
    them: [
      "Built for governments and Fortune 500",
      "$10M+ implementation cost",
      "6-12 month deployment cycles",
      "Requires dedicated engineering teams",
    ],
    us: [
      "Built for companies where the CEO still feels the business",
      "Fraction of the cost",
      "Live in 25 minutes",
      "No engineering required — describe what matters in plain language",
    ],
  },
  {
    name: "Dashboards & BI Tools",
    color: "#a855f7",
    them: [
      "Show you lagging metrics — what already happened",
      "You know revenue is down 8%, but not why",
      "Require someone to build the right report first",
      "No context, no relationships, no narrative",
    ],
    us: [
      "Show you developing situations — what's happening now",
      "You see the three churning accounts, stalled deals, and escalations that explain the number",
      "AI surfaces what matters without you having to ask",
      "Full context from across every connected system",
    ],
  },
  {
    name: "ChatGPT / Claude / AI Copilots",
    color: "#f59e0b",
    them: [
      "You bring the context every time you interact",
      "No persistent memory of your business",
      "Reactive — waits for you to ask",
      "Produces text, not operational awareness",
    ],
    us: [
      "Persistent knowledge graph of your entire operation",
      "Always-on — detects situations as they emerge",
      "Proactive — surfaces what matters before you know to ask",
      "Produces the unmediated picture of your business you've never had",
    ],
  },
  {
    name: "Your Team's Updates",
    color: "#10b981",
    them: [
      "Filtered through each person's incomplete mental model",
      "Delayed — you find out after the fact",
      "Partial — each person only sees their own tools",
      "Shaped by what they think you want to hear",
    ],
    us: [
      "Unmediated — drawn directly from your systems",
      "Real-time — situations surfaced as they develop",
      "Complete — intelligence across every connected system",
      "Objective — the picture as it actually is",
    ],
  },
];

/* -- Comparison block --------------------------------------------- */
function ComparisonCard({
  name,
  color,
  them,
  us,
}: {
  name: string;
  color: string;
  them: string[];
  us: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-[15px] font-semibold" style={{ color }}>
        vs {name}
      </h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/25">
            What they give you
          </p>
          <div className="space-y-2">
            {them.map((t) => (
              <div key={t} className="flex items-start gap-2 text-[13px] text-white/35">
                <span className="mt-0.5 text-rose-400/60 shrink-0">&#x2717;</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/25">
            What Qorpera gives you
          </p>
          <div className="space-y-2">
            {us.map((u) => (
              <div key={u} className="flex items-start gap-2 text-[13px] text-white/55">
                <span className="mt-0.5 text-emerald-400/70 shrink-0">&#x2713;</span>
                <span>{u}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* -- Page content ------------------------------------------------- */

export function VisionClient() {
  return (
    <>
      {/* The Problem */}
      <Section label="The problem" title="A game of telephone at the top of every company.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              A CEO or COO has dashboards that show them lagging metrics. Revenue is
              down 8% this month — but why? They ask their team. The team gives them
              a filtered, partial, delayed picture based on whatever each person happens
              to have noticed.
            </p>
            <p>
              The CEO&apos;s understanding of their own operations is basically a game
              of telephone played across six tools and four people&apos;s incomplete
              mental models. Each person sees one slice, remembers what they remember,
              and reports what they think the boss wants to hear.
            </p>
            <p>
              That&apos;s terrifying when you think about it. The person making the
              biggest decisions has the most mediated, least reliable view of what&apos;s
              actually going on.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* The Insight */}
      <Section label="The insight" title="What if you could see your own business directly?">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              Right now, the only way you know what&apos;s really happening in your
              business is by asking the people who work in it. Every answer is filtered
              through someone else&apos;s attention, priorities, and interpretation.
            </p>
            <p>
              Qorpera gives you the full picture directly — not dashboards, not metrics,
              but the actual situations developing across your CRM, payments, email, and
              support, with the context to understand what matters and why.
            </p>
            <p>
              It&apos;s the operational awareness you&apos;d have if you could personally
              watch every tool and every account simultaneously. Not &ldquo;we help your
              team work faster&rdquo; — you finally see your own business clearly.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* Competitive Positioning */}
      <Section label="Positioning" title="Why nothing else gives you this.">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            The market has dashboards, AI chatbots, automation tools, and your team&apos;s
            updates. None of them give you an unmediated, real-time picture of what&apos;s
            actually happening across your business.
          </p>
        </FadeIn>
        <div className="mt-10 space-y-6">
          {COMPARISONS.map((c) => (
            <ComparisonCard key={c.name} {...c} />
          ))}
        </div>
      </Section>

      {/* The Mission */}
      <Section label="The mission" title="Unmediated operational intelligence.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Qorpera&apos;s mission is to close the information gap at the top of
                every growing company. The people steering the business should have
                the clearest view of it — not the most mediated one.
              </p>
              <p>
                Today, operational intelligence at this level is a luxury reserved for
                companies that can afford $10M+ Palantir implementations. We believe
                every leader deserves to see their own business clearly — at a fraction
                of the cost, deployed in minutes, not months.
              </p>
              <p>
                This isn&apos;t a productivity tool. It&apos;s a strategic one. The
                sell isn&apos;t &ldquo;we help your team work faster.&rdquo; It&apos;s
                &ldquo;you finally see your own business clearly.&rdquo; That changes
                how you make decisions, how fast you respond, and how confidently you lead.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
