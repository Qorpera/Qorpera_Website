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
      "Requires humans to map the ontology, build the logic, design the workflows",
      "Months of professional services before you see anything",
      "$10M+ implementation cost",
      "You build the lens before you can see",
    ],
    us: [
      "AI builds the ontology, detects the situations, assembles the context",
      "Shows you the picture first, lets you refine the focus",
      "Fraction of the cost, live in 25 minutes",
      "You connect your tools and describe what matters — the AI does the rest",
    ],
  },
  {
    name: "Dashboards & BI Tools",
    color: "#a855f7",
    them: [
      "Show you metrics — accounts receivable is $127K",
      "Answer the questions you think to ask",
      "Static — the same view regardless of what's happening",
      "No context, no relationships, no judgment",
    ],
    us: [
      "Show you situations — three invoices overdue, two routine, one a churn signal",
      "Surface the things you didn't know to look for",
      "Dynamic — the picture changes as your business does",
      "Full context across every connected system",
    ],
  },
  {
    name: "Workflow Tools (Zapier, Make, n8n)",
    color: "#f59e0b",
    them: [
      "Automate decisions humans have already made",
      "\"When invoice is overdue, send this template\"",
      "Can't reason about context or adapt based on outcomes",
      "Break on edge cases and exceptions",
    ],
    us: [
      "Understand the situation before deciding what to do about it",
      "The response depends on who the customer is and what else is happening",
      "Learn from outcomes — what worked, what didn't",
      "Handle edge cases through reasoning, not rigid rules",
    ],
  },
  {
    name: "Your Team's Updates",
    color: "#10b981",
    them: [
      "Filtered through individual perspectives and priorities",
      "Delayed by communication cycles",
      "Fragmented across tools that don't talk to each other",
      "One vacation away from organizational blindness",
    ],
    us: [
      "Drawn directly from your systems — unmediated",
      "Real-time — situations surfaced as they develop",
      "Unified across every connected system",
      "Always on — never sick, never on vacation, never forgets",
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
      <Section label="The problem" title="The most mediated view in the company.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              Every company runs on dozens of tools. CRMs, invoicing systems, support
              desks, email, Slack, spreadsheets, project managers. Each tool sees one
              slice of the business. No tool sees the whole picture.
            </p>
            <p>
              The people making the biggest decisions — the ones steering the company —
              have the most mediated view of what&apos;s actually happening. Their
              understanding is assembled from reports, meetings, dashboard glances, and
              whatever their team happens to surface. Filtered through individual
              perspectives, delayed by communication cycles, fragmented across tools
              that don&apos;t talk to each other.
            </p>
            <p>
              The ops person who comes closest — the one who &ldquo;just knows&rdquo;
              that Meridian is about to churn, that the Q3 invoices need attention, that
              deal #4071 has been stalled too long — that person is one vacation, one
              sick day, one resignation away from organizational blindness.
            </p>
            <p className="font-medium text-white/90">
              The problem isn&apos;t that operational work is hard to do. It&apos;s that
              the people who need to understand their business have no direct way to see it.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* The Insight */}
      <Section label="The insight" title="The fundamental unit of operational reality is a situation.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
            <p>
              An overdue invoice is a data point. An overdue invoice <em>from a customer
              whose email sentiment has dropped, who just asked about their contract end
              date, and whose support tickets have turned negative</em> — that&apos;s a
              situation. It means something entirely different from a simple late payment.
              It&apos;s a $45K churn risk that no single tool would flag.
            </p>
            <p>
              These situations develop continuously across every business. Most go
              unnoticed because the signals live in different tools. The few that get
              caught are caught by experienced people who happen to connect the dots at
              the right moment — people who built their operational intuition over years
              of watching patterns.
            </p>
            <p className="font-medium text-white/90">
              What if the people running the company could see every situation developing
              across every tool, in real time, with the full context to understand what
              it means and why it matters?
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* Competitive Positioning */}
      <Section label="Positioning" title="Why nothing else gives you this.">
        <FadeIn>
          <p className="max-w-2xl text-[#b8c5ce]">
            Dashboards show metrics. Workflow tools automate decisions. AI copilots
            answer when asked. Your team reports what they happen to notice. None of
            them give you unmediated, real-time operational awareness across your
            entire business.
          </p>
        </FadeIn>
        <div className="mt-10 space-y-6">
          {COMPARISONS.map((c) => (
            <ComparisonCard key={c.name} {...c} />
          ))}
        </div>
      </Section>

      {/* The North Star */}
      <Section label="The north star" title="Perfect operational awareness.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                The end state is a world where the people running a business have
                perfect operational awareness. Not through more dashboards, more
                meetings, or more reports — but through an AI that sees everything,
                understands the context, knows what matters, and acts on the routine
                so humans can focus on the strategic.
              </p>
              <p>
                The human becomes the teacher, the policy-maker, and the handler of
                genuinely novel situations. The AI becomes the tireless observer that
                never forgets, never overlooks, and never stops learning.
              </p>
              <p className="font-medium text-white/90">
                Connect your tools. See your business clearly. Let the AI handle the rest.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
