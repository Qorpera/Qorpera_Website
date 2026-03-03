import type { Metadata } from "next";
import Link from "next/link";
import { QorperaLogo } from "@/components/operator-shell";

export const metadata: Metadata = {
  title: { absolute: "Qorpera — Map Your Company. Build Secure AI for Operations." },
  description:
    "Qorpera maps your business entities, builds governance layers, and deploys secure AI that reasons and acts within permission-aware, fully auditable boundaries.",
};

export default function HomePage() {
  return <Landing />;
}

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-purple-500/[0.07] blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/[0.04] blur-[100px]" />
      </div>

      {/* Hero */}
      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-medium leading-[1.1] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
          Map your company.
          <br />
          <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
            Build secure AI
          </span>
          <br />
          for your operations.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/45">
          Qorpera maps your business entities, defines governance rules, and deploys intelligence
          that reasons and acts within permission-aware, fully auditable boundaries.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/contact"
            className="rounded-xl bg-purple-500 px-8 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-purple-500/10 transition hover:bg-purple-400 hover:shadow-purple-500/15"
          >
            Request a Demo
          </Link>
        </div>
      </div>

      {/* Three Pillars */}
      <div className="relative mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <PillarCard
            number="01"
            title="Entity Mapping"
            description="Map every customer, invoice, employee, ticket, and vendor into a connected operational graph. Relationships are first-class data — see how everything connects."
            color="#3b82f6"
          />
          <PillarCard
            number="02"
            title="Governed Intelligence"
            description="AI proposes actions within strict policy bounds. Every read, recommendation, and action is scoped by rules you define. Consequential actions always require human approval."
            color="#a855f7"
          />
          <PillarCard
            number="03"
            title="Full Audit Trail"
            description="Every action is logged: what data was used, which entities were touched, what rule allowed it, and whether human approval was required. Complete compliance out of the box."
            color="#f59e0b"
          />
        </div>
      </div>

      {/* How It Works */}
      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-12 text-center text-2xl font-semibold text-white">How It Works</h2>
        <div className="space-y-0">
          {[
            { step: "1", title: "Connect Your Systems", desc: "Plug in HubSpot, Google, Linear, Slack — or import CSV. Data flows into a unified entity model." },
            { step: "2", title: "Map Your Operations", desc: "Entities, properties, and relationships are normalized into a queryable operational graph." },
            { step: "3", title: "Define Governance Rules", desc: "Set policies: what actions are allowed, what requires approval, what's blocked. Per entity type or globally." },
            { step: "4", title: "Deploy Intelligence", desc: "AI analyzes your graph, recommends actions, and executes workflows — always within your permission boundaries." },
            { step: "5", title: "Review & Approve", desc: "Consequential actions pause for human review. Approve or reject with full context. Every decision is audit-logged." },
          ].map((item, i) => (
            <div key={i} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-sm font-bold text-purple-400">
                  {item.step}
                </div>
                {i < 4 && <div className="w-px flex-1 bg-white/[0.06]" />}
              </div>
              <div className="pb-8">
                <h3 className="text-[15px] font-medium text-white/80">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-white/35">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="relative mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-purple-500/15 bg-gradient-to-b from-purple-500/[0.06] to-transparent p-12">
          <h2 className="text-2xl font-semibold text-white">Ready to map your operations?</h2>
          <p className="mt-3 text-white/40">
            Start with one process. See every entity, every action, every decision — governed and auditable.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-xl bg-purple-500 px-8 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-purple-500/10 transition hover:bg-purple-400 hover:shadow-purple-500/15"
          >
            Request a Demo
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <QorperaLogo className="h-5 w-auto" />
            <span className="text-[13px] text-white/30">Qorpera</span>
          </div>
          <span className="text-[12px] text-white/20">Secure AI for business operations</span>
        </div>
      </footer>
    </div>
  );
}

function PillarCard({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {number}
      </div>
      <h3 className="text-[16px] font-semibold text-white/85">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-white/35">{description}</p>
    </div>
  );
}
