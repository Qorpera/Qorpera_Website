"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CompanySoulProfile } from "@/lib/company-soul-store";

const STEPS = [
  {
    title: "What's your organisation's name?",
    subtitle: "Start with the basics so the platform knows your company.",
    fields: ["companyName", "oneLinePitch"] as const,
  },
  {
    title: "Purpose & customers",
    subtitle: "Who you serve and what you offer.",
    fields: ["mission", "idealCustomers", "coreOffers"] as const,
  },
  {
    title: "Strategy",
    subtitle: "How you make money and where you're headed.",
    fields: ["revenueModel", "strategicGoals", "constraints", "brandVoice"] as const,
  },
  {
    title: "Operations",
    subtitle: "How your team is structured and how work flows.",
    fields: ["departments", "operatingCadence", "approvalRules", "toolsAndSystems"] as const,
  },
  {
    title: "Metrics & notes",
    subtitle: "What success looks like and anything else agents should know.",
    fields: ["keyMetrics", "glossary", "notesForAgents"] as const,
  },
];

const FIELD_META: Record<string, { label: string; description: string; multiline: boolean; placeholder: string }> = {
  companyName: {
    label: "Organisation name",
    description: "How should the advisor and agents refer to your organisation?",
    multiline: false,
    placeholder: "Acme Logistics",
  },
  oneLinePitch: {
    label: "One-line pitch",
    description: "What do you do, for whom, and why it matters?",
    multiline: false,
    placeholder: "We help DTC brands cut fulfillment delays with predictive ops workflows.",
  },
  mission: {
    label: "Mission",
    description: "Longer purpose and strategic direction (2\u20138 sentences).",
    multiline: true,
    placeholder: "Why this company exists and what it is building toward...",
  },
  idealCustomers: {
    label: "Ideal customers",
    description: "One customer segment per line.",
    multiline: true,
    placeholder: "Mid-market SaaS founders\nOps leaders in multi-location retail",
  },
  coreOffers: {
    label: "Core offers",
    description: "Products/services and the outcome each creates (one per line).",
    multiline: true,
    placeholder: "Managed implementation - launches workflows in 30 days\nAnalytics retainer - weekly KPI and optimization",
  },
  revenueModel: {
    label: "Revenue model",
    description: "How the business makes money and pricing constraints.",
    multiline: true,
    placeholder: "Subscription + setup fee, annual contracts preferred...",
  },
  strategicGoals: {
    label: "Strategic goals",
    description: "Top goals for the next 1\u20132 quarters. One goal per line.",
    multiline: true,
    placeholder: "Increase retention from 88% to 92%\nReduce onboarding cycle time from 21 days to 10 days",
  },
  constraints: {
    label: "Constraints / non-negotiables",
    description: "Legal, regulatory, privacy, cash, staffing, timing, or quality constraints.",
    multiline: true,
    placeholder: "No customer data sent to unapproved tools\nAll outbound legal messaging requires approval",
  },
  brandVoice: {
    label: "Brand voice",
    description: "How agents should sound when drafting external-facing content.",
    multiline: true,
    placeholder: "Confident, practical, no hype, no jargon...",
  },
  departments: {
    label: "Departments / structure",
    description: "Teams, ownership, and interfaces. One line per team.",
    multiline: true,
    placeholder: "Support - owns inbound tickets and escalations\nSales Ops - owns CRM hygiene and lead routing",
  },
  operatingCadence: {
    label: "Operating cadence",
    description: "Rituals and review cycles (daily, weekly, monthly).",
    multiline: true,
    placeholder: "Daily support triage at 9am\nWeekly KPI review every Monday",
  },
  approvalRules: {
    label: "Approval rules",
    description: "What agents can do automatically vs what always needs human approval.",
    multiline: true,
    placeholder: "Customer emails over $500 refund need manager approval\nContract redlines always reviewed by legal",
  },
  toolsAndSystems: {
    label: "Tools and systems",
    description: "Core apps and where truth lives (one per line).",
    multiline: true,
    placeholder: "HubSpot - CRM source of truth\nNotion - SOPs and project docs",
  },
  keyMetrics: {
    label: "Key metrics",
    description: "KPIs that define success. One metric per line.",
    multiline: true,
    placeholder: "First response time\nNet revenue retention\nOnboarding completion time",
  },
  glossary: {
    label: "Glossary / vocabulary",
    description: "Terms, acronyms, internal names, and what they mean.",
    multiline: true,
    placeholder: "ICP - ideal customer profile\nP1 - critical issue impacting production",
  },
  notesForAgents: {
    label: "Notes for agents",
    description: "Anything future agents should always keep in mind.",
    multiline: true,
    placeholder: "Prioritize retention and safety over speed. Escalate low-confidence decisions.",
  },
};

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
    <div className="py-4">
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

export function OnboardingWizard({ initial }: { initial: CompanySoulProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const currentStep = Math.max(0, Math.min(STEPS.length - 1, stepParam ? parseInt(stepParam, 10) - 1 : 0));

  const [form, setForm] = useState<CompanySoulProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[currentStep];

  function patch(key: keyof CompanySoulProfile, value: string) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  async function saveAndNavigate(direction: "next" | "back" | "skip") {
    if (direction !== "back") {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/company-soul", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Failed to save");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Save failed");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (direction === "back" && currentStep > 0) {
      router.push(`/onboarding?step=${currentStep}`);
    } else if (currentStep < STEPS.length - 1) {
      router.push(`/onboarding?step=${currentStep + 2}`);
    } else {
      router.push("/onboarding/files");
    }
  }

  const filledCount = STEPS.flatMap((s) => s.fields).filter((f) => (form[f] ?? "").trim().length > 0).length;
  const totalFields = STEPS.flatMap((s) => s.fields).length;
  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{filledCount}/{totalFields} fields filled</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-teal-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step header */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-teal-400/80">Company Identity</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{step.title}</h1>
        <p className="mt-1 text-sm text-white/45">{step.subtitle}</p>
      </div>

      {/* Fields */}
      <div className="space-y-1">
        {step.fields.map((fieldKey) => {
          const meta = FIELD_META[fieldKey];
          return (
            <Field
              key={fieldKey}
              label={meta.label}
              description={meta.description}
              value={form[fieldKey] ?? ""}
              onChange={(v) => patch(fieldKey, v)}
              multiline={meta.multiline}
              placeholder={meta.placeholder}
            />
          );
        })}
      </div>

      {/* Error */}
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => saveAndNavigate("back")}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
            >
              Back
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => saveAndNavigate("skip")}
            className="text-sm text-white/35 transition hover:text-white/55"
          >
            Skip this step
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveAndNavigate("next")}
            className="wf-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : currentStep === STEPS.length - 1 ? "Continue to files" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
