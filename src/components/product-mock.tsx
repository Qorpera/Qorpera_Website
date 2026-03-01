"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types & constants ────────────────────────────────────────── */

const VIEWS = ["Chat", "Review", "Metrics", "Agents", "Company"] as const;
type View = (typeof VIEWS)[number];

const STATUS: Record<View, string> = {
  Chat: "Advisor online",
  Review: "2 pending",
  Metrics: "$2.8k saved",
  Agents: "3 teams active",
  Company: "Updated 2h ago",
};

/** Maps view key → sidebar label so interactive items match real nav. */
const VIEW_LABEL: Record<View, string> = {
  Chat: "Consulting Chat",
  Review: "Review",
  Metrics: "Metrics",
  Agents: "Agents",
  Company: "Company Identity",
};

/** Mobile-only short labels that fit in pill tabs. */
const VIEW_TAB_LABEL: Record<View, string> = {
  Chat: "Chat",
  Review: "Review",
  Metrics: "Metrics",
  Agents: "Agents",
  Company: "Company",
};

type NavItem = { label: string; view?: View; badge?: string };
type NavGroup = { group: string; items: NavItem[] };

const SIDEBAR_NAV: NavGroup[] = [
  {
    group: "Work",
    items: [
      { label: "Consulting Chat", view: "Chat" },
      { label: "Review", view: "Review", badge: "2" },
      { label: "Projects" },
      { label: "Metrics", view: "Metrics" },
      { label: "Schedules" },
      { label: "Workflows" },
      { label: "Data Apps" },
      { label: "Agents", view: "Agents" },
      { label: "Optimizer" },
    ],
  },
  {
    group: "Knowledge",
    items: [
      { label: "Business Logs" },
      { label: "Company Identity", view: "Company" },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Connections" },
      { label: "Channels" },
      { label: "Settings" },
    ],
  },
];

const MOCK_AGENTS = [
  { name: "Mara", role: "Support", status: "Resolving 3 tickets" },
  { name: "Kai", role: "Sales", status: "Writing outreach sequence" },
  { name: "Zoe", role: "Success", status: "Running health checks" },
  { name: "Ava", role: "Marketing", status: "Drafting blog post" },
  { name: "Max", role: "Finance", status: "Reconciling invoices" },
  { name: "Jordan", role: "Ops", status: "Updating vendor SOPs" },
];

const CYCLE_MS = 4500;
const PAUSE_MS = 15000;

/* ── Slide variants ──────────────────────────────────────────── */

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 12 : -12, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -12 : 12, opacity: 0 }),
};

/* ── View renderers ──────────────────────────────────────────── */

function ChatView() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-white/[0.06] px-4 py-3">
        <p className="text-sm leading-relaxed text-white/60">
          We need to ramp up outreach to mid-market SaaS companies. What&apos;s our best angle?
        </p>
      </div>

      <div className="flex items-start gap-3 self-start">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300/80">
          Q
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.04] px-4 py-3">
          <p className="text-sm leading-relaxed text-white/55">
            Based on your company file, your strongest angle is the &quot;full team, not a single bot&quot; positioning.
            I&apos;ll have <span className="font-medium text-white/70">Kai</span> draft a 3-touch sequence
            referencing your case studies — want me to kick that off?
          </p>
        </div>
      </div>

      <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-white/[0.06] px-4 py-3">
        <p className="text-sm leading-relaxed text-white/60">
          Yes, go ahead. Make sure it matches our tone guide.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start pl-10">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400/60" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400/40" style={{ animationDelay: "0.15s" }} />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400/30" style={{ animationDelay: "0.3s" }} />
        <span className="ml-1 text-xs text-white/25">Advisor is typing...</span>
      </div>
    </div>
  );
}

