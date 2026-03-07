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

/* -- Orbit animation (decorative) --------------------------------- */
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

/* -- Comparison --------------------------------------------------- */
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
          Dashboards & team updates
        </p>
        <div className="mt-4 space-y-2">
          {[
            "Lagging metrics — you see what already happened",
            "Filtered through your team's interpretation and priorities",
            "No cross-system context or relationship awareness",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-white/40">
              <span className="mt-0.5 text-rose-400/60 shrink-0">&#x2717;</span>
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
          {[
            "Developing situations — you see what's happening now",
            "Drawn directly from your systems, unmediated",
            "Full cross-system intelligence with relationship context",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-white/60">
              <span className="mt-0.5 text-emerald-400/70 shrink-0">&#x2713;</span>
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* -- Layer card --------------------------------------------------- */
function LayerSection({
  num,
  label,
  title,
  description,
  details,
  color,
}: {
  num: string;
  label: string;
  title: string;
  description: string;
  details: string[];
  color: string;
}) {
  return (
    <Section label={`Layer ${num}`} title={title}>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <FadeIn>
          <div className="space-y-4 text-[#b8c5ce]">
            <p>{description}</p>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <p
              className="mb-3 text-xs font-medium uppercase tracking-wider"
              style={{ color: `${color}99` }}
            >
              {label}
            </p>
            <StaggerGroup className="space-y-3" stagger={0.08}>
              {details.map((item, i) => (
                <StaggerItem key={i}>
                  <div className="flex gap-3 text-sm text-[#b8c5ce]">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
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
  );
}

/* -- Page content ------------------------------------------------- */

export function PlatformClient() {
  return (
    <>
      {/* Why it's different */}
      <Section label="The shift" title="From mediated reports to direct awareness.">
        <div className="space-y-8">
          <FadeIn>
            <div className="max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Today, the people steering a company learn what&apos;s happening through
                dashboards, reports, and team updates. Every layer of mediation strips
                context, adds delay, and introduces bias. The result: leaders making
                strategic decisions on a partial, lagging picture of their own business.
              </p>
              <p>
                Qorpera inverts this. Instead of relying on your team to watch tools and
                report back, AI watches every connected system directly — detecting the
                situations developing across your business and surfacing them with the
                full context needed to understand what they mean and why they matter.
              </p>
            </div>
          </FadeIn>
          <ComparisonBlock />
        </div>
      </Section>

      {/* Layer 01 */}
      <LayerSection
        num="01"
        label="The AI's eyes and ears"
        title="Event Stream — everything that happens, in real time."
        description="Every connected tool feeds raw events into Qorpera: CRM updates, support tickets, emails, calendar changes, invoice statuses, project updates. This is how the system sees your business — not through someone's summary, but through the actual data as it happens."
        details={[
          "OAuth connectors for HubSpot, Stripe, Gmail, Google Sheets, and more",
          "Real-time event ingestion — changes appear in seconds",
          "CSV and API import for custom data sources",
          "Event normalization across different tool formats",
        ]}
        color="#3b82f6"
      />

      {/* Layer 02 */}
      <LayerSection
        num="02"
        label="How entities are resolved"
        title="Knowledge Graph — a unified model of your business."
        description="The AI automatically builds a structured model of your business from events and your description of your organization. A contact in HubSpot and a customer in Stripe become one person with full context. This cross-system entity resolution is what gives Qorpera the awareness that no single tool — and no single person on your team — can match."
        details={[
          "Cross-system entity resolution (email, domain, name matching)",
          "Automatic relationship discovery between entities",
          "Your team structure — who manages what, who should know",
          "Queryable graph with multi-hop traversal",
        ]}
        color="#06b6d4"
      />

      {/* Layer 03 */}
      <LayerSection
        num="03"
        label="Qorpera's core"
        title="Situation Engine — cross-system pattern detection."
        description="The situation engine continuously monitors the event stream and knowledge graph for patterns that require attention. Each situation combines a trigger, cross-system context, and organizational context. It doesn't just detect anomalies — it assembles the full picture needed to make a good decision."
        details={[
          "Configurable situation types — describe in plain language",
          "Trigger detection across multiple event sources",
          "Context assembly from the knowledge graph",
          "Urgency scoring based on business rules",
        ]}
        color="#a855f7"
      />

      {/* Layer 04 */}
      <LayerSection
        num="04"
        label="How decisions are made"
        title="Reasoning + Action — governed decision-making."
        description="For each detected situation, the AI reasons about what it means and what to do. It considers the available actions, the governance constraints, and the outcomes of similar past situations. It then presents its assessment — or, once it has earned trust, acts directly through your existing tools."
        details={[
          "Full-context reasoning grounded in your knowledge graph",
          "Policy checks before every action (ALLOW / DENY / REQUIRE_APPROVAL)",
          "Human-in-the-loop for anything with consequences",
          "Actions flow through your existing tools — email, CRM, invoicing",
        ]}
        color="#f59e0b"
      />

      {/* Layer 05 */}
      <LayerSection
        num="05"
        label="How the system improves"
        title="Learning — accuracy that compounds with every decision."
        description="Every situation, assessment, action, and outcome cycle is recorded. Did the reminder email result in payment? Did the churn intervention save the customer? This feedback loop is what makes Qorpera fundamentally different from a monitoring tool. Dashboards are static. Qorpera gets better at your business with every decision."
        details={[
          "Outcome tracking per situation type",
          "Approval rate metrics drive the trust gradient",
          "Rejection pattern analysis for self-improvement",
          "Graduated autonomy — high-accuracy types run without approval",
        ]}
        color="#10b981"
      />

      {/* Governance */}
      <Section label="Governance" title="You decide how much to delegate.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8">
            <FloatingDots count={8} />
            <OrbitRing />
            <div className="relative max-w-2xl space-y-4 text-[#b8c5ce]">
              <p>
                Every action with consequences requires your approval until you say
                otherwise. Qorpera starts fully supervised — it surfaces situations
                and presents its assessment. As it proves accuracy on each situation type,
                you choose what to let it handle autonomously. And you can revoke that
                autonomy at any time.
              </p>
              <p>
                Every action is logged: what data was used, which entities were
                touched, what rule allowed it, whether human approval was
                required. Complete traceability from situation to outcome.
              </p>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* Mission */}
      <Section label="Mission" title="See your business clearly.">
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
            <GlowRing className="-left-16 -top-16 h-48 w-48" />
            <div className="relative grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-white">The mission</h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  Give every leader unmediated operational intelligence — the
                  cross-system situational awareness that today requires a $10M+
                  Palantir deployment, at a fraction of the cost, live in 25 minutes.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">The promise</h3>
                <p className="mt-2 text-sm text-[#b8c5ce]">
                  You finally see your own business clearly. Not through dashboards,
                  not through your team&apos;s filtered reports — but the actual
                  situations developing across your operations, with full context
                  to understand what they mean and why they matter.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
