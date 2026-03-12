"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";
import { QorperaLogo } from "@/components/qorpera-logo";

/* ── Data ──────────────────────────────────────────────────────── */

const PRINCIPLES = [
  {
    title: "Context over capability",
    text: "The AI models are already smart enough. What they lack is knowledge of your specific business — your customers, your team, your processes, your policies. We build the layer that provides that context.",
  },
  {
    title: "Humans build the skeleton, AI fills it in",
    text: "AI cannot reliably map a business from unstructured text. We learned that the hard way. The right design is simple: you sketch the structure, the AI populates it with operational data from your tools.",
  },
  {
    title: "Trust is earned, not configured",
    text: "Autonomy isn't a toggle. It's something the system earns one task type at a time — through demonstrated competence, transparent reasoning, and instant revocation if it gets something wrong.",
  },
  {
    title: "Evidence, not intuition",
    text: "Every recommendation the AI makes cites specific data points from your business. If it can't justify an action through provided evidence, it flags rather than improvises. This is what makes the system trustworthy.",
  },
  {
    title: "Knowledge that compounds",
    text: "When an experienced employee leaves, their institutional knowledge walks out the door. The AI's understanding of your business compounds, transfers, and scales in ways individual expertise never can.",
  },
];

/* ── Component ─────────────────────────────────────────────────── */

export function AboutClient() {
  return (
    <>
      {/* ── Why we started ───────────────────────────────────── */}
      <Section label="Our mission" title="Close the gap between what AI can do and what it actually does.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              AI can already perform 85% of the tasks in business and finance
              roles. It&apos;s being used for 20%. In office and administrative
              roles, 90% of tasks are feasible — 25% are actually happening.
            </p>
            <p>
              And even that 20% overstates the reality. Most of what companies
              count as &ldquo;AI adoption&rdquo; is assistant work — drafting
              emails, summarizing documents, answering one-off questions. Useful,
              but nowhere near operational. The AI isn&apos;t embedded in how the
              business actually runs. Many companies overstate their use of AI
              entirely, making the real level of integration even lower than the
              numbers suggest.
            </p>
            <p>
              We kept asking why. The models are smart enough. The research
              confirms it. The gap is enormous — and concentrated in exactly the
              roles that run a business: operations, finance, customer
              management, administration.
            </p>
            <p>
              The answer turned out to be deceptively simple. AI doesn&apos;t
              know your business. It doesn&apos;t know who your customers are,
              how your team is structured, what your policies require, or what
              worked last time. Without that context, it can&apos;t do real
              work.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── The insight ──────────────────────────────────────── */}
      <Section
        label="The insight"
        title="The solution is a digital twin of your company."
      >
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              Every company runs on dozens of tools. CRMs, invoicing systems,
              support desks, email, Slack, spreadsheets. Each tool sees one
              slice of the business. No tool sees the whole picture.
            </p>
            <p>
              The people making the biggest decisions — the ones steering the
              company — have the most mediated view of what&apos;s actually
              happening. Their understanding is assembled from reports, meetings,
              dashboard glances, and whatever their team happens to surface.
            </p>
            <p>
              We realized the answer wasn&apos;t another dashboard or another
              integration. It was a living model of the business itself — a
              digital twin that connects every tool, understands every
              relationship, and gives AI the organizational context to reason
              about what&apos;s actually happening.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── AI as a hire ────────────────────────────────────── */}
      <Section
        label="Our approach"
        title="Teach AI a role the same way you'd onboard a person."
      >
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              Most AI tools treat integration as a technical problem — connect
              an API, pipe some data, write a prompt. We think that
              fundamentally misunderstands what it takes for AI to do real work
              inside a company.
            </p>
            <p>
              When you hire someone, you don&apos;t hand them a database and
              expect results. You orient them. You explain how the company
              works, who the customers are, what the priorities are, what went
              wrong last time. You give them context, let them shadow the team,
              and gradually hand off responsibility as they prove they
              understand the role.
            </p>
            <p>
              AI should work the same way. It needs to learn your business the
              way a new hire would — by being shown the structure, given access
              to the history, taught the policies, and allowed to build
              competence through supervised practice before it earns autonomy.
            </p>
            <p>
              That&apos;s what Qorpera does. You orient the AI to your company.
              It observes, learns your patterns, and starts making
              recommendations. You correct it when it&apos;s wrong. Over time,
              it understands the role — not because someone wrote better
              prompts, but because it was taught the way any good hire is
              taught.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── What we believe ──────────────────────────────────── */}
      <Section label="Our philosophy" title="The principles behind how we build.">
        <StaggerGroup className="space-y-4" stagger={0.08}>
          {PRINCIPLES.map((p) => (
            <StaggerItem key={p.title}>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
                <h3 className="font-sans text-[15px] font-semibold text-[var(--ink)]">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[var(--ink-soft)]">
                  {p.text}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* ── Where we're going ────────────────────────────────── */}
      <Section
        label="Where we're going"
        title="From operational awareness to operational intelligence."
      >
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              Today, Qorpera gives you unmediated visibility into your business.
              It connects your tools, builds the digital twin, and surfaces the
              situations that matter — with full cross-system context.
            </p>
            <p>
              Over time, the AI earns the right to act. It starts by observing
              and recommending. When it demonstrates consistent judgment on a
              task type, you can let it handle that work autonomously. The
              routine gets handled. Your team focuses on the work that actually
              requires human judgment.
            </p>
            <p>
              But the bigger vision is what happens across customers. Every
              situation Qorpera handles — what was detected, what was tried, what
              worked — becomes part of a shared intelligence network. A new
              customer&apos;s AI doesn&apos;t start from zero. It arrives with
              the operational experience of every business on the platform.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Logo mark ────────────────────────────────────────── */}
      <FadeIn>
        <div className="flex justify-center py-20">
          <QorperaLogo width={120} height={120} className="text-[var(--ink)]" />
        </div>
      </FadeIn>

    </>
  );
}
