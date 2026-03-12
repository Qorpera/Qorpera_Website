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
    "Learn how Qorpera connects to your business tools, builds a knowledge graph, detects operational situations, and deploys governed AI agents.",
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
        business tools, builds a unified knowledge graph of your organization,
        and deploys governed AI agents that detect situations, recommend
        actions, and learn from your team&apos;s decisions. Qorpera integrates
        with your CRM, communication, project management, and finance tools to
        form an operating layer for AI-driven operations.
      </P>
      <P>
        The platform provides a comprehensive suite of capabilities — from
        cross-system entity resolution and multi-signal situation detection, to
        a governed AI workforce with configurable autonomy levels. It is
        designed to be used by everyone in an organization, from operators
        reviewing AI proposals to executives monitoring operational health.
      </P>

      <Callout>
        Get started with the{" "}
        <DocLink href="/documents/getting-started">
          &ldquo;Quick-start walkthrough&rdquo;
        </DocLink>{" "}
        — connect your first tool and see your first situation detected in
        under 25 minutes.
      </Callout>

      <Note>
        The remainder of this page provides a brief overview of Qorpera&apos;s
        core capabilities. For more details about specific features, see the
        dedicated pages in the sidebar navigation.
      </Note>

      <H2 id="seamless-integration">Seamless integration</H2>
      <P>
        Qorpera connects to your existing tools via OAuth — HubSpot, Slack,
        Google Workspace, Linear, Stripe, and custom data sources. Rather than
        requiring data exports or manual syncs, the platform ingests events in
        real time through a unified event stream. Every contact, deal, project,
        invoice, message, and calendar event flows into a shared data layer
        that all AI agents can reason over.
      </P>
      <P>
        You can also build and interact with Qorpera&apos;s AI-powered agents
        and workflows that manage data from custom sources — including CSV
        imports, REST API endpoints, and webhook ingestion — enabling
        integration with virtually any business system.
      </P>

      <H2 id="knowledge-graph">Knowledge Graph Engine</H2>
      <P>
        At the core of the platform is the{" "}
        <DocLink href="/documents/knowledge-graph">
          Knowledge Graph Engine
        </DocLink>{" "}
        (KGE) — a configurable entity-property-relationship model that
        represents your business as a connected graph. Entity types are fully
        configurable: companies, contacts, deals, projects, invoices, or any
        domain-specific concept your organization needs.
      </P>
      <P>
        Identity resolution uses a four-step cascade — external reference
        matching, email, domain, and name — to automatically deduplicate and
        connect records across systems. The graph supports multi-hop traversal
        queries, set algebra operations, and composable query pipelines for
        complex analytical questions.
      </P>

      <H2 id="situation-awareness">Situation awareness</H2>
      <P>
        The{" "}
        <DocLink href="/documents/situation-detection">
          Situation Engine
        </DocLink>{" "}
        continuously monitors the knowledge graph for patterns that require
        attention. Unlike simple threshold alerts, situations represent
        multi-signal, cross-system patterns — a deal going cold while the
        assigned rep has an overloaded calendar and the client&apos;s support
        tickets are escalating. Situations are scored for urgency and impact,
        classified by domain, and routed to the appropriate agent or human
        operator.
      </P>

      <H2 id="governed-agents">Governed AI agents</H2>
      <P>
        Qorpera deploys specialized{" "}
        <DocLink href="/documents/agent-catalog">AI agents</DocLink> — each
        with defined roles, skills, and tool access. All agent actions are
        governed by a{" "}
        <DocLink href="/documents/policy-engine">policy engine</DocLink> that
        enforces ALLOW, DENY, or REQUIRE_APPROVAL rules per action type. Every
        decision is logged in a complete{" "}
        <DocLink href="/documents/audit-trail">audit trail</DocLink> with full
        data lineage.
      </P>
      <Note>
        To learn more about agent configuration and the tool registry, see{" "}
        <DocLink href="/documents/agent-catalog">Agent catalog</DocLink> and{" "}
        <DocLink href="/documents/skills-and-tools">Skills &amp; tools</DocLink>.
      </Note>

      <H2 id="trust-and-autonomy">Trust and autonomy</H2>
      <P>
        Autonomy is earned, not assumed. The{" "}
        <DocLink href="/documents/trust-gradient">trust gradient</DocLink> is
        a three-phase model — Observe, Propose, Act — that governs how much
        independence each agent has. Operators can adjust autonomy levels per
        agent and per action type at any time.
      </P>

      <H2 id="security-governance">Security and governance</H2>
      <P>
        All data is encrypted at rest using AES-256 and in transit using
        TLS 1.3. OAuth tokens, API keys, and skill credentials use per-record
        AES-256-GCM encryption. Data residency is configurable by region, with
        EU-only hosting available. Role-based access control, SSO support, and
        complete audit logging ensure every interaction is traceable.
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
        Note: Qorpera feature availability is subject to change and may differ
        between{" "}
        <DocLink href="/contact">plan tiers</DocLink>.
      </p>
    </>
  );
}
