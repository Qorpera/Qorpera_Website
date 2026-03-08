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
          HERO
          ═══════════════════════════════════════ */}
      <section className="px-6 pb-[100px] pt-[180px] text-center lg:px-10">
        <FadeUp>
          <div className="mb-6 inline-flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
            <span className="inline-block h-px w-6 bg-[var(--accent)]" />
            The AI integration layer
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
          <p className="mx-auto mt-7 max-w-[580px] text-[20px] leading-[1.6] text-[var(--ink-soft)]">
            Qorpera teaches AI how your company works, connects it to your tools,
            and gradually lets it take over the tasks your team shouldn&apos;t be
            doing manually.
          </p>
        </FadeUp>

        <FadeUp delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/contact"
              className="rounded-[10px] bg-[var(--accent)] px-8 py-3.5 font-sans text-base font-semibold text-white no-underline shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition hover:-translate-y-px hover:bg-[var(--accent-dim)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
            >
              Request early access
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
          GAP VISUAL — dark section
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--ink)] px-6 py-[100px] text-white lg:px-10">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="mb-10 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-white/40">
            The integration gap
          </div>

          <div className="mb-12 flex flex-wrap items-end justify-center gap-16">
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

          <p className="mx-auto mb-3 max-w-[640px] text-[22px] leading-[1.5] text-white/70">
            The gap isn&apos;t intelligence. AI is smart enough.{" "}
            <strong className="text-white">
              The gap is that AI doesn&apos;t know your business
            </strong>{" "}
            — your customers, your team, your processes, your tools. Without that
            context, it can&apos;t do real work.
          </p>
          <p className="font-sans text-xs text-white/30">
            Source:{" "}
            <a
              href="https://www.anthropic.com/research/labor-market-impacts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 no-underline"
            >
              Anthropic Labor Market Research, March 2026
            </a>
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
              Your business runs on people connecting dots
              <br className="hidden sm:block" />
              across tools that don&apos;t talk to each other.
            </h2>
            <p className="mt-5 max-w-[600px] text-lg leading-[1.6] text-[var(--ink-soft)]">
              The knowledge of how your business actually operates lives in
              people&apos;s heads — not in any system. When those people are busy,
              on vacation, or leave, things fall through the cracks.
            </p>
          </FadeUp>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: "🔀",
                title: "Fragmented tools",
                desc: "Your CRM, invoicing, email, and spreadsheets each see one slice. Nobody — and nothing — sees the full picture across all of them.",
              },
              {
                icon: "🧠",
                title: "Knowledge trapped in people",
                desc: "Your best ops person \"just knows\" which customers need attention. That institutional knowledge doesn't transfer, doesn't scale, and walks out the door when they leave.",
              },
              {
                icon: "🤖",
                title: "AI that can't do real work",
                desc: "AI chatbots can write emails and answer questions. But they don't know your customers, your team structure, or your policies — so they can't actually operate inside your business.",
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
          HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section id="how" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              How Qorpera works
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              Onboard AI like you&apos;d onboard an employee.
            </h2>
            <p className="mt-5 max-w-[600px] text-lg leading-[1.6] text-[var(--ink-soft)]">
              You don&apos;t throw a new hire into the deep end. You show them how
              the company works, introduce them to the team, and let them prove
              themselves before giving them responsibility. Qorpera works the same
              way.
            </p>
          </FadeUp>

          <div className="mt-16 space-y-14">
            {[
              {
                num: "01",
                time: "2 minutes",
                title: "Show it your organization",
                desc: "Build a simple map of your departments and team — who does what, who's responsible for what. This gives the AI the structural context no other tool provides.",
              },
              {
                num: "02",
                time: "5 minutes",
                title: "Connect your tools",
                desc: "One-click OAuth to HubSpot, Stripe, Gmail, Google Sheets. The AI starts ingesting your data and mapping it to your organizational structure — customers to departments, invoices to teams.",
              },
              {
                num: "03",
                time: "10 minutes",
                title: "Teach it what matters",
                desc: 'Tell the AI what keeps you up at night, in plain language. "We lose track of overdue invoices." "Deals stall without anyone noticing." It learns your operational priorities and starts watching for them.',
              },
              {
                num: "04",
                time: "Ongoing",
                title: "Let it earn your trust",
                desc: "The AI starts by showing you what it sees and recommending actions. You approve, correct, or reject. As it proves it gets things right, you let it handle more. One task type at a time. Fully reversible.",
              },
            ].map((step, i) => (
              <FadeUp key={step.num} delay={i * 80}>
                <div
                  className={`grid items-start gap-8 ${
                    i < 3 ? "border-b border-[var(--border)] pb-14" : ""
                  }`}
                  style={{ gridTemplateColumns: "80px 1fr" }}
                >
                  <div className="font-sans text-5xl font-bold leading-none text-[var(--border)] max-sm:text-4xl">
                    {step.num}
                  </div>
                  <div>
                    <div className="mb-3 font-sans text-[13px] font-semibold text-[var(--accent)]">
                      {step.time}
                    </div>
                    <h3 className="mb-2 font-sans text-[22px] font-bold text-[var(--ink)]">
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
          TRUST GRADIENT
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--surface-warm)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              The trust gradient
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              AI autonomy isn&apos;t a switch. It&apos;s something earned.
            </h2>
          </FadeUp>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                tag: "Week 1",
                title: "Observe",
                desc: "The AI watches your operations across all connected tools. It surfaces situations that need attention — with the full cross-system context to understand them.",
                example:
                  '"Invoice #4071 is 14 days overdue. This customer\'s email tone has shifted negative and their contract renews in 60 days."',
              },
              {
                tag: "Weeks 2–4",
                title: "Propose",
                desc: "The AI starts recommending specific actions. You see exactly what it wants to do and why. Approve, edit, or reject — every response teaches it.",
                example:
                  '"I recommend sending a personal check-in to this customer before the payment reminder. Here\'s a draft based on their history."',
              },
              {
                tag: "Month 2+",
                title: "Act",
                desc: "After 10–15 correct calls in a row, the AI suggests handling that task type on its own. You stay in control — full visibility, governance policies, instant revoke.",
                example:
                  '"You\'ve approved all 12 of my overdue invoice follow-ups without changes. Want me to handle these automatically?"',
              },
            ].map((phase) => (
              <FadeUp key={phase.title}>
                <div className="rounded-[var(--radius)] border-[1.5px] border-[var(--border)] bg-white p-7 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                  <div className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--accent)]">
                    {phase.tag}
                  </div>
                  <h3 className="mb-3 font-sans text-[20px] font-bold text-[var(--ink)]">
                    {phase.title}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                    {phase.desc}
                  </p>
                  <div className="mt-4 rounded-lg bg-[var(--surface-warm)] p-4 font-sans text-[13px] italic leading-[1.5] text-[var(--ink-soft)]">
                    {phase.example}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          WHAT IT CAN DO — tasks grid
          ═══════════════════════════════════════ */}
      <section id="tasks" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              What Qorpera handles
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              The operational work your team does manually
              <br className="hidden sm:block" />
              across four different tools.
            </h2>
            <p className="mt-5 max-w-[600px] text-lg leading-[1.6] text-[var(--ink-soft)]">
              These aren&apos;t hypothetical. These are the tasks that eat hours
              every week — and the AI is already capable of handling them.
            </p>
          </FadeUp>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              "Follow up on overdue invoices with context-aware emails — not generic templates",
              "Prepare pre-meeting briefings by pulling data from CRM, email, and payment history",
              "Flag stalled deals in your pipeline before they quietly die",
              "Route and prioritize support tickets based on customer value and history",
              "Update CRM records from email conversations without manual data entry",
              "Detect early churn signals by combining payment, email, and support patterns",
              "Draft and send follow-up emails that reference the customer's full context",
              "Generate weekly operational summaries — no one assembling reports manually",
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
        </div>
      </section>

      {/* ═══════════════════════════════════════
          COMPARISON TABLE
          ═══════════════════════════════════════ */}
      <section id="compare" className="bg-[var(--surface-warm)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Why not just use...
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              Qorpera vs. the tools you already have.
            </h2>
          </FadeUp>

          <FadeUp delay={100}>
            <div className="mt-12 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white">
              <table className="w-full border-collapse font-sans text-sm">
                <thead>
                  <tr className="bg-[var(--ink)] text-left text-[13px] font-semibold tracking-[0.5px] text-white">
                    <th className="px-6 py-4.5"></th>
                    <th className="px-6 py-4.5">Dashboards & BI</th>
                    <th className="px-6 py-4.5">Zapier / Make</th>
                    <th className="px-6 py-4.5">AI Copilots</th>
                    <th className="px-6 py-4.5">Qorpera</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Sees across all your tools", "Partially", "Yes", "No", "Yes"],
                    ["Understands your business context", "No", "No", "No", "Yes"],
                    ["Reasons about situations", "No", "No", "When asked", "Continuously"],
                    ["Takes action", "No", "Fixed rules only", "No", "With judgment"],
                    ["Learns from outcomes", "No", "No", "No", "Every cycle"],
                    ["Earns trust over time", "N/A", "N/A", "N/A", "Graduated autonomy"],
                  ].map((row, i) => (
                    <tr
                      key={row[0]}
                      className={`border-b border-[var(--border)] last:border-b-0 ${
                        i % 2 === 1 ? "bg-[var(--surface)]" : ""
                      }`}
                    >
                      <td className="px-6 py-4.5 font-semibold text-[var(--ink)]">
                        {row[0]}
                      </td>
                      <td className="px-6 py-4.5 text-[var(--ink-soft)]">{row[1]}</td>
                      <td className="px-6 py-4.5 text-[var(--ink-soft)]">{row[2]}</td>
                      <td className="px-6 py-4.5 text-[var(--ink-soft)]">{row[3]}</td>
                      <td className="px-6 py-4.5 font-semibold text-[var(--accent)]">
                        {row[4]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA — dark
          ═══════════════════════════════════════ */}
      <section id="cta" className="bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
              Ready to close the gap?
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-lg leading-[1.6] text-white/60">
              Qorpera is in early access for companies running on HubSpot,
              Stripe, and Gmail. Ten minutes to set up. First results on day one.
            </p>
          </FadeUp>
          <FadeUp delay={100}>
            <div className="mt-10">
              <a
                href="/contact"
                className="inline-block rounded-[10px] bg-white px-9 py-4 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
              >
                Request early access
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
