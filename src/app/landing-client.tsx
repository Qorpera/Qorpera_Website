"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ────────────────────────────────────────────
   Scenario carousel — signals converge into
   cross-system situation cards, auto-rotating
   ──────────────────────────────────────────── */

interface Scenario {
  signals: { tool: string; event: string; color: string }[];
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  response: string;
}

const SCENARIOS: Scenario[] = [
  {
    signals: [
      { tool: "Stripe", event: "Invoice #4071 \u2014 16 days overdue", color: "#635BFF" },
      { tool: "HubSpot", event: "Email response time \u2191 3.2\u00d7", color: "#FF7A59" },
      { tool: "Gmail", event: "Contract end date inquiry received", color: "#4285F4" },
      { tool: "HubSpot", event: "Support ticket \u2014 negative sentiment", color: "#FF7A59" },
    ],
    title: "Churn Risk \u2014 Meridian Corp",
    badge: "High \u00b7 $45K ARR",
    badgeColor: "#ef4444",
    description:
      "This isn\u2019t a late payment. Email response time has tripled, they asked about their contract end date, and their last support ticket was negative. The $8,400 invoice is a symptom \u2014 the real risk is $45K in annual revenue.",
    response:
      "Alert Sarah (account owner) with full context. She saved a similar account 3 months ago by scheduling a face-to-face.",
  },
  {
    signals: [
      { tool: "Stripe", event: "Widget Pro orders \u2191 340% in 6 weeks", color: "#635BFF" },
      { tool: "HubSpot", event: "14 new enterprise inquiries this month", color: "#FF7A59" },
      { tool: "Gmail", event: "Shenzhen Micro \u2014 lead time now 12 weeks", color: "#4285F4" },
      { tool: "Research", event: "Component shortage across 3 competing markets", color: "#8B5CF6" },
    ],
    title: "Supply Bottleneck \u2014 Widget Pro",
    badge: "Urgent \u00b7 $280K pipeline",
    badgeColor: "#f59e0b",
    description:
      "Demand is accelerating faster than your supply chain can support. Your primary supplier is seeing industry-wide spikes and has extended lead times to 12 weeks. At current growth, you\u2019ll hit allocation limits within 45 days \u2014 while $280K in pipeline depends on normal fulfillment.",
    response:
      "Open conversation with Shenzhen Micro about reserved allocation. Identify backup supplier. Consider temporary order caps for new accounts.",
  },
  {
    signals: [
      { tool: "Stripe", event: "Apex Industries = 34% of monthly revenue", color: "#635BFF" },
      { tool: "HubSpot", event: "Apex champion (VP Eng) changed roles", color: "#FF7A59" },
      { tool: "LinkedIn", event: "New VP Eng at Apex \u2014 no prior relationship", color: "#0A66C2" },
      { tool: "Gmail", event: "Renewal discussion pushed back 3 weeks", color: "#4285F4" },
    ],
    title: "Concentration Risk \u2014 Apex Industries",
    badge: "High \u00b7 $180K ARR",
    badgeColor: "#ef4444",
    description:
      "Your largest account is 34% of revenue. Their VP of Engineering \u2014 your primary champion \u2014 just changed roles. The incoming VP has no relationship with your team, and the renewal conversation has stalled. Not a renewal risk yet, but a concentration risk that needs immediate attention.",
    response:
      "Schedule intro with new VP through existing contacts. Prepare business review showing ROI. Brief CEO for potential executive-to-executive outreach.",
  },
  {
    signals: [
      { tool: "HubSpot", event: "Orion Healthcare requested feature comparison", color: "#FF7A59" },
      { tool: "Gmail", event: "Orion contact forwarded competitor pricing", color: "#4285F4" },
      { tool: "HubSpot", event: "Deal stage: Negotiation \u2192 Evaluation", color: "#FF7A59" },
      { tool: "Research", event: "Competitor launched healthcare module last week", color: "#8B5CF6" },
    ],
    title: "Competitive Threat \u2014 Orion Healthcare",
    badge: "High \u00b7 $62K deal",
    badgeColor: "#ef4444",
    description:
      "Orion is re-evaluating. They requested a feature comparison, forwarded a competitor\u2019s pricing internally, and regressed from Negotiation to Evaluation \u2014 all within 5 days of a competitor announcing a healthcare-specific module. This deal needs intervention before the evaluation window closes.",
    response:
      "Schedule technical deep-dive on integration advantages. Prepare healthcare-specific ROI case. Escalate to VP Sales for strategic pricing discussion.",
  },
  {
    signals: [
      { tool: "Analytics", event: "Brightpath usage at 94% of plan limit", color: "#F9AB00" },
      { tool: "HubSpot", event: "Contract renewal in 38 days", color: "#FF7A59" },
      { tool: "Stripe", event: "18 months \u2014 never missed a payment", color: "#635BFF" },
      { tool: "Gmail", event: "CEO mentioned expansion plans in last email", color: "#4285F4" },
    ],
    title: "Expansion \u2014 Brightpath Education",
    badge: "$24K \u2192 $48K potential",
    badgeColor: "#10b981",
    description:
      "Brightpath is hitting their plan ceiling at exactly the right moment. They\u2019re 38 days from renewal, their CEO just mentioned expansion plans, and they\u2019ve been a perfect-payment customer for 18 months. This is an upgrade conversation, not a renewal conversation.",
    response:
      "Prepare upgrade proposal with usage data. Lead with their growth trajectory, not pricing. Time the outreach for 2\u20133 weeks before renewal.",
  },
  {
    signals: [
      { tool: "Stripe", event: "3 largest invoices ($45K, $38K, $27K) due same week", color: "#635BFF" },
      { tool: "Xero", event: "Payroll + vendor payments = $92K due same period", color: "#13B5EA" },
      { tool: "Gmail", event: "Apex Industries historically 15\u201320 days late in Q2", color: "#4285F4" },
      { tool: "Calendar", event: "Board meeting in 3 weeks \u2014 cash position on agenda", color: "#4285F4" },
    ],
    title: "Cash Flow Pinch \u2014 Q2 Week 3",
    badge: "Moderate \u00b7 $202K exposure",
    badgeColor: "#f59e0b",
    description:
      "Three major receivables and your largest outgoing obligations converge in the same 10-day window. Based on history, Apex will likely be 15\u201320 days late \u2014 creating a $45K gap right when your board meeting requires a clean cash position.",
    response:
      "Send Apex a friendly early-payment reminder with incentive. Shift one vendor payment by 5 days (within terms). Brief CFO on the timing overlap.",
  },
];

function SignalCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);

  // Start on scroll into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animate signals in, then auto-advance
  useEffect(() => {
    if (!started) return;
    setStep(0);
    let i = 0;
    const animInterval = setInterval(() => {
      i++;
      setStep(i);
      if (i >= 7) clearInterval(animInterval);
    }, 500);

    // Auto-advance after animation + viewing pause
    const advanceTimeout = setTimeout(() => {
      setActive((prev) => (prev + 1) % SCENARIOS.length);
    }, 9000);

    return () => {
      clearInterval(animInterval);
      clearTimeout(advanceTimeout);
    };
  }, [started, active]);

  const goTo = (idx: number) => {
    if (idx !== active) setActive(idx);
  };

  const scenario = SCENARIOS[active];

  return (
    <div ref={ref} className="mx-auto mt-16 max-w-lg">
      {/* Signals */}
      <div className="space-y-2">
        {scenario.signals.map((s, i) => (
          <div
            key={`${active}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 transition-all duration-500"
            style={{
              opacity: step > i ? 1 : 0,
              transform: step > i ? "translateX(0)" : "translateX(-16px)",
            }}
          >
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: s.color, boxShadow: `0 0 10px ${s.color}44` }}
            />
            <span className="w-16 shrink-0 font-mono text-[11px] text-white/30">
              {s.tool}
            </span>
            <span className="font-mono text-[12px] text-white/60">{s.event}</span>
          </div>
        ))}
      </div>

      {/* Convergence line */}
      <div
        className="my-3 h-px transition-all duration-700"
        style={{
          background:
            step >= 5
              ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)"
              : "transparent",
        }}
      />

      {/* Situation card */}
      <div
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-6 backdrop-blur-xl transition-all duration-700"
        style={{
          opacity: step >= 6 ? 1 : 0,
          transform: step >= 6 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: scenario.badgeColor,
                boxShadow: `0 0 12px ${scenario.badgeColor}80`,
              }}
            />
            <span className="truncate font-heading text-[15px] font-medium text-white">
              {scenario.title}
            </span>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px]"
            style={{
              backgroundColor: `${scenario.badgeColor}18`,
              color: scenario.badgeColor,
            }}
          >
            {scenario.badge}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">
          {scenario.description}
        </p>
        <div className="mt-4 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-white/25">
            Recommended response
          </span>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
            {scenario.response}
          </p>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {SCENARIOS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Scenario ${i + 1}`}
            className="group relative h-2 rounded-full transition-all duration-300"
            style={{ width: i === active ? 24 : 8, backgroundColor: i === active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)" }}
          >
            {i === active && (
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white/60"
                style={{
                  animation: "dot-fill 9s linear",
                  width: "100%",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <style jsx>{`
        @keyframes dot-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

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
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Main landing page
   ──────────────────────────────────────────── */

export function LandingClient() {
  return (
    <div className="relative overflow-hidden">
      {/* ═══════════════════════════════════════
          HERO — dark, full viewport
          ═══════════════════════════════════════ */}
      <section className="relative pb-16 pt-16 text-center">
        {/* Background video (reuses existing hero-bg.mp4) */}
        <div className="pointer-events-none absolute inset-0 -top-20 overflow-hidden">
          <video
            className="h-full w-full object-cover opacity-40 object-[60%_center]"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgb(8,12,16)]/60 via-transparent to-[rgb(8,12,16)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgb(8,12,16)_0%,_transparent_70%)] opacity-70" />
        </div>

        <div className="relative mx-auto flex min-h-[90vh] max-w-4xl flex-col items-center justify-center px-6">
          <FadeUp>
            <p className="text-sm font-medium uppercase tracking-wider text-white/25">
              Operational intelligence for leadership
            </p>
          </FadeUp>

          <FadeUp delay={150}>
            <h1 className="mt-6 text-center text-4xl font-medium leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              The{" "}
              <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
                full picture
              </span>
              {" "}of your business.
            </h1>
          </FadeUp>

          <FadeUp delay={300}>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/40">
              Qorpera connects to your tools and continuously surfaces the situations
              that matter — churn risks, stalled deals, overdue invoices, developing
              problems — with full cross-system context and the reasoning to
              understand why they matter.
            </p>
          </FadeUp>

          <FadeUp delay={450}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                className="rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-zinc-900 transition hover:bg-zinc-200"
                href="/contact"
              >
                Request Early Access
              </Link>
              <Link
                className="rounded-xl border border-white/[0.10] px-8 py-3.5 text-[15px] font-medium text-white/50 transition hover:border-white/[0.15] hover:text-white/80"
                href="/how-it-works"
              >
                How It Works
              </Link>
            </div>
          </FadeUp>

          {/* Live demo: signals → situation carousel */}
          <SignalCarousel />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          THE PROBLEM — white section
          ═══════════════════════════════════════ */}
      <section className="bg-white py-32">
        <div className="mx-auto max-w-3xl px-6">
          <FadeUp>
            <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] text-zinc-900 sm:text-4xl lg:text-5xl">
              Every tool sees one slice.
              <br />
              <span className="text-zinc-300">Nobody sees the whole picture.</span>
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <p className="mx-auto mt-8 max-w-xl text-[17px] leading-relaxed text-zinc-400">
              Your CRM knows about deals. Your invoicing system knows about
              payments. Your email knows about conversations. But the churn risk
              that combines a late payment, declining email sentiment, and an angry
              support ticket? That lives in the gap between tools — visible only to
              whoever happens to check all three at the right moment.
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-zinc-500">
              The person steering the company gets the most filtered view. You
              sit through status meetings where everyone shares their fragment.
              You piece together a picture from six dashboards and four people&apos;s
              incomplete recollections. And you still leave wondering what you
              didn&apos;t hear about.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHAT QORPERA DOES — white, bordered
          ═══════════════════════════════════════ */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeUp>
            <p className="text-xs font-medium uppercase tracking-widest text-purple-500/60">
              What changes
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              Skip the debrief.
              <br />
              <span className="text-zinc-300">You already know.</span>
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-zinc-500">
              Qorpera connects to your existing tools and watches everything that
              happens. When signals across systems converge into a situation that
              matters — a churn risk, a stalled deal, an overdue invoice with
              context — you see it immediately. Walk into any meeting already
              knowing what&apos;s happening, what&apos;s at risk, and what needs a decision.
              Or cancel the meeting entirely — you already have the picture.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          BEFORE / AFTER — white, bordered
          ═══════════════════════════════════════ */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6">
          <FadeUp>
            <h2 className="text-center text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              Not another dashboard.
              <br />
              <span className="text-zinc-300">Operational awareness.</span>
            </h2>
          </FadeUp>

          <div className="mt-16 grid gap-12 sm:grid-cols-2">
            <FadeUp delay={100}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  How you know today
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-400">
                    <span className="mt-1 text-zinc-300">&mdash;</span>Weekly status
                    meetings where everyone shares their fragment
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-400">
                    <span className="mt-1 text-zinc-300">&mdash;</span>Checking six tools
                    manually to piece together the picture
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-400">
                    <span className="mt-1 text-zinc-300">&mdash;</span>Relying on the
                    person who &ldquo;just knows&rdquo; — until they&apos;re unavailable
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-400">
                    <span className="mt-1 text-zinc-300">&mdash;</span>Finding out about
                    problems after they&apos;ve already escalated
                  </li>
                </ul>
              </div>
            </FadeUp>

            <FadeUp delay={200}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-900">
                  With Qorpera
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-900">
                    <span className="mt-1 text-purple-500">&mdash;</span>Walk into any
                    meeting already knowing what matters
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-900">
                    <span className="mt-1 text-purple-500">&mdash;</span>Cross-system
                    situations surfaced with full context, automatically
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-900">
                    <span className="mt-1 text-purple-500">&mdash;</span>Cancel the status
                    sync — you already have the picture
                  </li>
                  <li className="flex items-start gap-2.5 text-[15px] text-zinc-900">
                    <span className="mt-1 text-purple-500">&mdash;</span>Issues caught when
                    they develop, not after they&apos;ve become fires
                  </li>
                </ul>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TRUST GRADIENT — white, bordered
          Reframed: Observe → Propose → Act
          ═══════════════════════════════════════ */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeUp>
            <p className="text-xs font-medium uppercase tracking-widest text-purple-500/60">
              Trust gradient
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              Valuable from day one.
              <br />
              <span className="text-zinc-300">More capable over time.</span>
            </h2>
          </FadeUp>

          <div className="mx-auto mt-16 max-w-2xl space-y-10">
            <FadeUp delay={100}>
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-[12px] font-semibold text-purple-500">
                    1
                  </span>
                  <h3 className="text-[17px] font-medium text-zinc-900">
                    Observe
                  </h3>
                </div>
                <p className="mt-2 pl-10 text-[15px] leading-relaxed text-zinc-500">
                  Connect your tools. The AI watches, detects cross-system
                  situations, and shows you what it sees — with full context. You
                  tell it whether it&apos;s seeing the right things. This alone is
                  transformative: you&apos;ve never had this view before.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={200}>
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-[12px] font-semibold text-purple-500">
                    2
                  </span>
                  <h3 className="text-[17px] font-medium text-zinc-900">
                    Propose
                  </h3>
                </div>
                <p className="mt-2 pl-10 text-[15px] leading-relaxed text-zinc-500">
                  Once the AI demonstrates it sees the right things, it starts
                  recommending actions. &ldquo;Send a reminder to Meridian — here&apos;s why,
                  here&apos;s the email, here&apos;s what worked last time.&rdquo; You approve,
                  edit, or reject. Every response teaches it.
                </p>
              </div>
            </FadeUp>

            <FadeUp delay={300}>
              <div className="text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-[12px] font-semibold text-purple-500">
                    3
                  </span>
                  <h3 className="text-[17px] font-medium text-zinc-900">Act</h3>
                </div>
                <p className="mt-2 pl-10 text-[15px] leading-relaxed text-zinc-500">
                  After proving consistent judgment — typically 10-15 correct
                  proposals — the AI suggests handling that situation type on its
                  own. You control exactly how much autonomy it earns. And you can
                  revoke it at any time.
                </p>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={400}>
            <div className="mx-auto mt-8 h-px max-w-2xl bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
            <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-zinc-500">
              Most customers find the &ldquo;Observe&rdquo; phase alone is worth the
              investment — they see situations they would have missed entirely.
              Action authority is a bonus, not a requirement.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FIVE LAYERS — white, bordered
          ═══════════════════════════════════════ */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6">
          <FadeUp>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Under the hood
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              From fragmented signals to clear understanding.
            </h2>
          </FadeUp>

          <div className="mt-16 space-y-12">
            {[
              {
                n: "01",
                title: "Event Stream",
                desc: "Everything that happens across your connected tools flows in as events. Emails, CRM updates, invoices, support tickets. The AI\u2019s eyes and ears on your business.",
              },
              {
                n: "02",
                title: "Knowledge Graph",
                desc: "The AI builds a unified model of your business \u2014 entities, relationships, and your team structure. A contact in HubSpot and a customer in Stripe become one person with full context.",
              },
              {
                n: "03",
                title: "Situation Engine",
                desc: "Cross-system patterns are continuously detected and assembled into situations: what triggered it, what context surrounds it, and why it matters now. This is Qorpera\u2019s core.",
              },
              {
                n: "04",
                title: "Reasoning + Action",
                desc: "For each situation, the AI reasons about what it means and what to do. It checks governance rules and either presents its assessment or \u2014 once trusted \u2014 acts directly through your existing tools.",
              },
              {
                n: "05",
                title: "Learning",
                desc: "Every situation \u2192 assessment \u2192 outcome cycle is recorded. The AI gets better at your business specifically, not just at language generally. Accuracy improves with every decision.",
              },
            ].map((layer, i) => (
              <FadeUp key={layer.n} delay={i * 80}>
                <div className="flex items-start gap-6">
                  <span className="mt-1 text-[13px] font-semibold text-zinc-300">
                    {layer.n}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-medium text-zinc-900">
                      {layer.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-zinc-500">
                      {layer.desc}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp delay={400}>
            <div className="mt-12 text-center">
              <Link
                className="text-sm font-medium text-zinc-400 transition hover:text-zinc-900"
                href="/platform"
              >
                Deep-dive on the architecture &rarr;
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHO IT'S FOR — white, bordered
          ═══════════════════════════════════════ */}
      <section className="border-t border-zinc-100 bg-white py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <FadeUp>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
              Built for
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] text-zinc-900 sm:text-4xl">
              The people steering the company.
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <p className="mx-auto mt-8 max-w-lg text-[15px] leading-relaxed text-zinc-500">
              CEOs, COOs, Heads of Revenue, VP of Operations — anyone who needs to
              understand what&apos;s actually happening across the business and currently
              relies on fragmented, mediated information to make decisions.
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <div className="mx-auto mt-12 grid max-w-xl gap-8 text-left sm:grid-cols-3">
              <div>
                <p className="text-[28px] font-medium tracking-tight text-zinc-900">
                  10&ndash;50
                </p>
                <p className="mt-1 text-[13px] text-zinc-400">
                  person companies where one or two people hold the full picture in
                  their heads
                </p>
              </div>
              <div>
                <p className="text-[28px] font-medium tracking-tight text-zinc-900">
                  25 min
                </p>
                <p className="mt-1 text-[13px] text-zinc-400">
                  from signup to first situation detected across your connected tools
                </p>
              </div>
              <div>
                <p className="text-[28px] font-medium tracking-tight text-zinc-900">
                  4 tools
                </p>
                <p className="mt-1 text-[13px] text-zinc-400">
                  HubSpot, Stripe, Gmail, Google Sheets — the stack small companies
                  actually run on
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA — dark
          ═══════════════════════════════════════ */}
      <section className="bg-[rgb(8,12,16)] py-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeUp>
            <h2 className="text-3xl font-medium tracking-[-0.03em] text-white sm:text-4xl">
              See your business clearly.
            </h2>
            <p className="mt-4 text-[15px] text-white/35">
              We&apos;ll connect your tools, show you the situations Qorpera finds in
              your data, and walk through what you&apos;ve been missing — live, on your
              business.
            </p>
          </FadeUp>

          <FadeUp delay={100}>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                className="rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-zinc-900 transition hover:bg-zinc-200"
                href="/contact"
              >
                Request Early Access
              </Link>
              <Link
                className="rounded-xl border border-white/[0.10] px-8 py-3.5 text-[15px] font-medium text-white/50 transition hover:border-white/[0.15] hover:text-white/80"
                href="/how-it-works"
              >
                How It Works
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
