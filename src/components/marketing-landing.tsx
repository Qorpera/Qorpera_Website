import Link from "next/link";

const PITCH_LINES = [
  "Businesses don’t need another chatbot. They need work to get done, reliably, cheaply, and safely.",
  "We onboard companies into an AI workforce: agents that operate inside projects, use your tools, and produce reviewable outputs.",
  "Hybrid orchestration routes routine, high-volume tasks to local models, then escalates only hard cases to top cloud models when quality matters.",
  "That delivers cloud-level capability without cloud-level spend, plus privacy and control for sensitive workflows.",
  "We turn AI productivity gains into an operating system with permissions, approvals, audit trails, and monitoring so it becomes dependable, not a toy.",
  "Customers see immediate ROI in support, sales ops, marketing ops, finance ops, and internal admin while humans keep judgment and oversight.",
];

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
    lowPrice: "0",
    offerCount: "3",
  },
};

export function MarketingLanding() {
  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <section className="wf-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-56 w-56 translate-x-14 -translate-y-10 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-44 w-44 -translate-x-8 translate-y-8 rounded-full bg-amber-200/50 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-800">
              AI workforce platform
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Get work done with AI agents that are safe, cheap, and reviewable
            </h1>
            <p className="mt-4 max-w-2xl text-base wf-muted">
              Not another chatbot. A project-based operating system for AI execution with permissions, approvals, auditing, and hybrid local/cloud orchestration.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup" className="wf-btn-primary px-5 py-2.5 text-sm font-medium">
                Start free
              </Link>
              <Link href="/login" className="wf-btn px-5 py-2.5 text-sm">
                Log in
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Cost</div>
                <div className="mt-2 text-xl font-semibold">Near-zero marginal cost</div>
                <div className="mt-1 text-sm wf-muted">Routine work stays local by default.</div>
              </div>
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Quality</div>
                <div className="mt-2 text-xl font-semibold">Escalate only hard cases</div>
                <div className="mt-1 text-sm wf-muted">Cloud models where they matter most.</div>
              </div>
              <div className="wf-soft rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] wf-muted">Safety</div>
                <div className="mt-2 text-xl font-semibold">Approvals + audit trail</div>
                <div className="mt-1 text-sm wf-muted">Humans keep judgment and oversight.</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="wf-soft rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] wf-muted">Hybrid orchestration</div>
                  <div className="mt-1 text-lg font-semibold">Local-first execution path</div>
                </div>
                <span className="wf-chip rounded-full px-2 py-1 text-xs">Live policy</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">Routine tasks</div>
                      <div className="text-sm wf-muted">Support triage, enrichment, draft generation</div>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                      Local models
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-zinc-200">
                    <div className="h-2 w-4/5 rounded-full bg-emerald-500" />
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="rounded-full border border-[var(--border)] bg-white/85 px-3 py-1 text-xs">Escalate on low confidence / high risk</div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">Hard cases</div>
                      <div className="text-sm wf-muted">Complex reasoning, nuanced redlines, edge-case responses</div>
                    </div>
                    <div className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800">
                      Cloud models
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-zinc-200">
                    <div className="h-2 w-1/3 rounded-full bg-sky-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="wf-soft rounded-3xl p-5">
              <div className="text-xs uppercase tracking-[0.16em] wf-muted">Value by function</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {["Support ops", "Sales ops", "Marketing ops", "Finance ops", "Internal admin", "Engineering workflows"].map((team) => (
                  <div key={team} className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2">
                    {team}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="wf-panel rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] wf-muted">See the product</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">2D digital office map</h2>
            </div>
            <Link href="/signup" className="wf-btn-primary px-4 py-2 text-sm">
              Unlock demo
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--border)] bg-white/80">
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(22,21,18,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(22,21,18,0.06) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              {[
                ["Support", "4%", "8%", "44%", "34%"],
                ["Sales", "52%", "8%", "44%", "34%"],
                ["Finance", "4%", "48%", "44%", "26%"],
                ["Dev", "52%", "48%", "44%", "26%"],
              ].map(([name, left, top, width, height]) => (
                <div
                  key={name}
                  className="absolute rounded-2xl border border-[var(--border)] bg-white/90 p-2 shadow-sm"
                  style={{ left, top, width, height }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{name}</div>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="mt-2 flex gap-1">
                    <div className="h-6 w-6 rounded-full bg-teal-100" />
                    <div className="h-6 w-6 rounded-full bg-amber-100" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              {[
                ["Inbox approvals", "Review irreversible actions before they happen"],
                ["Projects", "Kanban + artifacts + audit timeline"],
                ["Agents", "Visual roster with role-specific controls"],
                ["Hybrid routing", "Local-first cost control with cloud escalation"],
              ].map(([title, subtitle]) => (
                <div key={title} className="wf-soft rounded-2xl p-3">
                  <div className="font-medium">{title}</div>
                  <div className="mt-1 text-xs wf-muted">{subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="wf-panel rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.16em] wf-muted">2-minute pitch</div>
          <div className="mt-4 space-y-3">
            {PITCH_LINES.map((line, idx) => (
              <div key={line} className="flex gap-3">
                <div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-xs">
                  {idx + 1}
                </div>
                <p className="text-sm leading-6">{line}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="wf-panel rounded-3xl p-6">
          <div className="text-xs uppercase tracking-[0.16em] wf-muted">Why companies buy</div>
          <div className="mt-4 space-y-4">
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Dependable execution, not demos</div>
              <p className="mt-1 text-sm wf-muted">Projects, approvals, audit trails, and monitoring make AI fit operational workflows.</p>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">ROI visible fast</div>
              <p className="mt-1 text-sm wf-muted">Automate repetitive work first, keep humans in control, and expand as trust grows.</p>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="font-medium">Privacy and cost control</div>
              <p className="mt-1 text-sm wf-muted">Local-first routing keeps sensitive workflows close and cost predictable.</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/80 p-4">
            <div className="text-xs uppercase tracking-[0.16em] wf-muted">See it in action</div>
            <div className="mt-2 text-sm">
              Create an account to preview the AI workforce dashboard, inbox approvals, project workflows, and agent profiles.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/signup" className="wf-btn-primary px-4 py-2 text-sm">
                Create account
              </Link>
              <Link href="/login" className="wf-btn px-4 py-2 text-sm">
                Log in
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
