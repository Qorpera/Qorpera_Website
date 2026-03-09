"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";

/* -- Document card ------------------------------------------------ */
function DocCard({
  title,
  description,
  tag,
}: {
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <StaggerItem>
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6 transition hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
          {tag}
        </p>
        <h3 className="mt-2 font-sans text-base font-semibold text-[var(--ink)]">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
          {description}
        </p>
      </div>
    </StaggerItem>
  );
}

/* -- Page content ------------------------------------------------- */
export function DocumentsClient() {
  return (
    <>
      {/* Getting started */}
      <Section label="Getting started" title="Up and running in 25 minutes.">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2" stagger={0.08}>
          <DocCard
            tag="Guide"
            title="Quick-start walkthrough"
            description="Connect your first tool, describe your organisation, and see Qorpera detect its first situation — step by step."
          />
          <DocCard
            tag="Guide"
            title="Describing your company"
            description="How to write a company description that gives the AI the context it needs to detect situations that actually matter."
          />
          <DocCard
            tag="Guide"
            title="Understanding situations"
            description="What a situation is, how they're scored, and how to read the situation feed in your dashboard."
          />
          <DocCard
            tag="Guide"
            title="Approval & trust gradient"
            description="How to review AI assessments, approve or reject actions, and gradually increase autonomy as accuracy improves."
          />
        </StaggerGroup>
      </Section>

      {/* Integrations */}
      <Section label="Integrations" title="Connect every system you run on.">
        <StaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          <DocCard
            tag="Integration"
            title="HubSpot CRM"
            description="Connect contacts, deals, and company records. Qorpera detects pipeline risks, stale deals, and churn signals across your CRM data."
          />
          <DocCard
            tag="Integration"
            title="Slack"
            description="Send situation alerts to channels, receive approval requests via DM, and let agents post updates where your team already works."
          />
          <DocCard
            tag="Integration"
            title="Google Workspace"
            description="Calendar, Gmail, and Drive integration. The AI sees scheduling conflicts, unanswered emails, and document activity."
          />
          <DocCard
            tag="Integration"
            title="Linear"
            description="Track project and issue status. Qorpera surfaces blocked work, missed deadlines, and scope creep across engineering teams."
          />
          <DocCard
            tag="Integration"
            title="Stripe"
            description="Payment events, subscription changes, and invoice statuses feed directly into the knowledge graph for revenue awareness."
          />
          <DocCard
            tag="Integration"
            title="Custom sources"
            description="Import data via CSV, API, or webhook. Any system that produces events can feed into Qorpera's situation engine."
          />
        </StaggerGroup>
      </Section>

      {/* Platform reference */}
      <Section label="Platform reference" title="How the system works.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FadeIn>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
                Architecture
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Event Stream — real-time ingestion from every connected tool",
                  "Knowledge Graph — cross-system entity resolution and relationships",
                  "Situation Engine — pattern detection across your entire operation",
                  "Reasoning Layer — governed decision-making with full traceability",
                  "Learning Loop — accuracy that compounds with every decision cycle",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]">&#x2192;</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
              <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
                Governance & policies
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Policy engine — ALLOW, DENY, or REQUIRE_APPROVAL per action type",
                  "Audit trail — every action logged with full data lineage",
                  "Trust gradient — graduated autonomy based on proven accuracy",
                  "Role-based visibility — control who sees which situations",
                  "Revocable delegation — withdraw autonomy at any time",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-[var(--ink-soft)]">
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]">&#x2192;</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* Security & compliance */}
      <Section label="Security" title="Enterprise-grade data handling.">
        <FadeIn>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-8">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <h3 className="font-sans text-base font-semibold text-[var(--ink)]">
                  Encryption
                </h3>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  All data encrypted at rest (AES-256) and in transit (TLS 1.3).
                  OAuth tokens and credentials are encrypted with per-record keys.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-base font-semibold text-[var(--ink)]">
                  Data residency
                </h3>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  Your data stays in the region you choose. EU customers get
                  EU-only hosting with no cross-border transfers.
                </p>
              </div>
              <div>
                <h3 className="font-sans text-base font-semibold text-[var(--ink)]">
                  Access control
                </h3>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">
                  Role-based permissions, SSO support, and complete audit logging.
                  Every data access is recorded and traceable.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
