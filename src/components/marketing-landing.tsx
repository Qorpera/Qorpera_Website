import Link from "next/link";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Qorpera",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI workforce platform with project-based execution, permissions, approvals, and hybrid local/cloud orchestration.",
  url: "https://qorpera.com",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "299",
    offerCount: "3",
  },
};

const AGENTS = [
  { name: "Mara", role: "Support Rep", dot: "bg-teal-400", tasks: "Triage tickets · draft replies · escalate" },
  { name: "Kai", role: "Sales Rep", dot: "bg-rose-400", tasks: "Prospect · outreach · pipeline" },
  { name: "Zoe", role: "CS Manager", dot: "bg-emerald-400", tasks: "Health scores · renewals · check-ins" },
  { name: "Ava", role: "Marketing", dot: "bg-purple-400", tasks: "Content · campaigns · analytics" },
  { name: "Max", role: "Finance Analyst", dot: "bg-cyan-400", tasks: "Reports · reconciliation · invoicing" },
  { name: "Jordan", role: "Ops Manager", dot: "bg-slate-400", tasks: "SOPs · vendor comms · process ops" },
  { name: "Sam", role: "Exec Assistant", dot: "bg-violet-400", tasks: "Inbox · briefings · action tracking" },
  { name: "Nova", role: "Research Analyst", dot: "bg-amber-400", tasks: "Deep research · validation · reports" },
];

const STEPS = [
  {
    n: "01",
    title: "Brief your AI advisor",
    body: "Tell the Chief Advisor what your business does and where you need help. It recommends which specialist agents to activate and how to configure them.",
  },
  {
    n: "02",
    title: "Agents get to work",
    body: "Each agent operates inside projects, uses your connected tools — CRM, Slack, Drive, Linear — and produces structured, reviewable outputs.",
  },
  {
    n: "03",
    title: "Review, approve, ship",
    body: "Before any irreversible action, the agent surfaces it for human review. You approve or edit. Execution follows. A full audit trail stays behind.",
  },
];

