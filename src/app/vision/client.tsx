"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
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
      "Built for growing companies (10-500 people)",
      "Fraction of the cost",
      "Live in 25 minutes",
      "No engineering required — describe situations in plain language",
    ],
  },
  {
    name: "Zapier / Make / n8n",
    color: "#a855f7",
    them: [
      "Connects point A to point B",
      "No understanding of your business context",
      "Breaks on edge cases and exceptions",
      "You build and maintain every workflow manually",
    ],
    us: [
      "Understands entities, relationships, and situations",
      "Full business context from the knowledge graph",
      "Handles edge cases through reasoning, not rigid rules",
      "AI builds and adapts responses to situations",
    ],
  },
  {
    name: "ChatGPT / Claude / AI Copilots",
    color: "#f59e0b",
    them: [
      "You bring the context every time you interact",
      "No persistent memory of your business",
      "Reactive — waits for you to ask",
      "Produces text, not operational outcomes",
    ],
    us: [
      "Persistent knowledge graph of your entire operation",
      "Always-on — detects situations as they emerge",
      "Proactive — acts before you know there's a problem",
      "Produces governed actions with real business impact",
    ],
  },
  {
    name: "CRM / Support / Domain Tools",
    color: "#10b981",
    them: [
      "Each tool sees only its own data silo",
      "AI features are bolted-on copilots for that one tool",
      "Can't reason across systems or departments",
      "You're the integration layer between tools",
    ],
    us: [
      "Cross-system intelligence — sees the whole picture",
      "AI is the operating layer, not a feature in a feature",
      "Reasons across every connected system simultaneously",
      "Qorpera is the integration layer — you focus on decisions",
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
            What they do
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
            What Qorpera does
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
      <Section label="The problem" title="Not a lack of tools. A lack of attention.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              The average growing company uses 50-100 SaaS tools. Each one captures
              data in its own silo. Each one sends its own notifications. And somewhere
              in the gaps between these tools, situations emerge that nobody sees in time.
            </p>
            <p>
              An overdue invoice from a customer who also has an open support ticket.
              A stalled deal where the champion just changed jobs. A vendor contract
              expiring next month that nobody remembered to renew.
            </p>
            <p>
              These aren&apos;t exotic scenarios. They happen every day, in every
              company, across every department. The problem isn&apos;t that the data
              doesn&apos;t exist — it&apos;s that no human can simultaneously watch
              everything.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* The Insight */}
      <Section label="The insight" title="Every operational task starts with a situation.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              Before anyone takes action in a business, something happens first: a situation
              emerges that requires a decision. An invoice goes overdue. A customer shows
              signs of churning. A contract approaches renewal.
            </p>
            <p>
              Today, these situations are detected by humans — if they&apos;re detected at all.
              Someone notices. Someone remembers. Someone connects the dots across systems.
              This is expensive, unreliable, and doesn&apos;t scale.
            </p>
            <p>
              What if AI could do the watching? Not as a chatbot you ask questions to, but as
              an always-on intelligence layer that detects situations across all your systems,
              reasons about what to do, and acts within boundaries you define?
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* Competitive Positioning */}
      <Section label="Positioning" title="Why nothing else does this.">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            The market has tools for automation, tools for AI chat, and tools for
            domain-specific workflows. None of them combine continuous situation
            detection with cross-system reasoning and governed action.
          </p>
        </FadeIn>
        <div className="mt-10 space-y-6">
          {COMPARISONS.map((c) => (
            <ComparisonCard key={c.name} {...c} />
          ))}
        </div>
      </Section>

      {/* The Mission */}
      <Section label="The mission" title="Intelligence that compounds.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Qorpera&apos;s mission is to disrupt the cost structure of digital work
                through the distribution of secure, situation-driven intelligence.
              </p>
              <p>
                Today, operational intelligence at scale is a luxury reserved for
                companies that can afford $10M+ Palantir implementations and dedicated
                engineering teams. We believe every growing company deserves the same
                capability — at a fraction of the cost, deployed in minutes, not months.
              </p>
              <p>
                We&apos;re building the operating system that makes this possible:
                AI that watches your business, earns your trust through accuracy,
                and handles the operational load that currently requires an army of
                coordinators, analysts, and managers.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
