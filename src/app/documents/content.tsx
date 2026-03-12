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
          Qorpera is built as a five-layer stack. Each layer is self-contained
          but feeds into the next, creating a continuous loop from raw data
          ingestion through to autonomous action and learning.
        </P>

        <H2 id="event-stream">Event Stream</H2>
        <P>
          The Event Stream is the ingestion layer. It receives real-time events
          from every connected integration — CRM record changes, Slack
          messages, calendar updates, payment events, issue status transitions
          — and normalises them into a consistent event format. Events are
          processed in order and tagged with source, timestamp, and entity
          references before being passed to the Knowledge Graph.
        </P>

        <H2 id="knowledge-graph-layer">Knowledge Graph</H2>
        <P>
          The{" "}
          <DocLink href="/documents/knowledge-graph">
            Knowledge Graph Engine
          </DocLink>{" "}
          resolves incoming events into entities, properties, and
          relationships. A new HubSpot contact, a Slack mention, and a Google
          Calendar invite involving the same person are all merged into a
          single entity node. The graph provides the unified, cross-system
          context that all downstream layers depend on.
        </P>

        <H2 id="situation-engine-layer">Situation Engine</H2>
        <P>
          The{" "}
          <DocLink href="/documents/situation-detection">
            Situation Engine
          </DocLink>{" "}
          continuously scans the knowledge graph for multi-signal patterns
          that require attention. It produces scored, classified situations
          that are routed to the appropriate agent or human operator. The
          engine learns from feedback — which situations your team acts on and
          which they dismiss — and adjusts its sensitivity over time.
        </P>

        <H2 id="reasoning-layer">Reasoning Layer</H2>
        <P>
          When an agent receives a situation, the Reasoning Layer determines
          what action to take. It evaluates the available tools, checks the{" "}
          <DocLink href="/documents/policy-engine">policy engine</DocLink>{" "}
          for permission, and either executes the action, queues it for
          approval, or records the observation. Every decision is logged with
          full data lineage — which entities were involved, what signals
          triggered the situation, and what the agent decided.
        </P>

        <H2 id="learning-loop">Learning Loop</H2>
        <P>
          The Learning Loop closes the cycle. Every human decision — an
          approval, rejection, correction, or dismissal — feeds back into the
          system. The Situation Engine refines its pattern detection, agents
          adjust their recommendations, and the{" "}
          <DocLink href="/documents/trust-gradient">trust gradient</DocLink>{" "}
          evolves based on accumulated accuracy. This means the platform
          becomes more useful the longer you use it.
        </P>
      </>
    ),
  },

  "getting-started": {
    title: "Getting started",
    description:
      "Connect your first tool, describe your organisation, and see your first situation in 25 minutes.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Getting started" />
        <P>
          This guide walks you through first-time setup — from creating your
          account to seeing your first detected situation. The whole process
          takes about 25 minutes.
        </P>

        <H2 id="describe-your-company">Step 1 — Describe your company</H2>
        <P>
          The Company Soul is a structured description of your business that
          gives the AI the context it needs. You will provide your company
          name, industry, what you do, how your team is structured, and what
          matters most to your operations. This is not a one-time exercise —
          you can refine it at any time from Settings.
        </P>
        <P>
          A good company description focuses on how your business actually
          works day to day, not marketing copy. Include the tools you use, the
          workflows that matter, and the kinds of problems that tend to slip
          through the cracks.
        </P>

        <H2 id="connect-your-first-tool">Step 2 — Connect your first tool</H2>
        <P>
          Navigate to Settings → Integrations and connect at least one tool.
          We recommend starting with your CRM (HubSpot) or communication tool
          (Slack), as these produce the highest volume of actionable events.
          Each integration uses OAuth — you will be redirected to the
          provider to authorise access, then returned to Qorpera.
        </P>
        <Note>
          For details on each integration, see{" "}
          <DocLink href="/documents/connecting-tools">
            Connecting tools
          </DocLink>
          .
        </Note>

        <H2 id="activate-agents">Step 3 — Activate your agents</H2>
        <P>
          Your plan tier determines how many agents you can activate. Navigate
          to Agents and activate the agents most relevant to your business.
          Start with the Chief Advisor (general oversight) and one
          domain-specific agent — for example, the Sales Representative if you
          connected HubSpot, or the Technical Lead if you connected Linear.
        </P>

        <H2 id="review-situations">Step 4 — Review your first situations</H2>
        <P>
          Once integrations are connected and agents are active, the Situation
          Engine begins processing events. Your first situations will appear
          within minutes. Each situation includes a description of the pattern
          detected, the entities involved, the urgency score, and a
          recommended action. Review the situation, approve or dismiss the
          recommendation, and the system starts learning from your decisions.
        </P>

        <H2 id="adjust-trust">Step 5 — Adjust the trust gradient</H2>
        <P>
          All agents start in Observe mode by default. Once you are
          comfortable with the quality of their detections, you can promote
          them to Propose (recommend actions for approval) and eventually Act
          (execute autonomously). See{" "}
          <DocLink href="/documents/trust-gradient">Trust gradient</DocLink>{" "}
          for details on configuring autonomy.
        </P>
      </>
    ),
  },

  "knowledge-graph": {
    title: "Knowledge Graph Engine",
    description:
      "Entity types, identity resolution, properties, relationships, and graph queries.",
    body: (
      <>
        <PageHeader
          group="Qorpera Platform"
          title="Knowledge Graph Engine"
        />
        <P>
          The Knowledge Graph Engine (KGE) is the central data model of the
          Qorpera platform. It represents your business as a graph of
          entities connected by typed relationships, with properties stored as
          an entity-attribute-value (EAV) model. The KGE is fully
          configurable — you define the entity types, property schemas, and
          relationship types that matter to your domain.
        </P>

        <H2 id="entity-types">Entity types and properties</H2>
        <P>
          An entity type defines a class of objects in your business — a
          Company, Contact, Deal, Project, Invoice, or any custom type you
          create. Each entity type has a set of property definitions that
          specify the attributes it can carry. Properties are typed (text,
          number, date, boolean, JSON) and can be marked as identity
          properties — meaning they participate in entity resolution.
        </P>
        <P>
          Identity roles include <Term>email</Term>, <Term>domain</Term>,
          and <Term>phone</Term>. When a new record arrives from an
          integration and carries a property with an identity role, the
          resolution engine uses it to match against existing entities.
        </P>

        <H2 id="identity-resolution">Identity resolution</H2>
        <P>
          Identity resolution is a four-step cascade that runs every time a
          new record enters the system:
        </P>
        <UL>
          <LI>
            <strong>External reference</strong> — match by the source
            system&apos;s unique ID (e.g. HubSpot contact ID)
          </LI>
          <LI>
            <strong>Email</strong> — match by email address across all systems
          </LI>
          <LI>
            <strong>Domain</strong> — match by company domain (for
            organisation-level entities)
          </LI>
          <LI>
            <strong>Name</strong> — fuzzy match by display name as a last
            resort
          </LI>
        </UL>
        <P>
          Each step is tried in order. If a match is found, the incoming data
          is merged into the existing entity. If no match is found, a new
          entity is created. The result is a single, deduplicated entity that
          accumulates data from every connected system.
        </P>

        <H2 id="entity-mentions">Entity mentions</H2>
        <P>
          Every time an entity is referenced in an event — a CRM record
          update, a Slack message mentioning a client name, a calendar invite
          with a contact — an entity mention is recorded. Mentions build a
          complete interaction timeline across all systems, which the
          Situation Engine uses to detect patterns over time.
        </P>

        <H2 id="graph-queries">Graph queries and traversal</H2>
        <P>
          The KGE supports multi-hop graph traversal using both BFS (breadth-first
          search) and recursive PostgreSQL CTEs. The <Term>searchAround</Term>{" "}
          function returns all entities within N hops of a starting node,
          optionally filtered by entity type or relationship type. Set algebra
          operations (union, intersection, difference) can be composed with
          traversal results to answer complex questions like &ldquo;all deals
          involving contacts who also have open support tickets.&rdquo;
        </P>
        <Note>
          Graph queries power the Situation Engine and are also available to
          agents via the <Term>search_around</Term> tool. See{" "}
          <DocLink href="/documents/skills-and-tools">
            Skills &amp; tools
          </DocLink>{" "}
          for agent tool documentation.
        </Note>
      </>
    ),
  },

  "situation-detection": {
    title: "Situation detection",
    description:
      "How the Situation Engine detects multi-signal patterns across your operation.",
    body: (
      <>
        <PageHeader
          group="Qorpera Platform"
          title="Situation detection"
        />
        <P>
          The Situation Engine is the pattern-detection layer of the Qorpera
          platform. It continuously monitors the knowledge graph for
          combinations of signals that, taken together, represent something
          worth acting on. A situation is not a simple alert — it is a
          cross-system, multi-signal pattern with a scored urgency and a
          recommended course of action.
        </P>

        <H2 id="what-is-a-situation">What is a situation?</H2>
        <P>
          A situation is a detected pattern that represents an operational
          event requiring attention. Examples include: a high-value deal going
          cold while the assigned rep&apos;s calendar is overloaded; a
          customer whose support tickets are escalating while their renewal
          date approaches; or a project whose velocity has dropped while key
          team members are on leave.
        </P>
        <P>
          Each situation includes the entities involved, the signals that
          triggered it, a domain classification (revenue, operations, team
          health, compliance), an urgency score, and a recommended action.
        </P>

        <H2 id="scoring">Scoring and classification</H2>
        <P>
          Situations are scored on two axes: urgency (how soon does this need
          attention?) and impact (how significant are the consequences of
          inaction?). The composite score determines the situation&apos;s
          position in the feed and which agent receives it. Domain
          classification routes situations to the most appropriate agent — a
          revenue situation goes to the Sales Representative, an engineering
          blocker goes to the Technical Lead.
        </P>

        <H2 id="routing">Routing and escalation</H2>
        <P>
          Situations are routed to agents based on domain and urgency. If an
          agent is in Observe mode, the situation is recorded and surfaced in
          the dashboard for human review. If the agent is in Propose mode, a
          recommended action is generated and queued for approval. If the
          agent has been promoted to Act mode for that action type, execution
          is automatic. Situations that remain unaddressed escalate upward in
          the feed.
        </P>

        <H2 id="learning">Learning from feedback</H2>
        <P>
          Every time you approve, reject, dismiss, or correct a situation, the
          Situation Engine records the feedback. Over time, the platform learns
          which patterns your specific organisation cares about and which are
          noise. This feedback loop is per-organisation — the model is yours,
          not a generic ruleset shared across customers.
        </P>
      </>
    ),
  },

  "trust-gradient": {
    title: "Trust gradient",
    description:
      "The three-phase autonomy model — Observe, Propose, Act — and how to configure it.",
    body: (
      <>
        <PageHeader group="Qorpera Platform" title="Trust gradient" />
        <P>
          The trust gradient is Qorpera&apos;s model for graduated AI
          autonomy. Rather than giving agents full access from day one, the
          system starts conservatively and increases autonomy as accuracy is
          proven. Operators retain full control at every stage.
        </P>

        <H2 id="observe-phase">Observe</H2>
        <P>
          In the Observe phase, agents monitor the knowledge graph and detect
          situations, but take no action. Every detection is logged and
          surfaced in the dashboard for human review. This phase lets you
          evaluate the quality of the agent&apos;s situational awareness
          before granting any execution capability.
        </P>

        <H2 id="propose-phase">Propose</H2>
        <P>
          In the Propose phase, agents recommend specific actions when they
          detect a situation. Proposals are queued in the approval panel for
          human review. You can approve, reject, or modify each proposal.
          Approved actions are executed; rejected proposals feed back into the
          learning loop. This phase is where most organisations operate day to
          day — AI surfaces recommendations, humans make the final call.
        </P>

        <H2 id="act-phase">Act</H2>
        <P>
          In the Act phase, agents execute approved action types
          autonomously. You configure which specific actions an agent can
          perform without approval — for example, sending a Slack notification
          might be autonomous while creating a HubSpot deal still requires
          approval. Every autonomous action is logged in the{" "}
          <DocLink href="/documents/audit-trail">audit trail</DocLink> with
          full lineage.
        </P>

        <H2 id="configuring-trust">Configuration</H2>
        <P>
          Trust levels are configured per agent and per action type. You can
          promote an agent from Observe to Propose globally, or grant Act
          permissions only for specific low-risk actions. Trust can be revoked
          at any time — moving an agent back to Observe takes effect
          immediately. There is no automatic promotion; all trust changes
          are explicit human decisions.
        </P>
      </>
    ),
  },

  /* ================================================================
     AI AGENTS
     ================================================================ */

  "agent-catalog": {
    title: "Agent catalog",
    description:
      "The ten specialised AI agent types available in Qorpera.",
    body: (
      <>
        <PageHeader group="AI Agents" title="Agent catalog" />
        <P>
          Qorpera provides ten specialised agent types. Each agent has a
          defined role, domain expertise, and set of available tools. Your
          plan tier determines how many agents you can activate
          simultaneously.
        </P>

        <H2 id="chief-advisor">Chief Advisor</H2>
        <P>
          The Chief Advisor provides strategic oversight across all domains.
          It coordinates between other agents, synthesises cross-domain
          situations, and serves as the primary conversational interface in
          the advisor chat. It has access to all tools and can delegate tasks
          to specialised agents.
        </P>

        <H2 id="operations-manager">Operations Manager</H2>
        <P>
          Manages workflow orchestration, process optimisation, and
          operational health monitoring. Routes tasks between agents, detects
          bottlenecks, and ensures operational processes run smoothly.
        </P>

        <H2 id="domain-agents">Domain agents</H2>
        <P>
          The remaining eight agents cover specific business domains:
        </P>
        <UL>
          <LI><strong>Sales Representative</strong> — pipeline management, deal progression, prospect engagement</LI>
          <LI><strong>Customer Success</strong> — account health, churn prevention, renewal management</LI>
          <LI><strong>Finance Analyst</strong> — revenue tracking, invoice management, cost analysis</LI>
          <LI><strong>Research Analyst</strong> — market intelligence, competitive analysis, data synthesis</LI>
          <LI><strong>HR Coordinator</strong> — team capacity, scheduling, employee health signals</LI>
          <LI><strong>Marketing Specialist</strong> — campaign coordination, content operations, audience insights</LI>
          <LI><strong>Technical Lead</strong> — engineering workflow, infrastructure monitoring, sprint health</LI>
          <LI><strong>Executive Assistant</strong> — calendar management, communications, administrative coordination</LI>
        </UL>

        <H2 id="activation">Activation and plan limits</H2>
        <P>
          Agents are activated from the Agents page or via the advisor chat.
          The number of active agents is capped by your plan tier — Solo
          allows up to 4, Small Business up to 8, and Mid-size up to 20.
          Deactivating an agent frees the slot for another. See{" "}
          <DocLink href="/contact">pricing</DocLink> for plan details.
        </P>
      </>
    ),
  },

  "skills-and-tools": {
    title: "Skills & tools",
    description:
      "The tool registry, skill credentials, and how agents execute actions.",
    body: (
      <>
        <PageHeader group="AI Agents" title="Skills & tools" />
        <P>
          Agents interact with the outside world through tools — discrete
          actions like sending a Slack message, creating a HubSpot deal, or
          querying the knowledge graph. The tool registry defines what each
          agent can do, and skill credentials provide the API keys needed to
          execute external actions.
        </P>

        <H2 id="tool-registry">Tool registry</H2>
        <P>
          The tool registry is a catalog of all available actions. Each tool
          has a name, description, parameter schema, execution mode, and
          category. Categories include CRM, messaging, calendar, project
          management, browser automation, knowledge graph, and orchestration.
          Tools are assigned to agents based on their role — the Sales
          Representative has CRM tools, the Technical Lead has project
          management tools, and the Chief Advisor has access to everything.
        </P>

        <H2 id="execution-modes">Execution modes</H2>
        <P>
          Tools execute in one of two modes. <Term>in_process</Term> tools
          run directly within the platform — knowledge graph queries, data
          app generation, and internal state changes. <Term>runner</Term>{" "}
          tools are dispatched to an external runner process that handles
          long-running or resource-intensive operations like browser
          automation and complex API interactions.
        </P>

        <H2 id="skill-credentials">Skill credentials</H2>
        <P>
          Some tools require external API keys — for example, a web search
          tool might need a search API key. Skill credentials are stored
          per-user, encrypted with AES-256-GCM, and injected into tool
          execution at runtime. Credential values are never exposed to
          client-side code or included in API responses. You manage
          credentials from the Skills panel on each agent&apos;s catalog card.
        </P>

        <H2 id="browser-tools">Browser automation</H2>
        <P>
          Agents have access to browser automation tools powered by
          Playwright. These allow navigating web pages, extracting page
          content, clicking elements, filling forms, and capturing
          screenshots. Browser sessions are pooled with a 10-minute TTL and
          LRU eviction. Screenshots are stored server-side and can be
          referenced in agent responses.
        </P>
      </>
    ),
  },

  "approval-workflow": {
    title: "Approval workflow",
    description:
      "How agent actions are queued, reviewed, and approved or rejected.",
    body: (
      <>
        <PageHeader group="AI Agents" title="Approval workflow" />
        <P>
          When an agent&apos;s{" "}
          <DocLink href="/documents/policy-engine">policy</DocLink> requires
          approval for an action, the action is not executed immediately.
          Instead, it enters the approval queue, where a human operator
          reviews and decides whether to proceed.
        </P>

        <H2 id="approval-queue">The approval queue</H2>
        <P>
          Pending approvals appear in the Runner Approvals sidebar panel,
          which polls for new items every 15 seconds. Each pending item shows
          the agent that requested it, the action type, the parameters, and
          the situation that triggered it. You can approve or cancel each
          request individually.
        </P>

        <H2 id="approval-flow">Approval flow</H2>
        <P>
          When you approve an action, it is dispatched for execution via the
          runner or in-process handler. The result is recorded in the audit
          trail. When you cancel an action, the agent is notified and the
          cancellation is logged. Both outcomes feed into the learning loop —
          the system records which actions you tend to approve and which you
          tend to reject.
        </P>

        <H2 id="notifications">Notifications</H2>
        <P>
          You can configure email notifications for approval-needed events in
          Settings → Notifications. When an agent queues an action that
          requires your approval, you receive an email with the details and a
          link to the approval queue. Notification preferences are
          configurable per event type: approval needed, submission ready,
          task completed, and task failed.
        </P>
      </>
    ),
  },

  "agent-policies": {
    title: "Agent policies",
    description:
      "Configuring ALLOW, DENY, and REQUIRE_APPROVAL rules per action type.",
    body: (
      <>
        <PageHeader group="AI Agents" title="Agent policies" />
        <P>
          Agent policies define what each agent is allowed to do. Every tool
          execution is evaluated against the policy engine before it runs. If
          no policy matches, the default is REQUIRE_APPROVAL.
        </P>

        <H2 id="policy-types">Policy types</H2>
        <P>
          Three policy types are available:
        </P>
        <UL>
          <LI>
            <Term>ALLOW</Term> — the action executes immediately without human
            review
          </LI>
          <LI>
            <Term>DENY</Term> — the action is blocked entirely; the agent
            cannot perform it
          </LI>
          <LI>
            <Term>REQUIRE_APPROVAL</Term> — the action is queued for human
            review before execution
          </LI>
        </UL>

        <H2 id="policy-scope">Policy scope</H2>
        <P>
          Policies are scoped by agent and action type. You can set a global
          policy for an agent (e.g. all actions require approval) and then
          override it for specific action types (e.g. sending Slack
          notifications is allowed). More specific policies take precedence
          over general ones.
        </P>

        <H2 id="governed-operations">Governed CRUD operations</H2>
        <P>
          The{" "}
          <DocLink href="/documents/policy-engine">policy gateway</DocLink>{" "}
          wraps all entity CRUD operations with policy evaluation. Creating,
          updating, or deleting an entity or relationship is checked against
          the policy engine. If the policy returns REQUIRE_APPROVAL, the
          operation is stored as a proposal that must be approved before it
          takes effect.
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
      "How OAuth integrations work and how to connect your first tool.",
    body: (
      <>
        <PageHeader group="Integrations" title="Connecting tools" />
        <P>
          Qorpera integrates with external tools via OAuth 2.0. Each
          integration connects to a specific provider, authorises access via
          the provider&apos;s OAuth flow, and stores encrypted tokens for
          ongoing API access. Tokens are automatically refreshed before
          expiry.
        </P>

        <H2 id="oauth-flow">OAuth flow</H2>
        <P>
          When you click &ldquo;Connect&rdquo; for a provider in Settings →
          Integrations, Qorpera redirects you to the provider&apos;s
          authorisation page. After you grant access, the provider redirects
          back to Qorpera with an authorisation code. This code is exchanged
          for access and refresh tokens, which are encrypted with per-record
          AES-256-GCM keys and stored in the database.
        </P>
        <P>
          The OAuth state parameter is HMAC-signed with the session secret and
          includes a timestamp. States older than 10 minutes are rejected.
        </P>

        <H2 id="token-security">Token security</H2>
        <P>
          All tokens are encrypted at rest and decrypted only at the moment of
          API call execution. Token values are never included in API
          responses, logged, or exposed to client-side code. Google tokens are
          automatically refreshed when they have less than 5 minutes of
          validity remaining.
        </P>

        <H2 id="supported-providers">Supported providers</H2>
        <P>
          Currently supported OAuth providers: HubSpot, Slack, Google
          Workspace, and Linear. Each provider has its own documentation page
          with details on scopes, data synced, and configuration. You can
          also bring data in via{" "}
          <DocLink href="/documents/custom-sources">
            custom data sources
          </DocLink>
          .
        </P>
      </>
    ),
  },

  hubspot: {
    title: "HubSpot",
    description: "CRM integration — contacts, deals, companies, and pipeline events.",
    body: (
      <>
        <PageHeader group="Integrations" title="HubSpot" />
        <P>
          The HubSpot integration connects your CRM data to the Qorpera
          knowledge graph. Contacts, companies, deals, and their associated
          activities flow into the event stream in real time, enabling
          cross-system situation detection across your sales pipeline.
        </P>

        <H2 id="hubspot-data">Data synced</H2>
        <P>
          Qorpera ingests contacts, companies, and deals from HubSpot. Each
          record is resolved into the knowledge graph using email and domain
          identity resolution. Deal stage changes, contact property updates,
          and company association changes are tracked as events.
        </P>

        <H2 id="hubspot-tools">Agent tools</H2>
        <P>
          Agents with CRM tool access can read contacts, search deals, update
          deal stages, and create new records via the HubSpot API. All write
          operations are subject to the{" "}
          <DocLink href="/documents/agent-policies">policy engine</DocLink>.
        </P>

        <H2 id="hubspot-setup">Setup</H2>
        <P>
          Navigate to Settings → Integrations → HubSpot and click Connect.
          You will be redirected to HubSpot to authorise access. Required
          scopes include contacts, companies, and deals. After authorisation,
          initial data sync begins immediately.
        </P>
      </>
    ),
  },

  slack: {
    title: "Slack",
    description: "Messaging integration — channels, alerts, approvals, and agent updates.",
    body: (
      <>
        <PageHeader group="Integrations" title="Slack" />
        <P>
          The Slack integration enables bidirectional communication between
          Qorpera agents and your team. Agents can send situation alerts to
          channels, deliver approval requests via DM, and post status updates
          where your team already works.
        </P>

        <H2 id="slack-capabilities">Capabilities</H2>
        <P>
          With the Slack integration active, agents can post messages to
          specified channels, send direct messages to team members, and read
          channel history for context. Slack messages that mention entities
          known to the knowledge graph are automatically linked as entity
          mentions.
        </P>

        <H2 id="slack-approvals">Approval via Slack</H2>
        <P>
          When an agent queues an action for approval, the notification can be
          delivered as a Slack DM with context about the situation and the
          proposed action. You can review the full details in the Qorpera
          dashboard.
        </P>

        <H2 id="slack-setup">Setup</H2>
        <P>
          Connect from Settings → Integrations → Slack. The OAuth flow
          requests permissions for channel posting, DM sending, and message
          reading. Configure which channels agents can post to in the
          integration settings.
        </P>
      </>
    ),
  },

  "google-workspace": {
    title: "Google Workspace",
    description: "Calendar, Gmail, and Drive integration.",
    body: (
      <>
        <PageHeader group="Integrations" title="Google Workspace" />
        <P>
          Google Workspace integration connects Calendar, Gmail, and Drive
          activity to the knowledge graph. Scheduling conflicts, unanswered
          emails, and document collaboration patterns all become visible to
          the Situation Engine.
        </P>

        <H2 id="google-calendar">Calendar</H2>
        <P>
          Calendar events are synced including attendees, times, and
          recurrence. The Situation Engine uses calendar data to detect
          scheduling overload, meeting conflicts with client-facing
          deadlines, and availability gaps.
        </P>

        <H2 id="google-gmail">Gmail</H2>
        <P>
          Gmail integration surfaces unanswered emails, response time
          patterns, and email threads involving known entities. Agents can
          draft email responses (subject to approval) and flag emails that
          need attention.
        </P>

        <H2 id="google-drive">Drive</H2>
        <P>
          Drive activity — document creation, sharing, and collaboration —
          feeds into the event stream. This enables agents to surface stale
          documents, track deliverable progress, and detect when key files
          are being actively edited.
        </P>

        <H2 id="google-setup">Setup</H2>
        <P>
          Connect from Settings → Integrations → Google Workspace. OAuth
          scopes include Calendar (read/write), Gmail (read), and Drive
          (metadata read). Token refresh is automatic — Google tokens are
          refreshed when they have less than 5 minutes of validity remaining.
        </P>
      </>
    ),
  },

  linear: {
    title: "Linear",
    description: "Project management integration — issues, projects, and sprint health.",
    body: (
      <>
        <PageHeader group="Integrations" title="Linear" />
        <P>
          Linear integration connects your engineering and product workflow to
          the knowledge graph. Issue status changes, project progress, and
          team assignments become inputs to the Situation Engine.
        </P>

        <H2 id="linear-data">Data synced</H2>
        <P>
          Qorpera syncs projects, issues, status transitions, assignee
          changes, and label updates from Linear. Each issue and project is
          resolved as an entity in the knowledge graph, with relationships
          linking assignees, parent projects, and related entities from other
          systems.
        </P>

        <H2 id="linear-situations">Detected situations</H2>
        <P>
          Common situations detected from Linear data include: blocked issues
          with no activity, missed sprint deadlines, scope creep in active
          cycles, and workload imbalances across team members. These are
          cross-referenced with data from other integrations — a project
          delay combined with a client escalation in HubSpot creates a higher
          urgency situation than either signal alone.
        </P>

        <H2 id="linear-setup">Setup</H2>
        <P>
          Connect from Settings → Integrations → Linear. The OAuth flow
          requests read access to issues, projects, and team data. Write
          access enables agents to update issue status and add comments
          (subject to policy approval).
        </P>
      </>
    ),
  },

  "custom-sources": {
    title: "Custom data sources",
    description: "Import data via CSV, REST API, or webhook ingestion.",
    body: (
      <>
        <PageHeader group="Integrations" title="Custom data sources" />
        <P>
          Not every system offers OAuth integration. For tools that
          don&apos;t, Qorpera provides three ingestion methods: CSV import,
          REST API, and webhook ingestion.
        </P>

        <H2 id="csv-import">CSV import</H2>
        <P>
          Upload structured CSV files to bulk-create or update entities in the
          knowledge graph. CSV import supports column mapping to entity
          properties, automatic identity resolution on import, and dry-run
          mode for previewing changes before committing.
        </P>

        <H2 id="api-ingestion">REST API</H2>
        <P>
          The Qorpera REST API accepts structured event payloads that are
          processed through the event stream like any other integration.
          Authenticate with an API key, send events in the standard event
          format, and they will be resolved into the knowledge graph.
        </P>

        <H2 id="webhook-ingestion">Webhook ingestion</H2>
        <P>
          Register a webhook endpoint for any external system that supports
          outbound webhooks. Qorpera receives the payload, maps it to the
          event schema, and processes it through the standard pipeline. This
          enables integration with virtually any system that can send HTTP
          requests.
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
      "How ALLOW, DENY, and REQUIRE_APPROVAL policies govern every action.",
    body: (
      <>
        <PageHeader group="Governance" title="Policy engine" />
        <P>
          The policy engine is the enforcement layer that governs every agent
          action in Qorpera. Before any tool is executed or any entity is
          modified, the policy engine evaluates the request against the
          configured rules and returns a verdict: ALLOW, DENY, or
          REQUIRE_APPROVAL.
        </P>

        <H2 id="evaluation">Policy evaluation</H2>
        <P>
          When an agent requests an action, the policy gateway calls{" "}
          <Term>evaluatePolicy()</Term> with the agent identity, action type,
          and target entity. The engine checks for a matching policy in order
          of specificity — action-specific overrides take precedence over
          agent-level defaults, which take precedence over system defaults. If
          no policy matches, the default verdict is REQUIRE_APPROVAL.
        </P>

        <H2 id="governed-crud">Governed CRUD</H2>
        <P>
          All entity create, update, and delete operations pass through
          governed wrappers: <Term>createEntityGoverned</Term>,{" "}
          <Term>updateEntityGoverned</Term>, and{" "}
          <Term>deleteEntityGoverned</Term>. If the policy returns
          REQUIRE_APPROVAL, the operation is stored as a pending proposal.
          The <Term>executeApprovedProposal</Term> function runs the original
          operation after human approval.
        </P>

        <H2 id="audit-logging">Audit logging</H2>
        <P>
          Every policy evaluation is logged with the action requested, the
          policy that matched, the verdict, and the outcome. This creates a
          complete record of what was attempted, what was allowed, and what
          was blocked. See{" "}
          <DocLink href="/documents/audit-trail">Audit trail</DocLink> for
          querying these logs.
        </P>
      </>
    ),
  },

  "audit-trail": {
    title: "Audit trail",
    description:
      "Every action logged with full data lineage — querying and filtering.",
    body: (
      <>
        <PageHeader group="Governance" title="Audit trail" />
        <P>
          The audit trail is a complete, immutable record of every action
          taken in the Qorpera platform — by agents, by the system, and by
          human operators. Every entry includes the actor, the action, the
          target entities, the data that informed the decision, and the
          outcome.
        </P>

        <H2 id="what-is-logged">What is logged</H2>
        <P>
          All of the following are recorded: agent tool executions, entity
          CRUD operations, policy evaluations, approval decisions, situation
          detections, trust gradient changes, integration connection events,
          and scheduled task executions. Failed operations are logged with the
          error details.
        </P>

        <H2 id="audit-data">Audit entry structure</H2>
        <P>
          Each audit entry contains: timestamp, actor (agent or user ID),
          action type, target entity references, input parameters, output
          result, policy verdict that authorised it, and the situation ID that
          triggered it (if applicable). This provides full lineage — you can
          trace any action back to the situation that caused it and the data
          that informed it.
        </P>

        <H2 id="querying-audit">Querying the trail</H2>
        <P>
          The audit page provides a filterable view of all audit entries. You
          can filter by actor, action type, entity, date range, and verdict.
          The API also exposes audit data for external compliance tools and
          reporting systems.
        </P>
      </>
    ),
  },

  "security-privacy": {
    title: "Security & privacy",
    description:
      "Encryption, data residency, RBAC, SSO, and credential handling.",
    body: (
      <>
        <PageHeader group="Governance" title="Security & privacy" />
        <P>
          Qorpera is designed for enterprise-grade data handling. All data is
          encrypted, access is role-based, and every interaction is
          auditable. This page covers the security architecture in detail.
        </P>

        <H2 id="encryption">Encryption</H2>
        <P>
          All data is encrypted at rest using AES-256 and in transit using
          TLS 1.3. OAuth tokens, skill credentials, and API keys use
          per-record AES-256-GCM encryption with unique initialisation
          vectors. This means each credential has its own encryption key —
          compromising one does not expose others.
        </P>

        <H2 id="data-residency">Data residency</H2>
        <P>
          Data residency is configurable by region. EU customers can elect
          EU-only hosting, which ensures that no data crosses borders. Region
          selection is made at account creation and applies to all data
          storage, including the knowledge graph, event stream, audit trail,
          and encrypted credentials.
        </P>

        <H2 id="access-control">Access control</H2>
        <P>
          Role-based access control (RBAC) determines who can see which
          entities, situations, and agent outputs. SSO support enables
          centralised authentication. All access is logged in the{" "}
          <DocLink href="/documents/audit-trail">audit trail</DocLink> —
          every page view, API call, and data export is recorded.
        </P>

        <H2 id="credential-handling">Credential handling</H2>
        <P>
          Integration tokens and skill credentials are stored server-side
          only. They are never sent to the browser, never included in API
          responses, and never logged. The{" "}
          <Term>getSkillCredentialStatus</Term> API returns only whether a
          credential exists, never its value. Credentials are decrypted only
          at the moment of tool execution and immediately discarded from
          memory.
        </P>
      </>
    ),
  },

  /* ================================================================
     DATA & API
     ================================================================ */

  "data-apps": {
    title: "Data apps",
    description:
      "Rack maps, sortable tables, and KPI grids generated by agents.",
    body: (
      <>
        <PageHeader group="Data & API" title="Data apps" />
        <P>
          Data apps are structured, interactive visualisations that agents
          generate on demand. When you ask an agent to &ldquo;show me our
          infrastructure layout&rdquo; or &ldquo;build a metrics
          dashboard,&rdquo; the agent produces a data app that is stored,
          rendered, and accessible from the Data Apps page.
        </P>

        <H2 id="app-types">Application types</H2>
        <P>
          Three types are supported:
        </P>
        <UL>
          <LI>
            <strong>Rack map</strong> — visual U-slot rack layouts for
            infrastructure, equipment, or inventory. Interactive with
            hover details.
          </LI>
          <LI>
            <strong>Table</strong> — sortable, groupable data tables for
            operational data. Supports column sorting, row grouping, and
            search.
          </LI>
          <LI>
            <strong>KPI grid</strong> — metric cards for dashboards. Each
            card shows a metric name, value, trend, and optional
            comparison.
          </LI>
        </UL>

        <H2 id="how-generated">How apps are generated</H2>
        <P>
          When an agent receives a request that calls for a data
          visualisation, it uses the <Term>generate_data_app</Term> tool.
          This tool gathers context from the company soul, knowledge graph,
          and recent logs, then prompts the LLM to produce structured JSON
          conforming to the appropriate type schema. The resulting data app
          is stored per-user and rendered with its type-specific interactive
          component.
        </P>

        <H2 id="managing-apps">Managing data apps</H2>
        <P>
          Data apps are listed on the Data Apps page with their type,
          creation date, and generating agent. You can view any app in
          detail or delete apps you no longer need. Apps are scoped to the
          user who requested them.
        </P>
      </>
    ),
  },

  "scheduled-tasks": {
    title: "Scheduled tasks",
    description:
      "Recurring operations with DST-safe scheduling and error isolation.",
    body: (
      <>
        <PageHeader group="Data & API" title="Scheduled tasks" />
        <P>
          Scheduled tasks allow you to configure recurring operations — daily
          reports, weekly digests, periodic data syncs, or any repeatable
          workflow. Schedules are managed from the Schedules page and run
          automatically at their configured times.
        </P>

        <H2 id="schedule-config">Configuration</H2>
        <P>
          Each schedule has a name, description, frequency (hourly, daily,
          weekly, or monthly), execution time, timezone, and an enabled/disabled
          toggle. You can create, edit, and delete schedules from the UI or
          API. Schedules support natural timezone handling — times are stored
          and displayed in your selected timezone.
        </P>

        <H2 id="dst-handling">DST handling</H2>
        <P>
          Schedule execution times are DST-safe. The <Term>computeNextRunAt</Term>{" "}
          function uses a two-pass approach with <Term>Intl.DateTimeFormat</Term>{" "}
          to correctly handle daylight saving transitions. A schedule set for
          09:00 CET will run at 09:00 CET year-round, regardless of DST
          changes.
        </P>

        <H2 id="error-isolation">Error isolation</H2>
        <P>
          Each schedule runs independently. If a schedule fails, the error is
          logged as a <Term>SCHEDULE_SKIP</Term> entry in the audit trail, and
          no other schedules are affected. Failed schedules continue to run
          at their next scheduled time.
        </P>
      </>
    ),
  },

  "rest-api": {
    title: "REST API reference",
    description:
      "Overview of available API endpoints, authentication, and response formats.",
    body: (
      <>
        <PageHeader group="Data & API" title="REST API reference" />
        <P>
          The Qorpera REST API provides programmatic access to entities,
          situations, agents, integrations, schedules, and audit data. All
          endpoints require authentication and return JSON responses.
        </P>

        <H2 id="authentication">Authentication</H2>
        <P>
          API requests are authenticated via session cookies (for browser
          clients) or API keys (for server-to-server integrations). API keys
          are generated from Settings and scoped to a specific user. All
          requests are logged in the audit trail.
        </P>

        <H2 id="core-endpoints">Core endpoints</H2>
        <UL>
          <LI><Term>GET /api/entities</Term> — list and search entities</LI>
          <LI><Term>POST /api/entities</Term> — create a new entity</LI>
          <LI><Term>GET /api/graph/focused</Term> — query a focused subgraph around an entity</LI>
          <LI><Term>GET /api/advisor/runner-approvals</Term> — list pending approval requests</LI>
          <LI><Term>POST /api/advisor/runner-approvals</Term> — approve or cancel a pending action</LI>
          <LI><Term>GET /api/schedules</Term> — list schedules</LI>
          <LI><Term>POST /api/schedules</Term> — create a schedule</LI>
          <LI><Term>GET /api/data-apps</Term> — list data apps</LI>
          <LI><Term>GET /api/integrations</Term> — list connected integrations</LI>
          <LI><Term>GET /api/plans/status</Term> — get current plan and agent usage</LI>
        </UL>

        <H2 id="response-format">Response format</H2>
        <P>
          All endpoints return JSON. Successful responses include the
          requested data at the top level. Error responses include an{" "}
          <Term>error</Term> field with a human-readable message and an HTTP
          status code (400 for validation errors, 401 for authentication
          failures, 404 for not found, 500 for server errors).
        </P>

        <H2 id="rate-limits">Rate limits</H2>
        <P>
          API rate limits are applied per user. Current limits are 100
          requests per minute for read operations and 30 requests per minute
          for write operations. Rate limit headers are included in every
          response.
        </P>
      </>
    ),
  },
};
