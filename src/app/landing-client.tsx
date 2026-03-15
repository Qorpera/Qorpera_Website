"use client";

import { useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────
   Scroll-triggered fade-up animation helper
   ──────────────────────────────────────────── */

function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Tool logo SVGs
   ──────────────────────────────────────────── */

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <path d="M2 6l10 6.5L22 6v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="none" stroke="#ea4335" strokeWidth="1.5" />
      <path d="M22 6l-10 6.5L2 6a2 2 0 012-2h16a2 2 0 012 2z" fill="none" stroke="#ea4335" strokeWidth="1.5" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <path d="M14.5 2a1.5 1.5 0 100 3H16v1.5a1.5 1.5 0 103 0v-3A1.5 1.5 0 0017.5 2h-3zM2 9.5a1.5 1.5 0 013 0V11h1.5a1.5 1.5 0 110 3h-3A1.5 1.5 0 012 12.5v-3zM9.5 22a1.5 1.5 0 100-3H8v-1.5a1.5 1.5 0 10-3 0v3A1.5 1.5 0 006.5 22h3zM22 14.5a1.5 1.5 0 01-3 0V13h-1.5a1.5 1.5 0 110-3h3a1.5 1.5 0 011.5 1.5v3z" fill="none" stroke="#611f69" strokeWidth="1.2" />
    </svg>
  );
}

function HubSpotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <circle cx="12" cy="12" r="3" fill="none" stroke="#ff7a59" strokeWidth="1.5" />
      <circle cx="12" cy="5" r="1.5" fill="#ff7a59" />
      <circle cx="12" cy="19" r="1.5" fill="#ff7a59" />
      <circle cx="5.5" cy="8.5" r="1.5" fill="#ff7a59" />
      <circle cx="18.5" cy="8.5" r="1.5" fill="#ff7a59" />
      <circle cx="5.5" cy="15.5" r="1.5" fill="#ff7a59" />
      <circle cx="18.5" cy="15.5" r="1.5" fill="#ff7a59" />
      <line x1="12" y1="6.5" x2="12" y2="9" stroke="#ff7a59" strokeWidth="1" />
      <line x1="12" y1="15" x2="12" y2="17.5" stroke="#ff7a59" strokeWidth="1" />
      <line x1="6.8" y1="9.3" x2="9.2" y2="10.7" stroke="#ff7a59" strokeWidth="1" />
      <line x1="14.8" y1="13.3" x2="17.2" y2="14.7" stroke="#ff7a59" strokeWidth="1" />
      <line x1="6.8" y1="14.7" x2="9.2" y2="13.3" stroke="#ff7a59" strokeWidth="1" />
      <line x1="14.8" y1="10.7" x2="17.2" y2="9.3" stroke="#ff7a59" strokeWidth="1" />
    </svg>
  );
}

function StripeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="#635bff" strokeWidth="1.5" />
      <path d="M12.5 8.5c-2 0-3 .8-3 2.1 0 2.5 4 1.8 4 3.3 0 .7-.8 1.1-2 1.1-1.5 0-2.5-.6-2.5-.6M12 8.5v7" fill="none" stroke="#635bff" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="#4285f4" strokeWidth="1.5" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="#4285f4" strokeWidth="1.5" />
      <line x1="8" y1="3" x2="8" y2="7" stroke="#4285f4" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="3" x2="16" y2="7" stroke="#4285f4" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="14.5" r="1" fill="#4285f4" />
      <circle cx="12" cy="14.5" r="1" fill="#4285f4" />
      <circle cx="16" cy="14.5" r="1" fill="#4285f4" />
    </svg>
  );
}

function Ms365Icon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="none" stroke="#0078d4" strokeWidth="1.3" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="none" stroke="#0078d4" strokeWidth="1.3" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="none" stroke="#0078d4" strokeWidth="1.3" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="none" stroke="#0078d4" strokeWidth="1.3" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   Tool data
   ──────────────────────────────────────────── */

