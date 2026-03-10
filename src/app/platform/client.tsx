"use client";

import { Section } from "@/components/marketing-page-shell";
import { FadeIn } from "@/components/motion-primitives";

export function PlatformClient() {
  return (
    <>
      {/* ── The Advisor ──────────────────────────────────────── */}
      <Section label="Advisor" title="Your main interface to the system.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The advisor is a conversational interface that sits on top of
              everything Qorpera knows about your business. You can ask it
              questions, give it instructions, or just let it brief you on
              what&apos;s happening.
            </p>
            <p>
              It has access to the full business graph, every connected tool,
              the situation history, and all your uploaded documents. When you
              ask &ldquo;what&apos;s the full picture on Acme Corp?&rdquo; it
              pulls CRM data, email threads, support tickets, invoice status,
              and meeting patterns into a single answer.
            </p>
            <p>
              When a task falls outside the advisor&apos;s own domain, it
              delegates to the appropriate specialized agent — the finance
              analyst for invoice questions, the sales rep for pipeline work,
              and so on. You stay in one conversation while the system
              coordinates behind the scenes.
            </p>
            <p>
              The sidebar shows pending approvals in real time. When an agent
              wants to take an action that requires your sign-off, it appears
              there. You can approve or cancel without leaving the conversation.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── The Map ──────────────────────────────────────────── */}
      <Section label="Map" title="A visual model of your company.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The map is where you build the structure of your organization.
              You add departments, give each one a short description of what it
              does, and place people in them. It&apos;s a simple 2D layout you
              can rearrange by dragging — a sketch, not a formal org chart.
            </p>
            <p>
              This is the foundation the AI uses to understand your business.
              Departments define scope — which situations get routed where, who
              should see what, and which documents are relevant to which
              decisions. People define accountability — who owns what, who to
              notify, and how access control flows through the system.
            </p>
            <p>
              As data flows in from your connected tools, the map fills with
              operational data. Entities from HubSpot, Stripe, Slack, and other
              integrations are automatically resolved and placed in context.
              A HubSpot contact and a Stripe customer become one person with the
              full picture attached.
            </p>
            <p>
              You can also upload documents to departments — process guides,
              playbooks, policies, budgets. These become searchable knowledge
              that the AI references when reasoning about situations in that
              department.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Situations ───────────────────────────────────────── */}
      <Section label="Situations" title="Cross-system patterns that need attention.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The situations page shows everything the AI has detected across
              your connected tools. A situation isn&apos;t a single alert — it&apos;s
              a multi-signal pattern assembled from different systems. An overdue
              invoice from a customer whose email sentiment has dropped, with a
              renewal coming up and open support tickets — that&apos;s a situation.
            </p>
            <p>
              Each situation is scored on urgency and impact, classified by
              domain — revenue, operations, team health, compliance — and routed
              to the appropriate agent. You see the full evidence: which signals
              triggered the detection, what context was assembled from the
              business graph, and what the AI recommends doing about it.
            </p>
            <p>
              You can dismiss situations that aren&apos;t relevant, and that
              feedback teaches the AI to calibrate its detection. Over time, the
              situations that surface become more useful and less noisy.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Proposals ────────────────────────────────────────── */}
      <Section label="Proposals" title="Actions the AI wants to take, waiting for your approval.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              When an agent detects a situation and determines an action should
              be taken, it creates a proposal. The proposals page is a queue of
              pending actions — each one showing the triggering situation, the
              agent&apos;s reasoning, the specific action it wants to execute,
              and the evidence for and against.
            </p>
            <p>
              You approve, reject, or edit each proposal. Approved actions are
              executed through your connected tools — sending an email via
              Gmail, updating a deal in HubSpot, posting a message in Slack.
              Rejections feed back into the learning loop, teaching the agent
              what you consider appropriate.
            </p>
            <p>
              As an agent accumulates a track record of accurate proposals on a
              specific task type, you can choose to let it handle that type
              autonomously. The proposals page is where trust is built before
              that handoff happens.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Agents ───────────────────────────────────────────── */}
      <Section label="Agents" title="Specialized AI agents you activate based on what your business needs.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The agents page shows every available AI agent — spanning
              operations, sales, finance, customer success, HR, marketing,
              research, engineering, and executive support. The catalog grows
              as the platform evolves.
            </p>
            <p>
              Each agent has a defined domain and a set of tools it can use.
              You activate the ones relevant to your business, up to the cap
              set by your plan tier. Each agent card shows its current trust
              level — observe, propose, or act — and you can adjust that per
              agent and per action type.
            </p>
            <p>
              Some agents require API keys for external services they interact
              with. The agents page handles that inline — you enter credentials
              per agent, and they&apos;re encrypted and stored securely. Status
              badges show whether each agent is fully configured and ready to
              operate.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Integrations ─────────────────────────────────────── */}
      <Section label="Integrations" title="Connect the tools your business runs on.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The integrations page is where you connect your external tools.
              Currently supported: HubSpot, Slack, Google Workspace (Calendar,
              Gmail, Drive), and Linear. Each integration connects with a single
              OAuth click — no API keys or manual configuration.
            </p>
            <p>
              Once connected, data flows in continuously. HubSpot syncs
              contacts, companies, deals, and pipeline events. Slack enables
              bidirectional messaging and approval delivery. Google Workspace
              brings in calendar events, email patterns, and document activity.
              Linear syncs issues, projects, and sprint health.
            </p>
            <p>
              For tools not covered by native connectors, you can import data
              via CSV with column mapping and a dry-run preview, or register
              webhooks and push events through the REST API.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Metrics ──────────────────────────────────────────── */}
      <Section label="Metrics" title="How the system is performing.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The metrics page tracks the AI&apos;s usage and performance. It
              shows token consumption broken down by month, with a comparison of
              what the same workload would cost on external cloud providers —
              GPT-4o, Claude Sonnet, Claude Opus, Gemini Flash.
            </p>
            <p>
              Over time, this page will expand to include situation detection
              accuracy, approval rates per agent, outcome tracking per situation
              type, and the trust gradient progression across your team.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Schedules ────────────────────────────────────────── */}
      <Section label="Schedules" title="Recurring tasks that run on their own.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The schedules page lets you set up recurring operations —
              hourly, daily, weekly, or monthly. Each schedule has a name,
              description, frequency, execution time, and timezone. You can
              enable or disable individual schedules at any time.
            </p>
            <p>
              Schedules run independently of each other. If one fails, the rest
              continue — the failure is logged and the system moves on. Use
              cases include automated situation scans, periodic report
              generation, recurring data syncs, and scheduled outreach.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Data Apps ────────────────────────────────────────── */}
      <Section label="Data apps" title="Visualizations generated on demand.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              When you ask the advisor or an agent for a visual representation
              of data, it generates a data app. These are structured
              visualizations — KPI grids with trend cards, sortable and
              groupable tables, or infrastructure rack maps with interactive
              details.
            </p>
            <p>
              Generated data apps are stored and accessible from the data apps
              page. You can revisit them, and delete the ones you no longer
              need. Each one records which agent created it and when.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Audit Trail ──────────────────────────────────────── */}
      <Section label="Audit trail" title="Everything the system has done, in full detail.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The audit page is an immutable log of every action taken inside
              the system — tool executions, entity changes, policy evaluations,
              approvals, situation detections, trust gradient changes,
              integration events, and scheduled task runs.
            </p>
            <p>
              Each entry records the timestamp, the actor (which agent or user),
              the action, the target entities, the input parameters, the result,
              the policy verdict that allowed or required it, and the triggering
              situation if applicable. You can filter by actor, action type,
              entity, date range, or verdict.
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ── Settings ─────────────────────────────────────────── */}
      <Section label="Settings" title="Configure your business context, notifications, and policies.">
        <FadeIn>
          <div className="max-w-2xl space-y-4 text-[var(--ink-soft)]">
            <p>
              The settings area has several sections. The company soul page is
              where you describe your business in structured detail — what you
              do, who your customers are, what matters most. This context is
              used by every agent in every interaction, so keeping it accurate
              makes the AI more useful.
            </p>
            <p>
              The notifications page lets you toggle email alerts for four event
              types: approval needed, submission ready, task completed, and task
              failed. All are on by default.
            </p>
            <p>
              The integrations settings page manages your OAuth connections —
              connect, disconnect, and see the status of each provider. The
              trust gradient and policy settings let you configure per-agent
              autonomy levels and define rules for which actions are allowed,
              denied, or require approval.
            </p>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