function ReviewView() {
  const items = [
    { agent: "Kai", task: "Outreach email to Acme Corp — ready to send", time: "2m ago", waiting: true },
    { agent: "Mara", task: "Support reply drafted for ticket #1042", time: "8m ago", waiting: false },
    { agent: "Ava", task: "Blog post: Q1 product update", time: "14m ago", waiting: false },
    { agent: "Max", task: "Monthly expense report — flagged 2 anomalies", time: "23m ago", waiting: false },
    { agent: "Jordan", task: "Vendor SOP update for logistics team", time: "41m ago", waiting: false },
    { agent: "Zoe", task: "Churn risk alert: 3 accounts need attention", time: "1h ago", waiting: false },
  ];
  return (
    <div className="relative">
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.waiting ? "bg-amber-400/60" : "bg-white/15"}`} />
              <span className="text-sm font-medium text-white/65">{item.agent}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/35">{item.task}</span>
              <span className="shrink-0 text-xs text-white/20">{item.time}</span>
            </div>
            {item.waiting && (
              <div className="mt-3 ml-5">
                <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300/70">
                  Waiting for your OK
                </span>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-white/[0.07] px-4 py-1.5 text-xs font-medium text-white/70">Approve</span>
                  <span className="rounded-full bg-white/[0.04] px-4 py-1.5 text-xs text-white/40">Edit first</span>
                  <span className="rounded-full bg-white/[0.04] px-4 py-1.5 text-xs text-white/40">Decline</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a1014] to-transparent" />
    </div>
  );
}

function MetricsView() {
  const stats = [
    { label: "Tasks completed", value: "847" },
    { label: "Approval rate", value: "94%" },
    { label: "Avg response", value: "1.2s" },
  ];
  const bars = [38, 52, 44, 61, 55, 70, 64];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-teal-500/[0.06] to-transparent p-5 text-center">
        <div className="text-xs uppercase tracking-widest text-white/30">You would have spent</div>
        <motion.div
          className="mt-1.5 bg-gradient-to-r from-teal-300 to-teal-500 bg-clip-text text-4xl font-bold text-transparent"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          $2,847
        </motion.div>
        <div className="mt-1 text-sm text-teal-300/40">saved this month by running locally</div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 + i * 0.08 }}
          >
            <div className="text-lg font-semibold text-white/70">{s.value}</div>
            <div className="mt-0.5 text-xs text-white/30">{s.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 text-xs text-white/30">Weekly activity</div>
        <div className="flex items-end gap-2">
          {bars.map((h, i) => {
            const px = Math.round((h / 100) * 48);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  className="w-full rounded-sm bg-gradient-to-t from-purple-500/30 to-purple-400/10"
                  initial={{ height: 0 }}
                  animate={{ height: px }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
                />
                <span className="text-[10px] text-white/25">{days[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentsView() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-white/30">Active teams</div>
        <div className="text-xs text-white/25">6 active</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_AGENTS.map((a) => (
          <div key={a.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="text-sm font-medium text-white/80">{a.name}</span>
              <span className="ml-auto text-xs text-white/30">{a.role}</span>
            </div>
            <div className="mt-2 text-sm leading-relaxed text-white/30">{a.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyView() {
  const fields = [
    { label: "Company name", value: "Northwind Trading Co." },
    { label: "Mission", value: "Help mid-market teams ship faster with fewer tools" },
    { label: "Ideal customers", value: "B2B SaaS, 50-200 employees, series A-C" },
    { label: "Tone of voice", value: "Professional but warm. Never corporate-speak." },
    { label: "Approval rules", value: "All external emails require human approval" },
    { label: "Products & services", value: "Workflow automation platform for ops teams — annual SaaS contracts, self-serve and enterprise tiers" },
    { label: "Competitors", value: "Monday.com, Asana, ClickUp — we differentiate on AI-native orchestration" },
    { label: "Sales process", value: "Inbound demo → 14-day trial → CSM-led onboarding → annual contract" },
    { label: "Support policy", value: "First response within 2 hours during business hours. Escalate billing issues immediately." },
  ];
  return (
    <div className="relative">
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-white/30">Company identity</div>
      <div className="flex flex-col gap-3">
        {fields.map((f, i) => (
          <motion.div
            key={f.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div className="text-xs font-medium uppercase tracking-wider text-white/30">{f.label}</div>
            <div className="mt-1.5 text-sm text-white/55">{f.value}</div>
          </motion.div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a1014] to-transparent" />
    </div>
  );
}

const VIEW_COMPONENTS: Record<View, () => React.ReactNode> = {
  Chat: ChatView,
  Review: ReviewView,
  Metrics: MetricsView,
  Agents: AgentsView,
  Company: CompanyView,
};

/* ── Main component ──────────────────────────────────────────── */

export function ProductMock() {
  const [active, setActive] = useState<View>("Chat");
  const [direction, setDirection] = useState(1);
  const pauseUntil = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (view: View, manual: boolean) => {
      setDirection(VIEWS.indexOf(view) >= VIEWS.indexOf(active) ? 1 : -1);
      setActive(view);
      if (manual) pauseUntil.current = Date.now() + PAUSE_MS;
    },
    [active],
  );

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      setActive((prev) => {
        const idx = VIEWS.indexOf(prev);
        return VIEWS[(idx + 1) % VIEWS.length];
      });
      setDirection(1);
    }, CYCLE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /** Which sidebar label is currently active? */
  const activeLabel = VIEW_LABEL[active];
  const ViewComponent = VIEW_COMPONENTS[active];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a1014] shadow-2xl shadow-black/60">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <span className="h-3 w-3 rounded-full bg-white/10" />
        <span className="ml-3 text-xs text-white/25">qorpera.com</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
          {STATUS[active]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-white/[0.03]">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500/40 to-purple-400/20"
          key={active}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
        />
      </div>

      {/* Mobile tab bar — interactive views only */}
      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2 sm:hidden">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => goTo(v, true)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
              v === active ? "bg-white/[0.08] text-white/70" : "text-white/35"
            }`}
          >
            {VIEW_TAB_LABEL[v]}
            {v === "Review" && (
              <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/40">2</span>
            )}
          </button>
        ))}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex min-h-[380px] divide-x divide-white/[0.05]">
        {/* Desktop sidebar — full grouped nav */}
        <div className="hidden w-[180px] shrink-0 flex-col p-3 sm:flex">
          {SIDEBAR_NAV.map((g) => (
            <div key={g.group} className="mb-2">
              <div className="mb-1 px-3 pt-2 text-[10px] font-medium uppercase tracking-widest text-white/20">
                {g.group}
              </div>
              {g.items.map((item) => {
                const isInteractive = !!item.view;
                const isActive = item.label === activeLabel;
                if (isInteractive) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => goTo(item.view!, true)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                        isActive
                          ? "bg-white/[0.06] text-white/70"
                          : "text-white/40 hover:bg-white/[0.03] hover:text-white/50"
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/40">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <div
                    key={item.label}
                    className="flex items-center rounded-lg px-3 py-1.5 text-xs text-white/20"
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="relative flex-1 overflow-hidden p-5">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <ViewComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