const TOOLS: { icon: React.FC; name: string; color: string; events: string }[] = [
  { icon: GmailIcon, name: "Gmail", color: "#ea4335", events: "2,847 emails" },
  { icon: SlackIcon, name: "Slack", color: "#611f69", events: "12,409 messages" },
  { icon: HubSpotIcon, name: "HubSpot", color: "#ff7a59", events: "847 records" },
  { icon: StripeIcon, name: "Stripe", color: "#635bff", events: "1,203 payments" },
  { icon: CalendarIcon, name: "Google Calendar", color: "#4285f4", events: "634 events" },
  { icon: Ms365Icon, name: "Microsoft 365", color: "#0078d4", events: "3,102 items" },
];

const SITUATIONS = [
  {
    urgency: "#ef4444",
    name: "Churn risk — Acme Corp",
    context: "No contact in 21 days · Overdue invoice · NPS dropped",
    dept: "Urgent",
    deptBg: "rgba(239,68,68,0.08)",
    deptColor: "#ef4444",
    time: "2m ago",
  },
  {
    urgency: "#f59e0b",
    name: "Deal stalling — Nordic Health",
    context: "Proposal sent 12 days ago · No reply · Champion on leave",
    dept: "Sales",
    deptBg: "rgba(245,158,11,0.08)",
    deptColor: "#f59e0b",
    time: "18m ago",
  },
  {
    urgency: "#3b82f6",
    name: "New hire starting — no equipment assigned",
    context: "Start date in 3 days · Laptop not ordered · No onboarding scheduled",
    dept: "HR",
    deptBg: "rgba(59,130,246,0.08)",
    deptColor: "#3b82f6",
    time: "1h ago",
  },
  {
    urgency: "#22c55e",
    name: "Monthly report ready — awaiting review",
    context: "All data synced · Finance approved · Needs CEO sign-off",
    dept: "Ops",
    deptBg: "rgba(34,197,94,0.08)",
    deptColor: "#22c55e",
    time: "2h ago",
    faded: true,
  },
];

const TABS = [
  { num: "01", label: "Connect" },
  { num: "02", label: "Understand" },
  { num: "03", label: "Detect" },
  { num: "04", label: "Propose" },
  { num: "05", label: "Learn" },
];

/* ────────────────────────────────────────────
   LayerDemo — interactive five-layer visual
   ──────────────────────────────────────────── */

