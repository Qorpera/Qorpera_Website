"use client";

import { Section } from "@/components/marketing-page-shell";
import { FadeIn } from "@/components/motion-primitives";

/* ── Shared animation keyframes ─────────────────────────────── */

function MockupStyles() {
  return (
    <style>{`
      @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.4} }
      @keyframes flowData { 0%{left:-40px;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{left:100%;opacity:0} }
      @keyframes typingDot { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
    `}</style>
  );
}

/* ── Shared mockup wrapper ──────────────────────────────────── */

function Mockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a] p-5">
      {children}
    </div>
  );
}

/* ── Avatar helper ──────────────────────────────────────────── */

function Avatar({
  initials,
  bg = "bg-blue-500/15",
  text = "text-blue-400",
  ai,
}: {
  initials: string;
  bg?: string;
  text?: string;
  ai?: boolean;
}) {
  return (
    <div
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${bg} ${text}`}
    >
      {initials}
      {ai && (
        <span className="absolute -right-0.5 -top-0.5 text-[8px]">✦</span>
      )}
    </div>
  );
}

export function PlatformClient() {
  return (
    <>
      <MockupStyles />

      {/* ── Section 1: Department Map ──────────────────────── */}
      <Section label="The map" title="Your business, structured for AI.">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                You build the org structure: departments, team members, entity
                types. This is the foundation the AI uses to understand scope,
                routing, and accountability.
              </p>
              <p>
                As connectors sync, the map fills with real operational data. A
                HubSpot contact and a Stripe customer are merged into one entity
                with the full cross-system picture.
              </p>
              <p>
                Upload documents to departments — playbooks, policies, process
                guides. These become searchable knowledge the AI references when
                reasoning about situations.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    name: "Sales",
                    color: "#3b82f6",
                    members: [
                      { i: "MR", bg: "bg-blue-500/15", t: "text-blue-400" },
                      { i: "JD", bg: "bg-blue-500/15", t: "text-blue-400" },
                      { i: "AK", bg: "bg-purple-500/15", t: "text-purple-400", ai: true },
                    ],
                    stats: "3 members · 24 entities · 2 docs",
                  },
                  {
                    name: "Finance",
                    color: "#22c55e",
                    members: [
                      { i: "SL", bg: "bg-green-500/15", t: "text-green-400" },
                      { i: "TM", bg: "bg-green-500/15", t: "text-green-400" },
                      { i: "AI", bg: "bg-purple-500/15", t: "text-purple-400", ai: true },
                    ],
                    stats: "3 members · 18 entities · 5 docs",
                  },
                  {
                    name: "Operations",
                    color: "#f59e0b",
                    members: [
                      { i: "DK", bg: "bg-amber-500/15", t: "text-amber-400" },
                      { i: "LP", bg: "bg-amber-500/15", t: "text-amber-400" },
                      { i: "RW", bg: "bg-amber-500/15", t: "text-amber-400" },
                      { i: "AI", bg: "bg-purple-500/15", t: "text-purple-400", ai: true },
                    ],
                    stats: "4 members · 31 entities · 4 docs",
                  },
                  {
                    name: "HR",
                    color: "#ef4444",
                    members: [
                      { i: "JH", bg: "bg-red-500/15", t: "text-red-400" },
                      { i: "AI", bg: "bg-purple-500/15", t: "text-purple-400", ai: true },
                    ],
                    stats: "2 members · 12 entities · 3 docs",
                  },
                ].map((dept) => (
                  <div
                    key={dept.name}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3.5"
                    style={{ borderLeftColor: dept.color, borderLeftWidth: 3 }}
                  >
                    <div className="mb-2.5 text-[13px] font-medium text-white/80">
                      {dept.name}
                    </div>
                    <div className="mb-2 flex -space-x-1.5">
                      {dept.members.map((m, i) => (
                        <Avatar
                          key={i}
                          initials={m.i}
                          bg={m.bg}
                          text={m.t}
                          ai={m.ai}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[10px] text-white/25">
                      {dept.stats}
                    </div>
                  </div>
                ))}
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 2: Situations ──────────────────────────── */}
      <Section
        label="Situations"
        title="Cross-system patterns, surfaced automatically."
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                A situation isn&apos;t a single alert — it&apos;s a multi-signal
                pattern the AI assembles from different tools. An overdue invoice
                from a customer who hasn&apos;t replied to two reminders, with a
                renewal coming up. That&apos;s one situation.
              </p>
              <p>
                Detection runs two ways: property-based monitoring scans entity
                data on a schedule, and content-based detection evaluates
                incoming emails and messages for action items in real time.
              </p>
              <p>
                Each situation links to a trigger entity with the full evidence
                trail — which signals fired, from which tools, and what the AI
                recommends.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-medium text-white/60">
                  Situations
                </span>
                <div className="flex gap-1.5">
                  {["All", "Urgent", "My departments"].map((f, i) => (
                    <span
                      key={f}
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${
                        i === 0
                          ? "bg-white/10 text-white/60"
                          : "text-white/25 hover:text-white/40"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {/* Expanded top situation */}
                <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ background: "#ef4444" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-white/85">
                        Invoice #4071 — 14 days overdue
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-white/25">
                        No payment recorded · Reminder sent twice · Renewal in 60 days
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-red-500/10 px-2.5 py-1 font-mono text-[10px] text-red-400">
                      Finance
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-white/20">
                      2m ago
                    </span>
                  </div>
                  {/* Evidence */}
                  <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3 pl-5">
                    {[
                      { c: "#ef4444", t: "No payment since Feb 28", s: "Stripe" },
                      { c: "#f59e0b", t: "2 reminders sent, no reply", s: "Gmail" },
                      { c: "#3b82f6", t: "Renewal due in 60 days", s: "HubSpot" },
                    ].map((sig) => (
                      <div
                        key={sig.t}
                        className="flex items-center gap-2 font-mono text-[11px]"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: sig.c }}
                        />
                        <span className="text-white/50">{sig.t}</span>
                        <span className="text-white/20">· {sig.s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other situations */}
                {[
                  {
                    color: "#f59e0b",
                    name: "Q1 report incomplete — 2 sections missing",
                    ctx: "Due Friday · Marketing and Ops sections blank",
                    dept: "Ops",
                    deptColor: "#f59e0b",
                    time: "18m ago",
                  },
                  {
                    color: "#3b82f6",
                    name: "New hire starting — no equipment assigned",
                    ctx: "Start date in 3 days · Laptop not ordered",
                    dept: "HR",
                    deptColor: "#3b82f6",
                    time: "1h ago",
                  },
                  {
                    color: "#22c55e",
                    name: "Client meeting notes — not distributed",
                    ctx: "Meeting was yesterday · 4 attendees waiting",
                    dept: "Sales",
                    deptColor: "#22c55e",
                    time: "3h ago",
                    faded: true,
                  },
                ].map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3.5 rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5"
                    style={{ opacity: (s as { faded?: boolean }).faded ? 0.45 : 1 }}
                  >
                    <div
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ background: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-white/80">
                        {s.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-white/25">
                        {s.ctx}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded px-2.5 py-1 font-mono text-[10px]"
                      style={{
                        background: `${s.deptColor}15`,
                        color: s.deptColor,
                      }}
                    >
                      {s.dept}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-white/20">
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 3: Advisor ─────────────────────────────── */}
      <Section label="Advisor" title="Ask anything about your business.">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                The advisor is a conversational interface to everything Qorpera
                knows. Ask &ldquo;how are we tracking on the Q1 report?&rdquo;
                and it pulls document status, team activity, deadlines, and
                outstanding items into one answer.
              </p>
              <p>
                It uses closed-world reasoning — it only acts on evidence it can
                retrieve, never guesses. Every answer is grounded in actual data
                from your connected tools.
              </p>
              <p>
                The advisor can also take action: send emails, reply to threads,
                search documents — all using your personal credentials and
                subject to policy approval.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              <div className="flex flex-col gap-3">
                {/* User message 1 */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-br-sm bg-[var(--accent)]/15 px-3.5 py-2.5">
                    <p className="text-[13px] text-white/80">
                      Summarize this week&apos;s sales pipeline
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="max-w-[90%] space-y-2.5">
                  <p className="text-[13px] leading-relaxed text-white/70">
                    Here&apos;s your pipeline summary for this week:
                  </p>
                  {/* Entity snapshot card */}
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3.5">
                    <div className="mb-2.5 text-[13px] font-medium text-white/80">
                      Sales pipeline — Week 12
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { k: "New deals", v: "7" },
                        { k: "Moved forward", v: "4" },
                        { k: "Stalled", v: "2" },
                        { k: "Revenue forecast", v: "€128K" },
                      ].map((s) => (
                        <div
                          key={s.k}
                          className="rounded bg-white/[0.03] px-2.5 py-1.5"
                        >
                          <div className="font-mono text-[9px] uppercase text-white/25">
                            {s.k}
                          </div>
                          <div className="text-[13px] font-medium text-white/70">
                            {s.v}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      {["HubSpot", "Gmail", "Calendar"].map((src) => (
                        <span
                          key={src}
                          className="rounded bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] text-white/30"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* User message 2 */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-br-sm bg-[var(--accent)]/15 px-3.5 py-2.5">
                    <p className="text-[13px] text-white/80">
                      Which deals need follow-up this week?
                    </p>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex items-center gap-1 py-1 pl-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-white/30"
                      style={{
                        animation: `typingDot 1.4s infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
                  <span className="flex-1 font-mono text-[12px] text-white/20">
                    Ask anything...
                  </span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/20">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-[var(--accent)]"
                    >
                      <path
                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 4: Approvals ───────────────────────────── */}
      <Section
        label="Approvals"
        title="Every AI action goes through you first."
      >
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                When the AI detects a situation and proposes an action, it queues
                it for your review. You see what it wants to do, why, and the
                evidence behind it.
              </p>
              <p>
                Approve sends the action through your credentials — the AI uses
                your OAuth tokens to send that email or update that record. Edit
                lets you adjust before execution. Reject teaches the AI what you
                don&apos;t want.
              </p>
              <p>
                Every decision feeds the learning loop. As the AI proves accurate
                on a task type, you can gradually give it more autonomy.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              {/* Primary approval card */}
              <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-5 py-5">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    style={{ animation: "pulseDot 2s ease infinite" }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                    Invoice #4071 — 14 days overdue
                  </span>
                </div>
                <p className="text-[14px] leading-[1.6] text-white/80">
                  Send a follow-up email to Nordic Health&apos;s finance contact
                  before escalating to the automated reminder sequence.
                </p>
                <div className="mt-3 rounded-md border-l-2 border-amber-500/30 bg-white/[0.02] px-3.5 py-2.5">
                  <div className="mb-1.5 font-mono text-[10px] text-white/30">
                    Based on 3 signals across Stripe, Gmail, and HubSpot
                  </div>
                  <div className="space-y-1">
                    {[
                      "No payment since Feb 28 · Stripe",
                      "2 reminders sent, no reply · Gmail",
                      "Renewal due in 60 days · HubSpot",
                    ].map((s) => (
                      <div
                        key={s}
                        className="flex items-center gap-1.5 font-mono text-[10px] text-white/25"
                      >
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-lg bg-green-500/10 px-5 py-2 font-mono text-[12px] font-medium text-green-400 ring-1 ring-green-500/25">
                    Approve
                  </span>
                  <span className="rounded-lg bg-blue-500/[0.07] px-5 py-2 font-mono text-[12px] font-medium text-blue-400 ring-1 ring-blue-500/20">
                    Edit
                  </span>
                  <span className="rounded-lg bg-red-500/[0.04] px-5 py-2 font-mono text-[12px] font-medium text-red-400/50 ring-1 ring-red-500/15">
                    Reject
                  </span>
                </div>
              </div>

              {/* Next in queue (faded) */}
              <div className="mt-2.5 rounded-[10px] border border-white/[0.04] bg-white/[0.02] px-5 py-3.5 opacity-40">
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    style={{ animation: "pulseDot 2s ease infinite 0.5s" }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                    Q1 report — 2 sections missing
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-white/50">
                  Send reminders to Marketing and Ops leads for their
                  outstanding sections.
                </p>
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 5: Connections ─────────────────────────── */}
      <Section label="Connections" title="One click. Your tools flow in.">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                Qorpera connects to the tools your team already uses. Personal
                connectors — Gmail, Calendar, Drive, Outlook, Teams — are
                authorized per user. Company connectors — HubSpot, Stripe,
                Slack — cover the whole organization.
              </p>
              <p>
                Data syncs continuously on a schedule. The system resolves
                records across tools automatically — a HubSpot contact and a
                Gmail address become one entity.
              </p>
              <p>
                All tokens are encrypted with AES-256-GCM and decrypted only at
                the moment of API execution. Nothing is stored in plain text.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[
                  {
                    name: "Gmail",
                    color: "#ea4335",
                    connected: true,
                    count: "2,847 emails",
                  },
                  {
                    name: "Google Drive",
                    color: "#4285f4",
                    connected: true,
                    count: "341 docs",
                  },
                  {
                    name: "Slack",
                    color: "#611f69",
                    connected: true,
                    count: "12,409 messages",
                  },
                  {
                    name: "HubSpot",
                    color: "#ff7a59",
                    connected: true,
                    count: "847 records",
                  },
                  {
                    name: "Stripe",
                    color: "#635bff",
                    connected: true,
                    count: "1,203 payments",
                  },
                  {
                    name: "Microsoft 365",
                    color: "#0078d4",
                    connected: false,
                    count: "",
                  },
                ].map((tool) => (
                  <div
                    key={tool.name}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: tool.connected ? "#22c55e" : "#6b7280",
                          animation: tool.connected
                            ? "pulseDot 3s ease infinite"
                            : "none",
                        }}
                      />
                      <span className="text-[12px] font-medium text-white/80">
                        {tool.name}
                      </span>
                    </div>
                    {tool.connected ? (
                      <div className="font-mono text-[10px] text-white/25">
                        Connected · {tool.count}
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] text-[var(--accent)]">
                        Connect →
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center font-mono text-[10px] text-white/15">
                Last synced 3 min ago
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 6: AI Learning ─────────────────────────── */}
      <Section label="Learning" title="Watch it get smarter.">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                Every employee gets a personal AI assistant, created
                automatically when they join. It starts by watching — observing
                situations and how your team handles them.
              </p>
              <p>
                As you approve proposals, the AI tracks its accuracy per task
                type. Consecutive approvals build a track record. Rejections
                reset the counter and provide correction.
              </p>
              <p>
                When the AI reaches a graduation threshold on a task type, admins
                can promote it to the next autonomy level. The progression is
                visible per team member, per task type.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-white/[0.08] pb-2.5 font-mono text-[10px] uppercase tracking-wider text-white/30">
                <span>Team member</span>
                <span className="text-right">Level</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Streak</span>
              </div>

              {/* Rows */}
              {[
                {
                  name: "Maria R.",
                  ai: "Maria's Assistant",
                  task: "Invoice reminders",
                  level: "Autonomous",
                  levelColor: "#22c55e",
                  rate: "94%",
                  streak: "12",
                },
                {
                  name: "David K.",
                  ai: "David's Assistant",
                  task: "Deal follow-ups",
                  level: "Notify",
                  levelColor: "#f59e0b",
                  rate: "78%",
                  streak: "5",
                },
                {
                  name: "Sarah L.",
                  ai: "Sarah's Assistant",
                  task: "Onboarding tasks",
                  level: "Supervised",
                  levelColor: "#6b7280",
                  rate: "65%",
                  streak: "2",
                },
                {
                  name: "Jonas H.",
                  ai: "Jonas's Assistant",
                  task: "Weekly summaries",
                  level: "Notify",
                  levelColor: "#f59e0b",
                  rate: "82%",
                  streak: "7",
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-b border-white/[0.04] py-3"
                >
                  <div>
                    <div className="text-[13px] font-medium text-white/80">
                      {row.name}
                    </div>
                    <div className="font-mono text-[10px] text-white/25">
                      {row.task}
                    </div>
                  </div>
                  <span
                    className="rounded px-2 py-0.5 text-right font-mono text-[10px]"
                    style={{
                      background: `${row.levelColor}15`,
                      color: row.levelColor,
                    }}
                  >
                    {row.level}
                  </span>
                  <span className="text-right font-mono text-[12px] text-white/60">
                    {row.rate}
                  </span>
                  <span className="text-right font-mono text-[11px] text-white/30">
                    {row.streak}
                  </span>
                </div>
              ))}
            </Mockup>
          </FadeIn>
        </div>
      </Section>

      {/* ── Section 7: Policies ────────────────────────────── */}
      <Section label="Policies" title="You set the rules. Always.">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          <FadeIn className="max-w-md shrink-0">
            <div className="space-y-4 text-[var(--ink-soft)]">
              <p>
                Policies are hard rules that override everything — including the
                AI&apos;s autonomy level. If a policy says REQUIRE_APPROVAL on
                email sends, every email goes through you, even if the AI is
                autonomous on other tasks.
              </p>
              <p>
                Three rule types: ALLOW (permit action), DENY (block
                unconditionally), REQUIRE_APPROVAL (force human review). Rules
                are scoped to departments and action types.
              </p>
              <p>
                The AI evaluates policies before reasoning, not after. Governance
                comes first.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="flex-1">
            <Mockup>
              {/* Header */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[13px] font-medium text-white/60">
                  Active policies
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/30">
                  5 rules
                </span>
              </div>

              {/* Policy rows */}
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    action: "Send email",
                    dept: "Sales",
                    verdict: "REQUIRE_APPROVAL",
                    color: "#f59e0b",
                  },
                  {
                    action: "Update CRM record",
                    dept: "Sales",
                    verdict: "ALLOW",
                    color: "#22c55e",
                  },
                  {
                    action: "Send email",
                    dept: "Finance",
                    verdict: "DENY",
                    color: "#ef4444",
                  },
                  {
                    action: "Create entity",
                    dept: "All departments",
                    verdict: "ALLOW",
                    color: "#22c55e",
                  },
                  {
                    action: "Delete entity",
                    dept: "All departments",
                    verdict: "DENY",
                    color: "#ef4444",
                  },
                ].map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-white/80">
                        {rule.action}
                      </div>
                      <div className="font-mono text-[10px] text-white/25">
                        {rule.dept}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded px-2.5 py-1 font-mono text-[10px] font-medium"
                      style={{
                        background: `${rule.color}12`,
                        color: rule.color,
                      }}
                    >
                      {rule.verdict}
                    </span>
                  </div>
                ))}
              </div>
            </Mockup>
          </FadeIn>
        </div>
      </Section>
    </>
  );
}
