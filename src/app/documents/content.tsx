import { PageHeader, P, H2, Note, Callout, DocLink, UL, LI, Term } from "./docs-primitives";

export interface DocPageData {
  title: string;
  description: string;
  body: React.ReactNode;
}

export const DOC_PAGES: Record<string, DocPageData> = {
  /* ================================================================
     QORPERA PLATFORM
     ================================================================ */

  "platform-architecture": {
    title: "Platform architecture",
    description:
      "The five layers of the Qorpera platform — from event ingestion to the learning loop.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Platform architecture" />
        <P>
          Qorpera is built as a five-layer stack. Each layer feeds into the next,
          creating a continuous loop from raw data ingestion through to
          autonomous action and learning.
        </P>

        <H2 id="event-stream">Event stream</H2>
        <P>
          The ingestion layer. Connectors sync data from your business tools and
          normalise output into a <Term>SyncYield</Term> union type — events,
          content, and activity signals. Each connector runs on a scheduled
          interval with 3-strike failure handling. Automated emails are
          pre-filtered using List-Unsubscribe header and body pattern analysis.
        </P>

        <H2 id="business-graph-layer">Business graph</H2>
        <P>
          The{" "}
          <DocLink href="/documents/business-graph">business graph</DocLink>{" "}
          resolves entities across five categories — foundational, base,
          internal, digital, and external — using weighted identity resolution
          (email, phone, domain, embedding similarity). Auto-merge at a score of
          0.8 or above, with snapshot-based reversibility.
        </P>

        <H2 id="situation-engine">Situation engine</H2>
        <P>
          Two detection paths run continuously.{" "}
          <DocLink href="/documents/situation-detection">
            Property-based detection
          </DocLink>{" "}
          evaluates entity properties via cron using structured, natural
          language, or hybrid modes. Content-based detection evaluates
          communication content (emails, Slack messages, Teams messages) for
          action items using LLM analysis. Situations are scored for urgency and
          routed to departments.
        </P>

        <H2 id="reasoning-layer">Reasoning layer</H2>
        <P>
          Context assembly v3 loads activity timelines, communication context
          (two-pass retrieval), and cross-department signals for external
          entities. Policy rules are checked before reasoning begins. Below
          12,000 estimated context tokens, a single-pass analysis runs. Above
          that threshold, multi-agent reasoning activates — three specialists
          (financial, communication, process/compliance) plus a coordinator
          synthesizer.
        </P>

        <H2 id="learning-loop">Learning loop</H2>
        <P>
          Every approval, edit, or rejection feeds back into the system.{" "}
          <DocLink href="/documents/trust-gradient">PersonalAutonomy</DocLink>{" "}
          records track consecutive approvals, total proposed and approved
          counts, and approval rate per AI entity per situation type. Graduation
          triggers a notification; an admin must manually promote. Detection
          sensitivity adjusts over time based on feedback patterns.
        </P>
      </>
    ),
  },

  "getting-started": {
    title: "Getting started",
    description:
      "Connect your first tools and see your first situation detected.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Getting started" />
        <P>
          Getting started with Qorpera takes seven steps — from account creation
          to your first AI-detected situation.
        </P>

        <H2 id="create-account">1. Create your account</H2>
        <P>
          Accept your invite and sign in. A personal AI assistant entity is
          automatically created for you and inherits your department memberships.
        </P>

        <H2 id="build-org-map">2. Build your org map</H2>
        <P>
          Add departments, define entity types with custom properties, and add
          team members. This human-built structure seeds the{" "}
          <DocLink href="/documents/business-graph">business graph</DocLink>.
        </P>

        <H2 id="connect-tools">3. Connect your tools</H2>
        <P>
          Authorise personal connectors (Gmail, Calendar, Drive, Sheets) with
          your own OAuth. Company connectors (HubSpot, Slack, Stripe) are set up
          once at the operator level. See{" "}
          <DocLink href="/documents/connecting-tools">Connecting tools</DocLink>{" "}
          for details.
        </P>

        <H2 id="initial-sync">4. Initial sync</H2>
        <P>
          Connectors run their first sync. Entities are resolved using weighted
          identity scoring, and the business graph populates automatically.
        </P>

        <H2 id="configure-situations">5. Configure situation types</H2>
        <P>
          Admins define situation types per department — the patterns the AI
          should watch for. Detection logic can be structured signals, natural
          language rules, or a hybrid of both.
        </P>

        <H2 id="first-situations">6. First situations surface</H2>
        <P>
          Within hours of sync completing, the situation engine begins detecting
          patterns across your connected data. Property-based and content-based
          detection run continuously.
        </P>

        <H2 id="review-proposals">7. Review and teach</H2>
        <P>
          Review AI proposals — approve, edit, or reject. Every decision teaches
          your personal AI and builds toward earned autonomy through the{" "}
          <DocLink href="/documents/trust-gradient">trust gradient</DocLink>.
        </P>

        <Callout>
          Most teams see their first detected situations within a few hours of
          connecting their tools. The AI gets meaningfully better within the
          first two weeks of active use.
        </Callout>
      </>
    ),
  },

  "business-graph": {
    title: "Business graph",
    description:
      "How Qorpera resolves entities across tools into a unified business graph.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Business graph" />
        <P>
          The business graph is Qorpera&apos;s unified data model — a connected
          representation of every person, company, asset, and record across your
          organisation.
        </P>

        <H2 id="entity-categories">Entity categories</H2>
        <P>
          Entities are organised into five categories:
        </P>
        <UL>
          <LI>
            <Term>Foundational</Term> — departments, the structural backbone of
            your organisation.
          </LI>
          <LI>
            <Term>Base</Term> — people, assets, and AI agents. Created during
            org map setup.
          </LI>
          <LI>
            <Term>Internal</Term> — documents uploaded to provide RAG context
            for AI reasoning.
          </LI>
          <LI>
            <Term>Digital</Term> — records sourced from connectors (CRM
            contacts, invoices, tickets).
          </LI>
          <LI>
            <Term>External</Term> — customers, partners, and competitors. These
            float outside the department hierarchy and connect via relationship
            chains.
          </LI>
        </UL>

        <H2 id="entity-types">Entity types and properties</H2>
        <P>
          Entity types are defined per operator with custom properties. Each
          property can carry an identity role (email, domain, phone) used during
          resolution. The graph is seeded by the human-built org map and
          continuously enriched by connector data.
        </P>

        <H2 id="identity-resolution">Identity resolution</H2>
        <P>
          When new records arrive from connectors, Qorpera resolves them against
          existing entities using ML-based weighted scoring: email exact match
          (+0.5), phone (+0.2), domain (+0.15), and embedding similarity
          (+0.15). A same-source hard block (-1.0) prevents false merges within
          a single system. Records scoring 0.8 or above are auto-merged.
        </P>
        <P>
          Every merge creates a snapshot, so merges can be reversed if the
          resolution was incorrect.
        </P>

        <H2 id="relationships">Relationships</H2>
        <P>
          Relationships connect entities across categories — a person belongs to
          a department, a customer has open invoices, a project is linked to a
          partner. These connections give the situation engine the cross-system
          context it needs to detect meaningful patterns.
        </P>
      </>
    ),
  },

  "situation-detection": {
    title: "Situation detection",
    description:
      "How Qorpera detects operational situations through property-based and content-based analysis.",
    body: (
      <>
        <PageHeader
          group="Qorpera Platform"
          title="Situation detection"
        />
        <P>
          Qorpera detects situations through two complementary paths — one
          watching structured data, the other analysing communication content.
        </P>

        <H2 id="property-based">Property-based detection</H2>
        <P>
          A cron job evaluates entity properties against each{" "}
          <Term>SituationType</Term>&apos;s detection logic. Three modes are
          supported: structured (direct property comparisons), natural language
          (LLM-evaluated rules), and hybrid (structured pre-filter with natural
          language refinement). Matching entities generate situations with
          urgency scoring, linked to the trigger entities and routed to
          departments.
        </P>

        <H2 id="content-based">Content-based detection</H2>
        <P>
          After each connector sync, communication content — emails, Slack
          messages, Teams messages — is evaluated by LLM for action items and
          operational signals. Automated emails (newsletters, marketing) are
          pre-filtered using List-Unsubscribe headers and body pattern analysis.
          The actor is determined by context: the recipient for inbound emails,
          the non-author for Slack and Teams messages.
        </P>

        <H2 id="deduplication">Deduplication</H2>
        <P>
          New situations are checked against existing open situations using LLM
          semantic matching. If a new detection matches an already-open
          situation, it is merged rather than creating a duplicate.
        </P>

        <H2 id="routing">Routing and urgency</H2>
        <P>
          Situations are created with an urgency score, linked to the entities
          that triggered them, and routed to the appropriate department. The{" "}
          <DocLink href="/documents/trust-gradient">trust gradient</DocLink>{" "}
          determines whether the AI observes, proposes an action, or acts
          autonomously.
        </P>
      </>
    ),
  },

  "trust-gradient": {
    title: "Trust gradient",
    description:
      "How AI autonomy is earned through the Observe → Propose → Act progression.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Trust gradient" />
        <P>
          Autonomy in Qorpera is earned, not assumed. The trust gradient governs
          how much independence the AI has — progressing through three phases as
          it demonstrates competence.
        </P>

        <H2 id="three-phases">Three phases</H2>
        <UL>
          <LI>
            <Term>Observe</Term> — the AI monitors and surfaces situations with
            context, but takes no action.
          </LI>
          <LI>
            <Term>Propose</Term> — the AI recommends specific actions. Humans
            approve, edit, or reject each proposal.
          </LI>
          <LI>
            <Term>Act</Term> — the AI handles routine tasks autonomously, with
            full visibility and instant revoke.
          </LI>
        </UL>

        <H2 id="two-levels">Two levels of autonomy</H2>
        <P>
          Autonomy operates at two levels. Department-level autonomy is set on
          each <Term>SituationType</Term> and serves as the default for all new
          personal autonomy rows. Personal-level autonomy is tracked per
          employee&apos;s AI entity per situation type via{" "}
          <Term>PersonalAutonomy</Term> records.
        </P>

        <H2 id="graduation">Graduation</H2>
        <P>
          <Term>PersonalAutonomy</Term> tracks consecutive approvals, total
          proposed, total approved, and approval rate. When the graduation
          threshold is reached, a notification is created — an admin must
          manually promote the AI to the next autonomy level. Rejection resets
          the consecutive approval count.
        </P>
        <P>
          The highest personal autonomy among scoped users determines the
          effective autonomy for a given situation.
        </P>

        <Note>
          Policy rules can force <Term>REQUIRE_APPROVAL</Term> regardless of
          autonomy level. See{" "}
          <DocLink href="/documents/policy-engine">Policy engine</DocLink>.
        </Note>
      </>
    ),
  },

  /* ================================================================
     YOUR AI
     ================================================================ */

  "how-ai-learns": {
    title: "How the AI learns",
    description:
      "Every employee gets a personal AI entity that learns from their decisions.",
    body: (
      <>
        <PageHeader group="Your AI" title="How the AI learns" />
        <P>
          Every employee gets a personal AI entity, automatically created when
          they accept their invite. The AI inherits department memberships from
          its owner — when the owner gains a cross-department membership, the AI
          mirrors it.
        </P>

        <H2 id="personal-autonomy">Personal autonomy records</H2>
        <P>
          <Term>PersonalAutonomy</Term> records are created per (situation type,
          AI entity) pair on first approval. Each subsequent approval increments
          the counters; rejection resets <Term>consecutiveApprovals</Term>.
          Learning is cumulative — the AI builds a track record across every
          situation type it encounters.
        </P>

        <H2 id="portable-learning">Portable learning</H2>
        <P>
          Learning is portable across departments. If Maria teaches her AI about
          invoice reminders in Finance, that learning applies wherever she
          operates. The AI&apos;s competence follows the person, not the
          department.
        </P>

        <H2 id="visibility">Visibility</H2>
        <P>
          Individual users can see their AI&apos;s progress on their Account
          page — approval rates, consecutive streaks, and autonomy levels per
          situation type. Admins have a Learning page showing all AI entities
          across the organisation with their current competence levels.
        </P>
      </>
    ),
  },

  copilot: {
    title: "Copilot",
    description:
      "The conversational interface to the business graph and situation engine.",
    body: (
      <>
        <PageHeader group="Your AI" title="Copilot" />
        <P>
          The copilot is Qorpera&apos;s conversational interface — a chat-based
          tool for querying the business graph, reviewing situations, and
          triggering actions.
        </P>

        <H2 id="available-tools">Available tools</H2>
        <UL>
          <LI>
            <Term>get_situations</Term> — retrieve current situations for your
            departments.
          </LI>
          <LI>
            <Term>get_entity_details</Term> — pull full entity context including
            properties and relationships.
          </LI>
          <LI>
            <Term>search_entities</Term> — search across the business graph.
          </LI>
          <LI>
            <Term>get_department_overview</Term> — summary of department health
            and activity.
          </LI>
          <LI>
            <Term>get_message_thread</Term> — retrieve communication threads,
            scoped to the requesting user&apos;s synced data only.
          </LI>
          <LI>
            <Term>send_email</Term> / <Term>reply_to_thread</Term> — write-back
            actions using the approving user&apos;s personal OAuth token.
          </LI>
        </UL>

        <H2 id="closed-world">Closed-world reasoning</H2>
        <P>
          The copilot uses closed-world reasoning: it only acts on retrieved
          evidence, never guesses. Context assembly pulls entity properties,
          relationships, activity timelines, communication excerpts, and
          cross-department signals (for external entities).
        </P>

        <H2 id="privacy-model">Privacy model</H2>
        <P>
          Aggregated activity patterns are visible to all scoped users, but
          email and message content is only shown from the requesting
          user&apos;s own synced data. Write-back actions (sending emails,
          replying to threads) execute using the approving user&apos;s personal
          credentials.
        </P>
      </>
    ),
  },

  "approval-workflow": {
    title: "Approval workflow",
    description:
      "How proposals are reviewed, approved, edited, or rejected.",
    body: (
      <>
        <PageHeader group="Your AI" title="Approval workflow" />
        <P>
          When a situation&apos;s autonomy level is supervised (Propose phase),
          the AI generates a recommended action and queues it for human review.
        </P>

        <H2 id="review-interface">Review interface</H2>
        <P>
          The reviewer sees the full situation context, the proposed action, and
          the evidence that led to the recommendation. Three options are
          available:
        </P>
        <UL>
          <LI>
            <Term>Approve</Term> — executes the action and increments approval
            counters in the AI&apos;s{" "}
            <DocLink href="/documents/how-ai-learns">
              PersonalAutonomy
            </DocLink>{" "}
            record.
          </LI>
          <LI>
            <Term>Edit</Term> — modifies the action before execution. Still
            counts as guidance for the learning system.
          </LI>
          <LI>
            <Term>Reject</Term> — blocks the action, resets consecutive
            approvals, and provides a negative learning signal.
          </LI>
        </UL>

        <H2 id="policy-override">Policy override</H2>
        <P>
          <DocLink href="/documents/policy-engine">Policy rules</DocLink> can
          force <Term>REQUIRE_APPROVAL</Term> regardless of the situation
          type&apos;s autonomy level or the AI&apos;s personal autonomy. This
          ensures sensitive actions always require human sign-off.
        </P>

        <H2 id="write-back">Write-back execution</H2>
        <P>
          Approved actions that involve write-back — sending an email, updating
          a CRM record — execute using the approving user&apos;s credentials.
          The action is logged in the{" "}
          <DocLink href="/documents/audit-trail">audit trail</DocLink> with
          full attribution.
        </P>
      </>
    ),
  },

  /* ================================================================
     INTEGRATIONS
     ================================================================ */

  "connecting-tools": {
    title: "Connecting tools",
    description:
      "How Qorpera connects to your business tools via OAuth.",
    body: (
      <>
        <PageHeader group="Integrations" title="Connecting tools" />
        <P>
          Qorpera connects to your tools via OAuth. Two connector types serve
          different scoping needs.
        </P>

        <H2 id="personal-connectors">Personal connectors</H2>
        <P>
          Personal connectors require per-user OAuth — each team member
          authorises their own account. The <Term>userId</Term> is stored on the{" "}
          <Term>SourceConnector</Term> record. Personal connectors include
          Gmail, Google Drive, Google Calendar, Google Sheets, Outlook,
          OneDrive, Teams, and Excel.
        </P>

        <H2 id="company-connectors">Company connectors</H2>
        <P>
          Company connectors are operator-level — one authorisation covers the
          whole organisation. These include HubSpot, Stripe, and Slack.
        </P>

        <H2 id="oauth-flow">OAuth flow</H2>
        <P>
          The auth-url endpoint generates a CSRF state cookie. The user is
          redirected to the provider for authorisation, then back to the
          callback endpoint where the token exchange occurs. Tokens are encrypted
          with AES-256-GCM and stored in the database.
        </P>

        <H2 id="sync-mechanics">Sync mechanics</H2>
        <P>
          Each connector runs on a scheduled interval. Output is normalised into
          the <Term>SyncYield</Term> union type — events, content, and activity
          signals. A 3-strike failure handling mechanism disables connectors
          after repeated failures.
        </P>
      </>
    ),
  },

  "google-workspace": {
    title: "Gmail & Google Workspace",
    description:
      "Gmail, Drive, Calendar, and Sheets integration — personal OAuth per user.",
    body: (
      <>
        <PageHeader
          group="Integrations"
          title="Gmail & Google Workspace"
        />
        <P>
          Four personal connectors, each authorised per user via Google OAuth.
        </P>

        <H2 id="gmail">Gmail</H2>
        <P>
          Email sync with thread grouping and direction detection
          (sent/received). Automated emails are filtered using List-Unsubscribe
          header and body pattern analysis — not address blocklisting.
          Operationally critical emails from noreply addresses (e.g. payment
          failure notices) pass through. Write-back:{" "}
          <Term>send_email</Term> and <Term>reply_to_thread</Term> using the
          user&apos;s personal token.
        </P>

        <H2 id="google-drive">Google Drive</H2>
        <P>
          Document sync with local file parsing — docx via mammoth, xlsx via
          SheetJS. Document write-back is supported (scope upgrade included in
          the OAuth flow).
        </P>

        <H2 id="google-calendar">Google Calendar</H2>
        <P>
          Event sync with attendee resolution against the business graph.
          Calendar events provide scheduling context for situation detection.
        </P>

        <H2 id="google-sheets">Google Sheets</H2>
        <P>
          Spreadsheet rows are indexed as a single <Term>ContentChunk</Term> —
          treated as a document, not as individual events. This provides RAG
          context for AI reasoning over structured data.
        </P>
      </>
    ),
  },

  slack: {
    title: "Slack",
    description:
      "Company-level Slack integration with channel sync and content detection.",
    body: (
      <>
        <PageHeader group="Integrations" title="Slack" />
        <P>
          Slack is a company-level connector — one operator OAuth authorisation
          covers the whole organisation.
        </P>

        <H2 id="channel-sync">Channel sync</H2>
        <P>
          Qorpera discovers and syncs channels, grouping messages into threads.
          Thread grouping preserves conversation context for accurate situation
          detection.
        </P>

        <H2 id="content-detection">Content detection</H2>
        <P>
          Message content is ingested as <Term>ContentChunks</Term> and
          evaluated by content-based situation detection. The AI identifies
          action items, escalations, and operational signals within
          conversations.
        </P>

        <H2 id="activity-signals">Activity signals</H2>
        <P>
          Activity signals track message volume, response patterns, and
          engagement per entity — providing the situation engine with
          communication health indicators.
        </P>

        <H2 id="write-back">Write-back</H2>
        <P>
          AI agents can post messages to channels as part of approved actions.
        </P>
      </>
    ),
  },

  "microsoft-365": {
    title: "Microsoft 365",
    description:
      "Outlook, OneDrive, Teams, and Excel integration under a single personal OAuth.",
    body: (
      <>
        <PageHeader group="Integrations" title="Microsoft 365" />
        <P>
          Microsoft 365 is a personal connector — each user authorises via
          Microsoft OAuth. All four sub-syncs run under a single authorisation.
        </P>

        <H2 id="outlook">Outlook</H2>
        <P>
          Email sync with thread grouping and direction detection, matching
          Gmail&apos;s functionality. Content-based situation detection evaluates
          email content for action items.
        </P>

        <H2 id="onedrive">OneDrive</H2>
        <P>
          Document sync with local file parsing — mammoth for .docx, SheetJS for
          .xlsx. Write-back is supported for documents.
        </P>

        <H2 id="teams">Teams</H2>
        <P>
          Message sync with thread grouping. Messages include{" "}
          <Term>messageId</Term> in metadata for precise threading.
          Content-based detection identifies action items in team conversations.
        </P>

        <H2 id="excel">Excel</H2>
        <P>
          Spreadsheet parsing via SheetJS, indexed as content chunks for RAG
          context.
        </P>
      </>
    ),
  },

  hubspot: {
    title: "HubSpot",
    description:
      "Company-level HubSpot CRM integration with entity resolution.",
    body: (
      <>
        <PageHeader group="Integrations" title="HubSpot" />
        <P>
          HubSpot is a company-level connector — one authorisation covers the
          whole organisation.
        </P>

        <H2 id="synced-data">Synced data</H2>
        <P>
          Qorpera syncs contacts, companies, and deals from HubSpot. Records are
          resolved into the{" "}
          <DocLink href="/documents/business-graph">business graph</DocLink>{" "}
          using email and domain identity resolution.
        </P>

        <H2 id="event-tracking">Event tracking</H2>
        <P>
          Deal stage changes, contact updates, and company associations are
          tracked as events in the event stream. Properties from HubSpot records
          are mapped to entity properties in the business graph.
        </P>

        <H2 id="situation-triggers">Situation triggers</H2>
        <P>
          CRM data feeds directly into property-based situation detection —
          stalling deals, contact churn signals, and pipeline anomalies surface
          automatically.
        </P>
      </>
    ),
  },

  stripe: {
    title: "Stripe",
    description:
      "Company-level Stripe integration for payment and invoice tracking.",
    body: (
      <>
        <PageHeader group="Integrations" title="Stripe" />
        <P>
          Stripe is a company-level connector — one authorisation covers the
          whole organisation.
        </P>

        <H2 id="synced-data">Synced data</H2>
        <P>
          Qorpera syncs customers, invoices, payments, and subscriptions from
          Stripe. Payment events and invoice status changes flow into the event
          stream.
        </P>

        <H2 id="entity-resolution">Entity resolution</H2>
        <P>
          Customer records are resolved against the{" "}
          <DocLink href="/documents/business-graph">business graph</DocLink>{" "}
          via email matching, linking payment data to the broader customer
          context.
        </P>

        <H2 id="situation-detection">Situation detection</H2>
        <P>
          Overdue invoices and failed payments surface as situations through
          property-based detection. Combined with CRM and communication data,
          the AI can distinguish between negligence and genuine account issues.
        </P>
      </>
    ),
  },

  /* ================================================================
     GOVERNANCE
     ================================================================ */

  "policy-engine": {
    title: "Policy engine",
    description:
      "ALLOW, DENY, and REQUIRE_APPROVAL rules that govern AI actions.",
    body: (
      <>
        <PageHeader group="Governance" title="Policy engine" />
        <P>
          Policies define the boundaries of AI behaviour — what it can do, what
          it cannot, and what requires human approval.
        </P>

        <H2 id="rule-types">Rule types</H2>
        <P>
          Three rule types are supported:
        </P>
        <UL>
          <LI>
            <Term>ALLOW</Term> — the action may proceed without additional
            checks.
          </LI>
          <LI>
            <Term>DENY</Term> — the action is blocked entirely.
          </LI>
          <LI>
            <Term>REQUIRE_APPROVAL</Term> — the action is queued for human
            review, regardless of the AI&apos;s autonomy level.
          </LI>
        </UL>

        <H2 id="scope">Scope</H2>
        <P>
          Policies are scoped per action type and per department. They are
          evaluated before any AI action executes — governance before reasoning.
          Admins create and manage policies.
        </P>

        <H2 id="precedence">Precedence</H2>
        <P>
          Policy rules always take precedence over the situation type&apos;s
          default autonomy level and over the AI&apos;s personal autonomy. A{" "}
          <Term>REQUIRE_APPROVAL</Term> policy forces supervised mode even if
          the AI has earned Act-level autonomy. The policy evaluator accepts an
          optional <Term>personalAutonomyLevel</Term> parameter that can
          override the situation type&apos;s default, but policy rules always
          win.
        </P>
      </>
    ),
  },

  "audit-trail": {
    title: "Audit trail",
    description:
      "Every AI decision is logged with full reasoning traces and evidence.",
    body: (
      <>
        <PageHeader group="Governance" title="Audit trail" />
        <P>
          Every AI decision in Qorpera is logged — providing complete
          transparency into what the AI did, why, and what the outcome was.
        </P>

        <H2 id="what-is-logged">What is logged</H2>
        <P>
          Each audit entry records: which situation triggered the action, what
          context was assembled, what action was proposed, whether it was
          approved, edited, or rejected, and what the outcome was. Entries
          include the full reasoning trace with evidence citations.
        </P>

        <H2 id="filtering">Filtering</H2>
        <P>
          Admins can review the audit trail filtered by department, by entity,
          or by situation type. This makes it easy to investigate specific
          decisions or review AI behaviour patterns across a domain.
        </P>

        <H2 id="accountability">Accountability</H2>
        <P>
          The audit trail is the accountability layer. When an AI action
          produces an unexpected result, the trail shows exactly what evidence
          was considered, what reasoning was applied, and who approved the
          action. Full transparency, full traceability.
        </P>
      </>
    ),
  },

  "security-privacy": {
    title: "Security & privacy",
    description:
      "Encryption, access control, and data residency.",
    body: (
      <>
        <PageHeader group="Governance" title="Security & privacy" />
        <P>
          Qorpera is built with security and privacy as foundational concerns,
          not afterthoughts.
        </P>

        <H2 id="infrastructure">Infrastructure</H2>
        <P>
          The platform runs on Neon PostgreSQL in Frankfurt
          (aws-eu-central-1), providing EU data residency. Vector search uses
          pgvector with <Term>vector(1536)</Term> columns and HNSW indexes.
        </P>

        <H2 id="encryption">Encryption</H2>
        <P>
          All OAuth tokens and sensitive credentials are encrypted with
          AES-256-GCM, encrypted at rest and decrypted only at execution time.
          CSRF protection is enforced on all state-changing endpoints. Content
          Security Policy headers are set on all responses.
        </P>

        <H2 id="access-control">Access control</H2>
        <P>
          Three roles govern access:
        </P>
        <UL>
          <LI>
            <Term>Superadmin</Term> — Qorpera support. Can enter any operator.
            Invisible to regular users.
          </LI>
          <LI>
            <Term>Admin</Term> — company leadership. Full CRUD within their
            operator.
          </LI>
          <LI>
            <Term>Member</Term> — employees. Scoped to specific departments via
            the UserScope table.
          </LI>
        </UL>
        <P>
          Multi-tenant isolation ensures operators cannot see each other&apos;s
          data. The copilot privacy model ensures email and message content is
          only shown from the requesting user&apos;s own synced data.
        </P>
      </>
    ),
  },
};