function LayerDemo() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]">
      {/* ── Tab bar ── */}
      <div className="flex border-b border-white/5">
        {TABS.map((tab, i) => (
          <button
            key={tab.num}
            onClick={() => setActive(i)}
            className={`flex-1 py-3.5 text-center font-mono text-[11px] tracking-[0.5px] transition-all ${
              i === active
                ? "bg-white/[0.03] text-[var(--accent)]"
                : "text-white/25 hover:bg-white/[0.02] hover:text-white/40"
            }`}
            style={{ position: "relative" }}
          >
            <span className={`mb-0.5 block text-[10px] ${i === active ? "text-[var(--accent)]/60" : "opacity-40"}`}>
              {tab.num}
            </span>
            {tab.label}
            {i === active && (
              <span
                className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-t-sm bg-[var(--accent)]"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Scenes ── */}
      <div className="min-h-[360px] p-7 lg:p-9">

        {/* 0 — Connect */}
        {active === 0 && (
          <div className="animate-[fadeIn_300ms_ease]">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Layer 1 — Your tools connect
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-white/50">
              Sign in to your existing tools. Every email, deal, message, and payment flows into one stream.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <div
                    key={tool.name}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
                  >
                    <Icon />
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-white/80">{tool.name}</div>
                      <div className="font-mono text-[10px] text-white/25">{tool.events}</div>
                    </div>
                    {/* animated data pulse */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <div
                        className="absolute top-1/2 h-[2px] w-10 -translate-y-1/2 rounded-sm"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)`,
                          animation: `flowPulse ${2.2 + i * 0.3}s linear infinite ${i * 0.35}s`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 1 — Understand */}
        {active === 1 && (
          <div className="animate-[fadeIn_300ms_ease]">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Layer 2 — Your business becomes one picture
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-white/50">
              The same customer, vendor, or project scattered across tools is automatically linked into a single view.
            </p>

            {/* Before: two separate records */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[12px] font-semibold text-blue-400">
                  AC
                </div>
                <div>
                  <div className="text-[13px] font-medium text-white/80">Acme Corp</div>
                  <div className="font-mono text-[10px] text-white/25">HubSpot · Deal #2847</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-[12px] font-semibold text-purple-400">
                  AC
                </div>
                <div>
                  <div className="text-[13px] font-medium text-white/80">acme-corp</div>
                  <div className="font-mono text-[10px] text-white/25">Slack · #acme-support</div>
                </div>
              </div>
            </div>

            {/* Merge indicator */}
            <div className="flex items-center justify-center py-2">
              <span className="rounded-full border border-blue-500/15 bg-blue-500/[0.06] px-4 py-1 font-mono text-[11px] text-[var(--accent)]">
                ↓ matched and merged ↓
              </span>
            </div>

            {/* After: unified entity */}
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/[0.03] px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[14px] font-semibold text-blue-400">
                AC
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-white/80">Acme Corp</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    { label: "HubSpot", bg: "rgba(59,130,246,0.1)" },
                    { label: "Slack", bg: "rgba(168,85,247,0.1)" },
                    { label: "Stripe", bg: "rgba(34,197,94,0.1)" },
                    { label: "Gmail", bg: "rgba(239,68,68,0.1)" },
                  ].map((s) => (
                    <span key={s.label} className="rounded px-2 py-0.5 font-mono text-[10px] text-white/30" style={{ background: s.bg }}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 font-mono text-[11px] text-white/20">
              One entity. Four tools. Complete picture.
            </p>
          </div>
        )}

        {/* 2 — Detect */}
        {active === 2 && (
          <div className="animate-[fadeIn_300ms_ease]">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Layer 3 — Situations surface
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-white/50">
              The AI spots patterns across your tools that need attention — before they become problems.
            </p>
            <div className="flex flex-col gap-2">
              {SITUATIONS.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3.5 rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5"
                  style={{ opacity: s.faded ? 0.45 : 1 }}
                >
                  <div className="h-9 w-1 shrink-0 rounded-full" style={{ background: s.urgency }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-white/85">{s.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-white/25">{s.context}</div>
                  </div>
                  <span
                    className="shrink-0 rounded px-2.5 py-1 font-mono text-[10px]"
                    style={{ background: s.deptBg, color: s.deptColor }}
                  >
                    {s.dept}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-white/20">{s.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3 — Propose */}
        {active === 3 && (
          <div className="animate-[fadeIn_300ms_ease]">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Layer 4 — The AI proposes what to do
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-white/50">
              For each situation, the AI recommends a specific action. You approve, edit, or reject.
            </p>

            {/* Primary proposal */}
            <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-5 py-5">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  Churn risk — Acme Corp
                </span>
              </div>
              <p className="text-[15px] leading-[1.6] text-white/80">
                Schedule a personal check-in call with Acme Corp before sending
                the automated overdue reminder. Their account is high-value and
                the signals suggest frustration, not negligence.
              </p>
              <div className="mt-3 rounded-md border-l-2 border-amber-500/30 bg-white/[0.02] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-white/25">
                Based on 5 signals across Gmail, Stripe, HubSpot, and Support
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

            {/* Secondary (faded) */}
            <div className="mt-2.5 rounded-[10px] border border-white/[0.04] bg-white/[0.02] px-5 py-4 opacity-50">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  Deal stalling — Nordic Health
                </span>
              </div>
              <p className="text-[14px] leading-[1.6] text-white/60">
                Reach out to the secondary contact to keep momentum while the champion is away.
              </p>
            </div>
          </div>
        )}

        {/* 4 — Learn */}
        {active === 4 && (
          <div className="animate-[fadeIn_300ms_ease]">
            <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Layer 5 — It gets smarter
            </div>
            <p className="mb-6 text-[14px] leading-relaxed text-white/50">
              Every decision you make teaches the system. Over time, it earns the autonomy to handle routine tasks on its own.
            </p>
            <div className="flex gap-5">
              {/* Chart */}
              <div className="flex-1">
                <div className="relative h-[200px] rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 148"
                    preserveAspectRatio="none"
                    className="block"
                  >
                    <line x1="0" y1="37" x2="400" y2="37" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="74" x2="400" y2="74" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <line x1="0" y1="111" x2="400" y2="111" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6b7280" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,130 C50,128 80,120 130,105 S200,80 250,55 S320,25 370,18 L400,14 L400,148 L0,148 Z"
                      fill="url(#areaGrad)"
                    />
                    <path
                      d="M0,130 C50,128 80,120 130,105 S200,80 250,55 S320,25 370,18 L400,14"
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="400" cy="14" r="4" fill="#22c55e" />
                  </svg>
                  <div className="absolute bottom-2 left-4 right-4 flex justify-between font-mono text-[9px] text-white/20">
                    <span>Week 1</span>
                    <span>Week 2</span>
                    <span>Week 3</span>
                    <span>Now</span>
                  </div>
                  <div className="absolute left-4 top-3 font-mono text-[9px] text-white/20">
                    Proposal accuracy
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex w-[200px] shrink-0 flex-col gap-2">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.5px] text-white/25">
                    Accuracy
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-green-400">94%</div>
                  <div className="mt-0.5 font-mono text-[10px] text-green-400/70">↑ from 62%</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.5px] text-white/25">
                    Decisions
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-white/90">47</div>
                  <div className="mt-0.5 font-mono text-[10px] text-white/25">7 handled autonomously</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.5px] text-white/25">
                    Response time
                  </div>
                  <div className="mt-1 text-[22px] font-semibold text-blue-400">6m</div>
                  <div className="mt-0.5 font-mono text-[10px] text-green-400/70">↓ from 4.2 hours</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes flowPulse {
          0% { left: -40px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}


/* ────────────────────────────────────────────
   Main landing page
   ──────────────────────────────────────────── */

export function LandingClient() {
  return (
    <div>
      {/* ═══════════════════════════════════════
          HERO — dark
          ═══════════════════════════════════════ */}
      <section className="px-6 pb-[100px] pt-[116px] text-center lg:px-10">
        <FadeUp>
          <div className="mb-6 inline-flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
            <span className="inline-block h-px w-6 bg-[var(--accent)]" />
            AI workforce integration for growing businesses
          </div>
        </FadeUp>

        <FadeUp delay={100}>
          <h1 className="mx-auto max-w-[820px] font-sans text-[clamp(40px,5.5vw,64px)] font-bold leading-[1.1] tracking-[-1.5px] text-[var(--ink)]">
            AI can run your operations.
            <br />
            <span className="text-[var(--accent)]">
              It just doesn&apos;t know your business yet.
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={250}>
          <p className="mx-auto mt-7 max-w-[620px] font-serif text-[20px] leading-[1.6] text-[var(--ink-soft)]">
            Qorpera teaches AI how your company works — your departments, your
            customers, your tools, your policies — then gradually lets it take
            over the tasks your team shouldn&apos;t be doing manually.
          </p>
        </FadeUp>

        <FadeUp delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/contact"
              className="rounded-[10px] bg-[var(--accent)] px-8 py-3.5 font-sans text-base font-semibold text-white no-underline shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition hover:-translate-y-px hover:bg-[var(--accent-dim)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
            >
              Get in contact
            </a>
            <a
              href="#how"
              className="rounded-[10px] border-[1.5px] border-[var(--border)] bg-transparent px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:border-[var(--ink-muted)] hover:bg-white"
            >
              See how it works
            </a>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════
          THE GAP — dark
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--ink)] px-6 py-[100px] text-white lg:px-10">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="mb-10 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-white/40">
            The integration gap
          </div>

          <div className="mb-12 flex flex-wrap items-end justify-center gap-16 max-sm:gap-8">
            <div className="text-center">
              <div className="font-sans text-[88px] font-bold leading-none tracking-[-3px] max-sm:text-[56px]">
                85%
              </div>
              <div className="mt-2 font-sans text-sm font-medium text-white/50">
                of business operations tasks
                <br />
                AI can already perform
              </div>
            </div>
            <div className="mb-9 text-[40px] text-[var(--accent)] max-sm:hidden">
              &rarr;
            </div>
            <div className="text-center">
              <div className="font-sans text-[88px] font-bold leading-none tracking-[-3px] text-white/25 max-sm:text-[56px]">
                20%
              </div>
              <div className="mt-2 font-sans text-sm font-medium text-white/50">
                of those tasks businesses
                <br />
                are actually using AI for
              </div>
            </div>
          </div>

          <p className="mx-auto mb-3 max-w-[640px] font-serif text-[22px] leading-[1.5] text-white/70 max-sm:text-lg">
            The gap isn&apos;t intelligence. AI is smart enough.{" "}
            <strong className="text-white">
              The gap is that AI doesn&apos;t know your business
            </strong>{" "}
            — your customers, your team, your processes, your tools. Without that
            context, it can&apos;t do real work.
          </p>
          <p className="mb-12 font-sans text-xs text-white/30">
            Source:{" "}
            <a
              href="https://www.anthropic.com/research/labor-market-impacts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 no-underline hover:text-white/60"
            >
              Anthropic, &ldquo;Labor market impacts of AI,&rdquo; March 2026
            </a>
          </p>

          {/* Three barriers */}
          <div className="grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                tag: "Solved by others",
                tagColor: "text-[var(--green-soft)]",
                title: "Model limitations",
                desc: "Being solved by the labs every quarter.",
              },
              {
                tag: "Qorpera",
                tagColor: "text-[var(--accent)]",
                title: "Additional software tools",
                desc: "The infrastructure that connects AI to a specific business.",
              },
              {
                tag: "Qorpera",
                tagColor: "text-[var(--accent)]",
                title: "Human review of AI work",
                desc: "The trust mechanism that lets humans hand off responsibility safely.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-[var(--radius)] border border-white/10 bg-white/5 p-5"
              >
                <span className={`font-sans text-[11px] font-bold uppercase tracking-[1.5px] ${b.tagColor}`}>
                  {b.tag}
                </span>
                <h3 className="mt-2 font-sans text-base font-semibold text-white">
                  {b.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-sans text-sm font-medium text-white/50">
            Qorpera solves barriers 2 and 3: the infrastructure layer and the trust layer.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SEE IT WORK — interactive demo
          ═══════════════════════════════════════ */}
      <section className="border-t border-white/5 bg-[var(--ink)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              See it work
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px] text-white">
              Five layers. One intelligence.
            </h2>
            <p className="mt-5 max-w-[620px] font-serif text-lg leading-[1.6] text-white/50">
              Qorpera turns disconnected business tools into a single
              operational intelligence that watches, reasons, acts, and learns.
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <LayerDemo />
          </FadeUp>

          <FadeUp delay={100}>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <p className="text-[15px] leading-[1.6] text-white/30">
                Every layer runs continuously, across every department.
              </p>
              <a
                href="/how-it-works"
                className="shrink-0 font-sans text-[13px] font-semibold text-[var(--accent)] no-underline transition hover:text-white"
              >
                See the full architecture &rarr;
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TRUST GRADIENT — visual
          ═══════════════════════════════════════ */}
      <section id="how" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              The trust gradient
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              AI autonomy isn&apos;t a switch you flip.
              <br className="hidden sm:block" />
              It&apos;s something the system earns.
            </h2>
          </FadeUp>

          <div className="relative mt-16">
            {/* connecting line — desktop only */}
            <div className="absolute left-[16.67%] right-[16.67%] top-[19px] hidden h-px bg-[var(--border)] sm:block" />

            <div className="grid gap-10 sm:grid-cols-3">
              {[
                {
                  n: 1,
                  time: "Week 1+",
                  title: "Observe",
                  desc: "The AI monitors your operations across every connected tool. It surfaces situations with the full cross-system context to understand them.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Situation detected
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Invoice #4071 — 14 days overdue
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/30">
                        Sentiment ↓ &middot; Renewal in 60 days
                      </p>
                    </div>
                  ),
                },
                {
                  n: 2,
                  time: "Weeks 2–4+",
                  title: "Propose",
                  desc: "The AI recommends specific actions. You see exactly what it wants to do and why. Approve, edit, or reject — every response teaches it.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Recommended action
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Personal check-in before reminder
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 font-mono text-[10px] text-[#22c55e]">
                          Approve
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/30">
                          Edit
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/30">
                          Reject
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  n: 3,
                  time: "Month 2+",
                  title: "Act",
                  desc: "As proposal accuracy increases, the AI is gradually given more autonomous privileges — one task type at a time. Full visibility. Instant revoke.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Handled automatically
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Follow-up sent &middot; CRM updated
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/30">
                        Accuracy: 94% &middot; 47 decisions
                      </p>
                    </div>
                  ),
                },
              ].map((phase, i) => (
                <FadeUp key={phase.title} delay={i * 100}>
                  <div className="text-center">
                    <div className="relative mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white font-sans text-sm font-bold text-[var(--accent)]">
                      {phase.n}
                    </div>
                    <div className="mb-1 font-mono text-[11px] font-medium text-[var(--ink-muted)]">
                      {phase.time}
                    </div>
                    <h3 className="mb-2 font-sans text-[22px] font-bold text-[var(--ink)]">
                      {phase.title}
                    </h3>
                    <p className="mx-auto max-w-[300px] text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                      {phase.desc}
                    </p>
                    {phase.card}
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>

          <FadeUp>
            <p className="mt-12 max-w-[800px] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
              Every other AI tool either has permission or it doesn&apos;t.
              Automations just run. Assistants wait to be asked. Qorpera is the
              only system where AI earns autonomy through demonstrated
              competence — one task type at a time.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          USE CASES — redirect
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--surface-warm)] px-6 py-[100px] text-center lg:px-10">
        <div className="mx-auto max-w-[700px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Use cases
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              See how it works across your business.
            </h2>
            <p className="mt-5 text-lg leading-[1.6] text-[var(--ink-soft)]">
              Animated walkthroughs across sales, finance, operations, HR, IT,
              and more — showing how Qorpera detects real situations and how it
              could respond.
            </p>
            <div className="mt-8">
              <a
                href="/use-cases"
                className="inline-block rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:border-[var(--ink-muted)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                Discover use cases &rarr;
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA
          ═══════════════════════════════════════ */}
      <section
        id="cta"
        className="border-t border-white/10 bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10"
      >
        <div className="mx-auto max-w-[520px]">
          <FadeUp>
            <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
              With Qorpera, getting in front of the curve is permanent.
            </h2>
            <p className="mt-4 text-lg leading-[1.6] text-white/40">
              The future of work is data driven. When our system collects and
              learns from your data, late adopters won&apos;t be able to catch
              up.
            </p>
          </FadeUp>
          <FadeUp delay={100}>
            <div className="mt-10">
              <a
                href="/contact"
                className="inline-block rounded-[10px] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
              >
                Get in contact
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
