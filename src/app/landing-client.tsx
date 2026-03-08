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
            over the operational tasks your team shouldn&apos;t be doing manually.
          </p>
        </FadeUp>

        <FadeUp delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/contact"
              className="rounded-[10px] bg-[var(--accent)] px-8 py-3.5 font-sans text-base font-semibold text-white no-underline shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition hover:-translate-y-px hover:bg-[var(--accent-dim)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
            >
              Book a walkthrough
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
          THE PROBLEM
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--surface-warm)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              The problem
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              Your team is spending hours every week
              <br className="hidden sm:block" />
              on work AI is already capable of doing.
            </h2>
            <p className="mt-5 max-w-[640px] text-lg leading-[1.6] text-[var(--ink-soft)]">
              3–5 people on your team switch between HubSpot, Stripe, Gmail, and
              spreadsheets every day — assembling context in their heads,
              following up on invoices, updating CRM records, monitoring customer
              health, preparing reports. This work is structured, repetitive, and
              cross-tool. AI can do it. It just needs to know your business first.
            </p>
          </FadeUp>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: "🤖",
                title: "AI is capable but disconnected",
                desc: "AI models are smart enough to handle 85% of business operations tasks. But they don't know your customers, your team structure, or your policies. Without business context, they can't do real work.",
              },
              {
                icon: "🔀",
                title: "Operations span multiple tools",
                desc: "The information needed to make a good operational decision lives in 3–4 different tools. No single tool sees the full picture. Your ops team connects the dots manually, every day.",
              },
              {
                icon: "🧠",
                title: "Institutional knowledge walks out the door",
                desc: "Your best ops person \"just knows\" which customers need attention. That knowledge doesn't transfer, doesn't scale, and disappears when they leave.",
              },
            ].map((card) => (
              <FadeUp key={card.title}>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-8">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--accent-glow)] text-[20px]">
                    {card.icon}
                  </div>
                  <h3 className="mb-2.5 font-sans text-[17px] font-bold text-[var(--ink)]">
                    {card.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                    {card.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHAT QORPERA IS
          ═══════════════════════════════════════ */}
      <section id="how" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              What Qorpera is
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              The system that teaches AI how your company works — then gradually lets it take over.
            </h2>
          </FadeUp>

          <div className="mt-16 space-y-14">
            {[
              {
                num: "01",
                title: "Map your business",
                desc: "Build a simple map of your departments and team. Who does what, who's responsible for what. This gives the AI the organizational context no other tool provides.",
              },
              {
                num: "02",
                title: "Connect your tools",
                desc: "One-click OAuth to HubSpot, Stripe, Gmail. The AI ingests your data and maps it to your organizational structure — customers to departments, invoices to teams.",
              },
              {
                num: "03",
                title: "Teach what matters",
                desc: "Tell the AI what keeps you up at night, in plain language. It learns your operational priorities and starts watching for them across all connected tools.",
              },
              {
                num: "04",
                title: "Let it earn trust",
                desc: "The AI starts by observing and proposing. You approve, correct, or reject. As it proves itself, it graduates to handling tasks autonomously. One task type at a time. Fully reversible.",
              },
            ].map((step, i) => (
              <FadeUp key={step.num} delay={i * 80}>
                <div
                  className={`grid items-start gap-8 max-sm:grid-cols-[48px_1fr] max-sm:gap-5 ${
                    i < 3 ? "border-b border-[var(--border)] pb-14" : ""
                  }`}
                  style={{ gridTemplateColumns: "80px 1fr" }}
                >
                  <div className="font-sans text-5xl font-bold leading-none text-[var(--border)] max-sm:text-4xl">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="mb-2 font-sans text-[22px] font-bold text-[var(--ink)] max-sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="max-w-[560px] text-base leading-[1.65] text-[var(--ink-soft)]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TRUST GRADIENT — dark
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--ink)] px-6 py-[120px] text-white lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              The trust gradient
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              AI autonomy isn&apos;t a switch you flip.
              <br className="hidden sm:block" />
              It&apos;s something the system earns.
            </h2>
          </FadeUp>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                tag: "Week 1+",
                title: "Observe",
                desc: "The AI watches your operations across all connected tools. It surfaces situations that need attention — with the full cross-system context to understand them. You tell it whether it's seeing the right things.",
                example:
                  '"Invoice #4071 is 14 days overdue. This customer\'s email sentiment has dropped and their contract renews in 60 days. This needs attention."',
              },
              {
                tag: "Weeks 2–4+",
                title: "Propose",
                desc: "The AI starts recommending specific actions. You see exactly what it wants to do, why, and what happened last time in a similar situation. Approve, edit, or reject — every response teaches it.",
                example:
                  '"I recommend a personal check-in with this customer before sending a payment reminder. Here\'s a draft based on their account history."',
              },
              {
                tag: "Month 2+",
                title: "Act",
                desc: "After demonstrating consistent judgment — typically 10–15 correct calls without corrections — the AI suggests handling that task type on its own. Full visibility. Governance policies. Instant revoke.",
                example:
                  '"You\'ve approved all 12 of my overdue invoice follow-ups without changes. Want me to handle these automatically?"',
              },
            ].map((phase) => (
              <FadeUp key={phase.title}>
                <div className="rounded-[var(--radius)] border border-white/10 bg-white/5 p-7">
                  <div className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--accent)]">
                    {phase.tag}
                  </div>
                  <h3 className="mb-3 font-sans text-[20px] font-bold text-white">
                    {phase.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-white/60">
                    {phase.desc}
                  </p>
                  <div className="mt-4 rounded-lg bg-white/5 p-4 font-sans text-[13px] italic leading-[1.5] text-white/40">
                    {phase.example}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <p className="mt-10 max-w-[800px] text-[15px] leading-[1.6] text-white/40">
              No other platform does this. Glean&apos;s agents either have
              permission or they don&apos;t. Salesforce Agentforce has binary
              on/off. Zapier automations just run. Qorpera is the only system
              where AI earns autonomy through demonstrated competence.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHAT IT HANDLES — tasks grid
          ═══════════════════════════════════════ */}
      <section id="tasks" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              What Qorpera handles
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              The operational work that currently requires
              <br className="hidden sm:block" />
              3–5 people switching between 4 tools.
            </h2>
            <p className="mt-5 max-w-[640px] text-lg leading-[1.6] text-[var(--ink-soft)]">
              These aren&apos;t features. These are the tasks your team does
              manually every week — and each one requires context from multiple
              systems that no single tool provides.
            </p>
          </FadeUp>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              "Invoice follow-ups with customer-specific context — not templates",
              "Pre-meeting briefings assembled from CRM, email, and payment history",
              "Stalled deal detection before they quietly die in the pipeline",
              "Customer churn risk signals by combining payment, email, and support patterns",
              "CRM record updates from email conversations — no manual data entry",
              "Support ticket routing based on customer value and relationship history",
              "Weekly operational summaries generated from actual cross-tool data",
              "Contract renewal preparation with full account health context",
            ].map((task) => (
              <FadeUp key={task}>
                <div className="flex items-start gap-3.5 rounded-[10px] border border-[var(--border)] px-6 py-5 transition hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]">
                  <div className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-xs text-[var(--green-soft)]">
                    ✓
                  </div>
                  <span className="font-sans text-[15px] font-medium leading-[1.45] text-[var(--ink-soft)]">
                    {task}
                  </span>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <p className="mt-10 max-w-[720px] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
              Each of these tasks requires information from at least 2–3
              different tools. That&apos;s why no single app solves them.
              That&apos;s why your team does them manually. And that&apos;s
              exactly what Qorpera was built to handle.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PRICING
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--surface-warm)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Investment
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              Priced against the operational work it replaces — not against software.
            </h2>
          </FadeUp>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                phase: "Getting started",
                price: "50,000 DKK",
                unit: "implementation",
                desc: "We map your business, connect your tools, and configure your first situation types together. This is a professional engagement, not a self-serve signup.",
              },
              {
                phase: "Months 1–6",
                price: "20,000 DKK",
                unit: "/month",
                desc: "The AI watches, proposes, and learns. You teach it by approving, correcting, and rejecting. Active tuning included.",
              },
              {
                phase: "Months 7–12",
                price: "50,000 DKK",
                unit: "/month",
                desc: "Task types graduate to autonomous. The AI is doing real operational work. Price reflects real value delivered.",
              },
              {
                phase: "Year 2+",
                price: "100,000 DKK",
                unit: "/month",
                desc: "The AI is a functioning part of your operations team. Institutional knowledge captured. YoY increases of 7–10%.",
              },
            ].map((tier, i) => (
              <FadeUp key={tier.phase} delay={i * 60}>
                <div className="flex h-full flex-col rounded-[var(--radius)] border border-[var(--border)] bg-white p-6">
                  <div className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--accent)]">
                    {tier.phase}
                  </div>
                  <div className="mb-1 font-sans text-2xl font-bold text-[var(--ink)]">
                    {tier.price}
                  </div>
                  <div className="mb-4 font-sans text-sm text-[var(--ink-muted)]">
                    {tier.unit}
                  </div>
                  <p className="mt-auto text-[13px] leading-relaxed text-[var(--ink-soft)]">
                    {tier.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <p className="mt-10 max-w-[720px] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
              At full operations, Qorpera costs less than a third of the
              operational headcount it replaces — and the knowledge it captures
              never walks out the door.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          COMPARISON TABLE
          ═══════════════════════════════════════ */}
      <section id="compare" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Why not just use...
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              How Qorpera compares to what you already have.
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <div className="mt-12 overflow-x-auto">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Dashboards &amp; BI</th>
                    <th>Zapier / Make</th>
                    <th>AI Copilots</th>
                    <th>SF Agentforce</th>
                    <th>Qorpera</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sees across all your tools</td>
                    <td>Partially</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td>CRM only</td>
                    <td className="highlight-cell">Yes</td>
                  </tr>
                  <tr>
                    <td>Understands your business context</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                    <td className="highlight-cell">Yes</td>
                  </tr>
                  <tr>
                    <td>Watches proactively</td>
                    <td>No</td>
                    <td>Rules only</td>
                    <td>No</td>
                    <td>Limited</td>
                    <td className="highlight-cell">Continuously</td>
                  </tr>
                  <tr>
                    <td>Reasons about situations</td>
                    <td>No</td>
                    <td>No</td>
                    <td>When asked</td>
                    <td>Limited</td>
                    <td className="highlight-cell">Every situation</td>
                  </tr>
                  <tr>
                    <td>Takes action with judgment</td>
                    <td>No</td>
                    <td>Fixed rules</td>
                    <td>No</td>
                    <td>Within CRM</td>
                    <td className="highlight-cell">Across all tools</td>
                  </tr>
                  <tr>
                    <td>Learns from outcomes</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                    <td>No</td>
                    <td className="highlight-cell">Every cycle</td>
                  </tr>
                  <tr>
                    <td>Earns trust over time</td>
                    <td>N/A</td>
                    <td>N/A</td>
                    <td>N/A</td>
                    <td>N/A</td>
                    <td className="highlight-cell">Graduated autonomy</td>
                  </tr>
                  <tr>
                    <td>Works for 30-person companies</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>Yes</td>
                    <td>No</td>
                    <td className="highlight-cell">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          MARKET VALIDATION — dark
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--ink)] px-6 py-[120px] text-white lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-white/40">
              The market
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              Enterprises are already paying billions for AI that does real work.
              <br className="hidden sm:block" />
              We bring that capability to companies they&apos;ll never serve.
            </h2>
          </FadeUp>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                stat: "$7.2B",
                company: "Glean",
                desc: "Glean's valuation for enterprise AI search. Requires 100+ seats. Doesn't serve companies your size.",
              },
              {
                stat: "$360B",
                company: "Palantir",
                desc: "Palantir's market cap for AI-powered operations. Requires months of professional services and on-site engineers.",
              },
              {
                stat: "$150M+",
                company: "Sierra",
                desc: "Sierra's ARR from AI agents that do real customer service work. Proves enterprises pay for AI that delivers outcomes.",
              },
            ].map((m) => (
              <FadeUp key={m.company}>
                <div className="rounded-[var(--radius)] border border-white/10 bg-white/5 p-6">
                  <div className="font-sans text-[36px] font-bold leading-none tracking-[-1px] text-[var(--accent)]">
                    {m.stat}
                  </div>
                  <div className="mt-1 font-sans text-sm font-semibold text-white/60">
                    {m.company}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/40">
                    {m.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp>
            <p className="mt-10 max-w-[720px] text-[15px] leading-[1.6] text-white/40">
              The AI capability is here. The enterprise infrastructure exists.
              What&apos;s missing is the version built for growing businesses —
              accessible in a single session, not a six-month deployment.
              That&apos;s Qorpera.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA — dark
          ═══════════════════════════════════════ */}
      <section id="cta" className="bg-[var(--ink)] border-t border-white/10 px-6 py-[100px] text-center text-white lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
              The company that has this in two years
              <br className="hidden sm:block" />
              has an AI that understands their entire business.
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-lg leading-[1.6] text-white/40">
              The company that doesn&apos;t is still copy-pasting between
              HubSpot and Gmail.
            </p>
          </FadeUp>
          <FadeUp delay={100}>
            <div className="mt-10">
              <a
                href="/contact"
                className="inline-block rounded-[10px] bg-white px-9 py-4 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
              >
                Book a walkthrough
              </a>
            </div>
            <p className="mt-6 max-w-[480px] mx-auto text-sm leading-relaxed text-white/30">
              We personally walk every new customer through setup. First session
              takes 60–90 minutes. First situations appear the same day.
            </p>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
