import type { Metadata } from "next";
import {
  PageHeader,
  P,
  H2,
  Note,
  Callout,
  DocLink,
} from "./docs-primitives";
import { QorperaLogo } from "@/components/qorpera-logo";

export const metadata: Metadata = {
  title: "Documentation — Platform Overview",
  description:
    "Learn how Qorpera connects to your business tools, builds a unified business graph, detects operational situations, and earns AI autonomy through the trust gradient.",
};

export default function DocsOverviewPage() {
  return (
    <>
      {/* Header with illustration */}
      <div className="mb-10 flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="mb-1 font-sans text-[12px] font-medium text-[var(--ink-muted)]">
            Qorpera Platform &rsaquo; Overview
          </p>
          <h1 className="font-sans text-[32px] font-bold leading-[1.2] tracking-[-0.5px] text-[var(--ink)]">
            Qorpera overview
          </h1>
        </div>
        <div className="hidden shrink-0 sm:block">
          <QorperaLogo width={100} height={100} className="text-[var(--ink)]" />
        </div>
      </div>

      <P>
        Qorpera is an AI operations platform that connects to your existing
        business tools, builds a unified business graph of your organisation,
        and deploys a personal AI for every employee that detects situations,
        recommends actions, and learns from your team&apos;s decisions.
      </P>
      <P>
        The platform integrates with Gmail, Google Workspace, Slack, Microsoft
        365, HubSpot, and Stripe — resolving entities across systems into a
        single connected view of your business.
      </P>

      <Callout>
        Get started with the{" "}
        <DocLink href="/documents/getting-started">
          &ldquo;Getting started&rdquo;
        </DocLink>{" "}
        guide — connect your first tool and see your first situation detected
        within hours.
      </Callout>

      <Note>
        The remainder of this page provides a brief overview of Qorpera&apos;s
        core capabilities. For details, see the dedicated pages in the sidebar.
      </Note>

      <H2 id="seamless-integration">Seamless integration</H2>
      <P>
        Qorpera connects to your tools via OAuth. Personal connectors (Gmail,
        Drive, Calendar, Sheets, Outlook, OneDrive, Teams, Excel) are authorised
        per user. Company connectors (HubSpot, Stripe, Slack) are set up once at
        the operator level. Every contact, deal, message, invoice, and calendar
        event flows into a shared data layer through a normalised sync pipeline.
      </P>

      <H2 id="business-graph">Business graph</H2>
      <P>
        At the core of the platform is the{" "}
        <DocLink href="/documents/business-graph">business graph</DocLink> — a
        connected entity model that represents your organisation across five
        categories: departments, people, documents, connector-sourced records,
        and external entities. Identity resolution uses weighted scoring across
        email, phone, domain, and embedding similarity to automatically
        deduplicate and connect records across systems.
      </P>

      <H2 id="situation-awareness">Situation awareness</H2>
      <P>
        The{" "}
        <DocLink href="/documents/situation-detection">
          situation engine
        </DocLink>{" "}
        detects patterns through two paths: property-based detection evaluates
        structured data via cron, while content-based detection analyses
        communication content for action items. Situations represent
        multi-signal, cross-system patterns — scored for urgency and routed to
        departments.
      </P>

      <H2 id="personal-ai">Personal AI</H2>
      <P>
        Every employee gets a personal AI entity that learns from their
        decisions. The{" "}
        <DocLink href="/documents/how-ai-learns">learning system</DocLink>{" "}
        tracks approval patterns per situation type, and the{" "}
        <DocLink href="/documents/copilot">copilot</DocLink> provides a
        conversational interface to the business graph and situation engine.
        All AI actions are governed by a{" "}
        <DocLink href="/documents/policy-engine">policy engine</DocLink> that
        enforces ALLOW, DENY, or REQUIRE_APPROVAL rules.
      </P>

      <H2 id="trust-and-autonomy">Trust and autonomy</H2>
      <P>
        Autonomy is earned, not assumed. The{" "}
        <DocLink href="/documents/trust-gradient">trust gradient</DocLink> is
        a three-phase model — Observe, Propose, Act — that governs how much
        independence the AI has. Personal autonomy tracks each AI&apos;s
        competence per situation type, with graduation requiring admin approval.
      </P>

      <H2 id="security-governance">Security and governance</H2>
      <P>
        OAuth tokens are encrypted with AES-256-GCM. The platform runs on Neon
        PostgreSQL in Frankfurt with EU data residency. Three roles — superadmin,
        admin, member — provide scoped access control. Every AI decision is
        logged in a complete{" "}
        <DocLink href="/documents/audit-trail">audit trail</DocLink> with full
        reasoning traces.
      </P>
      <Note>
        To learn more, see{" "}
        <DocLink href="/documents/security-privacy">
          Security &amp; privacy
        </DocLink>{" "}
        and{" "}
        <DocLink href="/documents/policy-engine">Policy engine</DocLink>.
      </Note>

      <p className="mt-14 border-t border-[var(--border)] pt-6 text-[13px] leading-relaxed text-[var(--ink-muted)]">
        Qorpera is in active development. Feature availability may change as
        the platform evolves.
      </p>
    </>
  );
}
