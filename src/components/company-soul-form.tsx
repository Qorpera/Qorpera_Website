"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CompanySoulProfile } from "@/lib/company-soul-store";

async function saveCompanySoul(payload: Partial<CompanySoulProfile>) {
  const res = await fetch("/api/company-soul", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; companySoul?: CompanySoulProfile };
  if (!res.ok || !data.companySoul) throw new Error(data.error || "Failed to save company soul");
  return data.companySoul;
}

function Field({
  label,
  description,
  value,
  onChange,
  multiline = true,
  placeholder,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="border-b border-white/[0.07] py-5 last:border-0">
      <label className="block">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-white/40">{description}</div>
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-3 h-28 w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-3 w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40"
          />
        )}
      </label>
    </div>
  );
}

export function CompanySoulForm({ initial }: { initial: CompanySoulProfile }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    const keys: Array<keyof CompanySoulProfile> = [
      "companyName", "oneLinePitch", "mission", "idealCustomers", "coreOffers",
      "strategicGoals", "departments", "approvalRules", "toolsAndSystems", "keyMetrics",
    ];
    const filled = keys.filter((k) => (form[k] ?? "").trim().length > 0).length;
    return Math.round((filled / keys.length) * 100);
  }, [form]);

  function patch<K extends keyof CompanySoulProfile>(key: K, value: CompanySoulProfile[K]) {
    setForm((curr) => ({ ...curr, [key]: value }));
    setStatus("idle");
  }

  async function onSave() {
    setStatus("saving");
    setError(null);
    try {
      const next = await saveCompanySoul(form);
      setForm(next);
      setStatus("saved");
    } catch (e: unknown) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  const statusText =
    status === "saving" ? "Saving…" :
    status === "saved"  ? "Saved" :
    status === "error"  ? (error ?? "Failed") :
    form.updatedAt      ? `Last saved ${new Date(form.updatedAt).toLocaleString()}` :
    "";

  return (
    <div>
      {/* Page header */}
      <header className="pb-5 border-b border-white/[0.07]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/35">Company Soul</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Teach the platform how your business works</h1>
            <p className="mt-1 text-sm text-white/45 max-w-2xl">
              This profile becomes the shared operating context for the advisor and future agent orchestration. Write it in plain language.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div>
              <div className="text-xs text-white/35">Progress</div>
              <div className="text-xl font-semibold tabular-nums">{progress}%</div>
              <div className="mt-1.5 w-20 h-1.5 rounded-full bg-white/10">
                <div className="h-1.5 rounded-full bg-teal-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-xs ${
                status === "saved" ? "text-emerald-400" :
                status === "error" ? "text-rose-400" :
                status === "saving" ? "text-white/40" :
                "text-white/25"
              }`}>
                {statusText}
              </span>
              <button
                type="button"
                onClick={onSave}
                disabled={status === "saving"}
                className="wf-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Form fields — centered */}
      <div className="mx-auto max-w-2xl py-6">
        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Company name"
            description="How should the advisor and agents refer to the company?"
            value={form.companyName}
            onChange={(v) => patch("companyName", v)}
            multiline={false}
            placeholder="Acme Logistics"
          />
          <Field
            label="One-line pitch"
            description="What do you do, for whom, and why it matters?"
            value={form.oneLinePitch}
            onChange={(v) => patch("oneLinePitch", v)}
            multiline={false}
            placeholder="We help DTC brands cut fulfillment delays with predictive ops workflows."
          />
        </div>

        <Field
          label="Mission"
          description="Longer purpose and strategic direction (2–8 sentences)."
          value={form.mission}
          onChange={(v) => patch("mission", v)}
          placeholder="Why this company exists and what it is building toward..."
        />

        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Ideal customers"
            description="One customer segment per line."
            value={form.idealCustomers}
            onChange={(v) => patch("idealCustomers", v)}
            placeholder={"Mid-market SaaS founders\nOps leaders in multi-location retail"}
          />
          <Field
            label="Core offers"
            description="Products/services and the outcome each creates (one per line)."
            value={form.coreOffers}
            onChange={(v) => patch("coreOffers", v)}
            placeholder={"Managed implementation - launches workflows in 30 days\nAnalytics retainer - weekly KPI and optimization"}
          />
        </div>

        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Revenue model"
            description="How the business makes money and pricing constraints."
            value={form.revenueModel}
            onChange={(v) => patch("revenueModel", v)}
            placeholder="Subscription + setup fee, annual contracts preferred..."
          />
          <Field
            label="Brand voice"
            description="How agents should sound when drafting external-facing content."
            value={form.brandVoice}
            onChange={(v) => patch("brandVoice", v)}
            placeholder="Confident, practical, no hype, no jargon..."
          />
        </div>

        <Field
          label="Strategic goals"
          description="Top goals for the next 1–2 quarters. One goal per line."
          value={form.strategicGoals}
          onChange={(v) => patch("strategicGoals", v)}
          placeholder={"Increase retention from 88% to 92%\nReduce onboarding cycle time from 21 days to 10 days"}
        />

        <Field
          label="Constraints / non-negotiables"
          description="Legal, regulatory, privacy, cash, staffing, timing, or quality constraints."
          value={form.constraints}
          onChange={(v) => patch("constraints", v)}
          placeholder={"No customer data sent to unapproved tools\nAll outbound legal messaging requires approval"}
        />

        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Departments / structure"
            description="Teams, ownership, and interfaces. One line per team."
            value={form.departments}
            onChange={(v) => patch("departments", v)}
            placeholder={"Support - owns inbound tickets and escalations\nSales Ops - owns CRM hygiene and lead routing"}
          />
          <Field
            label="Operating cadence"
            description="Rituals and review cycles (daily, weekly, monthly)."
            value={form.operatingCadence}
            onChange={(v) => patch("operatingCadence", v)}
            placeholder={"Daily support triage at 9am\nWeekly KPI review every Monday"}
          />
        </div>

        <Field
          label="Approval rules"
          description="What agents can do automatically vs what always needs human approval."
          value={form.approvalRules}
          onChange={(v) => patch("approvalRules", v)}
          placeholder={"Customer emails over $500 refund need manager approval\nContract redlines always reviewed by legal"}
        />

        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Tools and systems"
            description="Core apps and where truth lives (one per line)."
            value={form.toolsAndSystems}
            onChange={(v) => patch("toolsAndSystems", v)}
            placeholder={"HubSpot - CRM source of truth\nNotion - SOPs and project docs"}
          />
          <Field
            label="Key metrics"
            description="KPIs that define success. One metric per line."
            value={form.keyMetrics}
            onChange={(v) => patch("keyMetrics", v)}
            placeholder={"First response time\nNet revenue retention\nOnboarding completion time"}
          />
        </div>

        <div className="grid gap-0 md:grid-cols-2 md:gap-x-8">
          <Field
            label="Glossary / vocabulary"
            description="Terms, acronyms, internal names, and what they mean."
            value={form.glossary}
            onChange={(v) => patch("glossary", v)}
            placeholder={"ICP - ideal customer profile\nP1 - critical issue impacting production"}
          />
          <Field
            label="Notes for agents"
            description="Anything future agents should always keep in mind."
            value={form.notesForAgents}
            onChange={(v) => patch("notesForAgents", v)}
            placeholder="Prioritize retention and safety over speed. Escalate low-confidence decisions."
          />
        </div>
      </div>

      {/* How it's used + Next steps — bottom of page */}
      <div className="mx-auto max-w-2xl border-t border-white/[0.07] pt-8 pb-10 grid gap-8 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-4">How it&#39;s used</div>
          <div className="space-y-3">
            {[
              ["Advisor planning", "Prioritizes work against your goals, constraints, and approval rules."],
              ["Agent roster suggestions", "Recommends roles that fit your departments and operating cadence."],
              ["Safer onboarding", "Uses your approval policy to default autonomy and review gates correctly."],
            ].map(([title, desc]) => (
              <div key={title} className="border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
                <div className="text-sm font-medium">{title}</div>
                <div className="mt-0.5 text-xs text-white/40">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-white/35 mb-3">Next steps</div>
          <div className="space-y-1">
            <Link href="/" className="block rounded-md px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white/85">
              Ask the Advisor →
            </Link>
            <Link href="/projects/new" className="block rounded-md px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white/85">
              Start a new project →
            </Link>
            <Link href="/agents" className="block rounded-md px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white/85">
              Review agent roster →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