const BENEFITS = [
  {
    icon: (
      <svg className="h-5 w-5 text-teal-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Dependable execution",
    body: "Projects, approval gates, audit trails, and monitoring make AI fit real operational workflows — not just demos.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-teal-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
    title: "ROI on day one",
    body: "Automate the most repetitive work first. Humans stay in control. Expand as trust grows. The savings show up immediately.",
  },
  {
    icon: (
      <svg className="h-5 w-5 text-teal-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "Privacy by default",
    body: "Local-first routing keeps sensitive workflows on your infrastructure. Your data doesn't leave for routine work.",
  },
];

export function MarketingLanding() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-20 pt-12 sm:pt-16">
        {/* Background glows */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-teal-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -left-20 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-teal-500/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-0 h-[200px] w-[400px] rounded-full bg-amber-500/[0.04] blur-3xl" />

        <div className="relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/[0.07] px-4 py-1.5 text-xs font-medium text-teal-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
            AI Workforce Platform
          </div>

          {/* Headline */}
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]">
            Hire AI agents.<br />
            <span className="text-teal-400">Give them real work.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#b8c5ce]">
            Not another chatbot. Qorpera deploys specialist AI agents — support, sales, finance, ops — inside projects with permissions, approval gates, and hybrid local/cloud execution.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-teal-500 px-7 py-3 text-sm font-semibold text-[#062f2b] transition-all hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/[0.12] bg-white/[0.04] px-7 py-3 text-sm text-white/80 transition-all hover:bg-white/[0.07] hover:border-white/20"
            >
              See pricing →
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#b8c5ce]">
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-teal-400" />Approval gate before every irreversible action</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-teal-400" />Local-first — cloud only when quality demands it</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-teal-400" />Full audit trail</span>
          </div>
        </div>

        {/* Product mock */}
        <div className="relative mt-12">
          {/* Subtle glow behind the mock */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-8 top-8 mx-auto max-w-4xl rounded-3xl bg-teal-500/[0.04] blur-2xl" />

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d1519] shadow-2xl shadow-black/60">
            {/* Titlebar */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-white/10" />
              <span className="h-3 w-3 rounded-full bg-white/10" />
              <span className="h-3 w-3 rounded-full bg-white/10" />
              <span className="ml-3 text-xs text-white/25">qorpera.com — AI workforce control room</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-white/25">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                3 agents online
              </span>
            </div>

            {/* Two-pane layout */}
            <div className="flex min-h-[320px] divide-x divide-white/[0.05]">
              {/* Sidebar mock */}
              <div className="hidden w-[180px] shrink-0 flex-col gap-0.5 p-3 sm:flex">
                {[
                  { label: "Chat", active: false },
                  { label: "Review", active: false, badge: "2" },
                  { label: "Projects", active: false },
                  { label: "Metrics", active: false },
                  { label: "Agents", active: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                      item.active
                        ? "bg-teal-500/10 text-teal-400"
                        : "text-white/35"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Main content mock */}
              <div className="flex-1 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-widest text-white/25">
                    Active agents
                  </div>
                  <div className="text-xs text-white/25">4 of 8 hired</div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {AGENTS.slice(0, 6).map((a) => (
                    <div
                      key={a.name}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                        <span className="text-sm font-medium text-white/80">{a.name}</span>
                        <span className="ml-auto truncate text-xs text-white/30">{a.role}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-white/25 leading-relaxed">{a.tasks}</div>
                    </div>
                  ))}
                </div>

                {/* Pending approval mock */}
                <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span className="font-medium text-amber-400">Needs your review</span>
                    <span className="text-white/30 ml-auto hidden sm:block">Kai wants to send proposal to Acme Corp · $42k ACV</span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <button className="rounded-full bg-teal-500/15 px-3.5 py-1 text-xs font-medium text-teal-400 transition hover:bg-teal-500/25">
                      Approve
                    </button>
                    <button className="rounded-full bg-white/[0.05] px-3.5 py-1 text-xs text-white/40 transition hover:bg-white/[0.08]">
                      Edit first
                    </button>
                    <button className="rounded-full bg-white/[0.05] px-3.5 py-1 text-xs text-white/40 transition hover:bg-white/[0.08]">
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPARTMENT STRIP ─────────────────────────────────────── */}
      <div className="border-y border-white/[0.06] py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#b8c5ce]">
          <span className="text-xs font-medium uppercase tracking-widest text-white/25">Works across</span>
          {["Customer Support", "Sales Operations", "Finance", "Marketing", "Operations", "Executive Office", "Research"].map((dept) => (
            <span key={dept} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-white/20" />
              {dept}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mb-12 max-w-xl">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">How it works</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From brief to done —<br />with humans in the loop
          </h2>
        </div>

        <div className="grid gap-0 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={`relative p-6 ${i < 2 ? "border-b border-white/[0.06] md:border-b-0 md:border-r" : ""}`}
            >
              <div className="text-6xl font-bold text-white/[0.04] select-none">{step.n}</div>
              <div className="mt-1 text-lg font-semibold text-white">{step.title}</div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#b8c5ce]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AGENT ROSTER ─────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">The team</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Eight specialist agents, ready to hire
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#b8c5ce]">
              Each agent is trained on a specific business function. They understand their role, their tools, and their limits. Activate them on your plan — swap, pause, or replace any time.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex rounded-full bg-teal-500 px-6 py-2.5 text-sm font-semibold text-[#062f2b] transition-all hover:bg-teal-400"
            >
              Meet the roster
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition-all hover:border-white/[0.13] hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                  <span className="font-semibold text-white">{a.name}</span>
                  <span className="ml-auto rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-0.5 text-xs text-white/40">
                    {a.role}
                  </span>
                </div>
                <div className="mt-2.5 text-xs leading-relaxed text-white/35 group-hover:text-white/50 transition-colors">
                  {a.tasks}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HYBRID ORCHESTRATION ─────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">Hybrid routing</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Cloud quality.<br />Near-zero marginal cost.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#b8c5ce]">
              Routine work — triage, enrichment, drafts — runs on local models by default. Fast, private, and essentially free at scale.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#b8c5ce]">
              When an agent hits low confidence or a high-stakes decision, it automatically escalates to a top cloud model. Cloud-level quality, without cloud-level bills.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="text-3xl font-bold text-emerald-400">~80%</div>
                <div className="mt-1.5 text-xs leading-relaxed text-[#b8c5ce]">Runs locally<br />Fast · private · near-zero cost</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                <div className="text-3xl font-bold text-sky-400">~20%</div>
                <div className="mt-1.5 text-xs leading-relaxed text-[#b8c5ce]">Escalates to cloud<br />Quality where it counts</div>
              </div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Routine tasks</div>
                  <div className="mt-1 text-xs text-[#b8c5ce]">Support triage · enrichment · draft generation · report formatting</div>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-1 text-xs font-medium text-emerald-400">
                  Local
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-4/5 rounded-full bg-emerald-500/50" />
              </div>
              <div className="mt-1.5 text-right text-[10px] text-white/25">~80% of work</div>
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-[#b8c5ce]">
                <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 1.5a.75.75 0 0 1 .75.75v5h5a.75.75 0 0 1 0 1.5h-5v5a.75.75 0 0 1-1.5 0v-5h-5a.75.75 0 0 1 0-1.5h5v-5A.75.75 0 0 1 8 1.5Z" />
                </svg>
                Low confidence · high risk → escalate
              </div>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Hard cases</div>
                  <div className="mt-1 text-xs text-[#b8c5ce]">Complex reasoning · legal review · nuanced negotiation · edge cases</div>
                </div>
                <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/[0.08] px-3 py-1 text-xs font-medium text-sky-400">
                  Cloud
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-1/5 rounded-full bg-sky-500/50" />
              </div>
              <div className="mt-1.5 text-right text-[10px] text-white/25">~20% of work</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY QORPERA ──────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="mb-12 max-w-xl">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">Why Qorpera</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for operations,<br />not experiments
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                {b.icon}
              </div>
              <div className="mt-4 text-base font-semibold text-white">{b.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-[#b8c5ce]">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-20">
        <div className="mb-12 max-w-xl">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-teal-400">Pricing</div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Start small. Scale when ready.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {([
            {
              name: "Solo",
              price: "$299",
              period: "/mo",
              agents: "Up to 4 agents",
              desc: "For founders and individual operators automating their own workflow.",
              cta: "Get started",
              href: "/pricing",
              highlight: false,
            },
            {
              name: "Small Business",
              price: "From $1,500",
              period: "/mo",
              agents: "Up to 8 agents",
              desc: "For teams automating across departments with shared oversight.",
              cta: "Get in touch",
              href: "/pricing",
              highlight: true,
            },
            {
              name: "Mid-size",
              price: "From $5,000",
              period: "/mo",
              agents: "Up to 20 agents",
              desc: "Full-org AI workforce with advanced controls and custom integrations.",
              cta: "Get in touch",
              href: "/pricing",
              highlight: false,
            },
          ] as const).map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-teal-500/30 bg-teal-500/[0.06]"
                  : "border-white/[0.07] bg-white/[0.025]"
              }`}
            >
              {plan.highlight && (
                <div className="mb-4 inline-block rounded-full border border-teal-500/30 bg-teal-500/[0.09] px-2.5 py-0.5 text-xs font-medium text-teal-400">
                  Most popular
                </div>
              )}
              <div className="text-sm font-medium text-[#b8c5ce]">{plan.name}</div>
              <div className="mt-1.5 text-2xl font-bold text-white">
                {plan.price}
                <span className="text-sm font-normal text-[#b8c5ce]">{plan.period}</span>
              </div>
              <div className="mt-1 text-xs text-teal-400">{plan.agents}</div>
              <p className="mt-3 text-sm leading-relaxed text-[#b8c5ce]">{plan.desc}</p>
              <Link
                href={plan.href}
                className={`mt-5 block rounded-full py-2.5 text-center text-sm font-medium transition-all ${
                  plan.highlight
                    ? "bg-teal-500 text-[#062f2b] hover:bg-teal-400"
                    : "border border-white/[0.10] bg-white/[0.04] text-white/80 hover:bg-white/[0.07]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] py-24">
        <div className="relative">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 rounded-full bg-teal-500/[0.06] blur-3xl" />

          <div className="relative">
            <h2 className="max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Your AI workforce<br />
              <span className="text-teal-400">starts today.</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#b8c5ce]">
              Set up takes minutes. Brief your advisor, activate your first agent, and watch it start producing reviewable work — while you stay in control.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-teal-500 px-8 py-3.5 text-sm font-semibold text-[#062f2b] transition-all hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20"
              >
                Start free
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/[0.12] bg-white/[0.04] px-8 py-3.5 text-sm text-white/80 transition-all hover:bg-white/[0.07]"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
