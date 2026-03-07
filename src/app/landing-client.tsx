"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ────────────────────────────────────────────
   Animated signal convergence demo
   Shows 4 signals from different tools merging
   into a single cross-system situation card
   ──────────────────────────────────────────── */

const SIGNALS = [
  { tool: "Stripe", event: "Invoice #4071 — 16 days overdue", color: "#635BFF" },
  { tool: "HubSpot", event: "Email response time ↑ 3.2×", color: "#FF7A59" },
  { tool: "Gmail", event: "Contract end date inquiry received", color: "#4285F4" },
  { tool: "HubSpot", event: "Support ticket — negative sentiment", color: "#FF7A59" },
];

function SignalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0); // 0=hidden, 1-4=signals, 5=divider, 6=card

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let i = 0;
          const interval = setInterval(() => {
            i++;
            setStep(i);
            if (i >= 7) clearInterval(interval);
          }, 600);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mx-auto mt-16 max-w-lg">
      {/* Signals */}
      <div className="space-y-2">
        {SIGNALS.map((s, i) => (
          <div
            key={i}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
            <span className="font-heading text-[15px] font-medium text-white">
              Churn Risk — Meridian Corp
            </span>
          </div>
          <span className="rounded-full bg-red-500/10 px-2.5 py-1 font-mono text-[10px] text-red-400">
            High · $45K ARR
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">
          This isn&apos;t a late payment. Email response time has tripled, they asked
          about their contract end date, and their last support ticket was negative.
          The $8,400 invoice is a symptom — the real risk is $45K in annual revenue.
        </p>
        <div className="mt-4 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-white/25">
            Recommended response
          </span>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">
            Alert Sarah (account owner) with full context. She saved a similar
            account 3 months ago by scheduling a face-to-face.
          </p>
        </div>
      </div>
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
              You don&apos;t know what&apos;s happening{" "}
              <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
                in your own business.
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={300}>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/40">
              Right now, the only way you know what&apos;s really happening is by asking
              the people who work in it. Qorpera gives you the full picture directly —
              every situation developing across every tool, with the context to
              understand what it means.
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

          {/* Live demo: signals → situation */}
          <SignalDemo />
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
