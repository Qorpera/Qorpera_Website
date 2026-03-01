"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CompanySoulProfile } from "@/lib/company-soul-store";

const STEPS = [
  {
    title: "What's your company called?",
    subtitle: "This is the first thing your AI team learns about you.",
    fields: ["companyName", "oneLinePitch"] as const,
  },
  {
    title: "Who do you help?",
    subtitle: "The better your AI team understands your customers and what you offer, the better they can represent you.",
    fields: ["mission", "idealCustomers", "coreOffers"] as const,
  },
  {
    title: "How does your business work?",
    subtitle: "This helps your AI team make smarter decisions — like knowing what matters most and what to avoid.",
    fields: ["revenueModel", "strategicGoals", "constraints", "brandVoice"] as const,
  },
  {
    title: "How is your team set up?",
    subtitle: "Your AI team needs to know how your company runs day-to-day so they can fit right in.",
    fields: ["departments", "operatingCadence", "approvalRules", "toolsAndSystems"] as const,
  },
  {
    title: "What does success look like?",
    subtitle: "The more your AI team knows about your goals and how you talk about things, the better they perform.",
    fields: ["keyMetrics", "glossary", "notesForAgents"] as const,
  },
];

const FIELD_META: Record<string, { label: string; description: string; multiline: boolean; placeholder: string }> = {
  companyName: {
    label: "Company name",
    description: "What should your AI team call your company?",
    multiline: false,
    placeholder: "Acme Logistics",
  },
  oneLinePitch: {
    label: "What do you do?",
    description: "In one sentence — what does your company do, and for whom?",
    multiline: false,
    placeholder: "We help online brands ship orders faster with smarter logistics.",
  },
  mission: {
    label: "The bigger picture",
    description: "Tell your AI team why this company exists and where it's headed (a few sentences is great).",
    multiline: true,
    placeholder: "Why this company exists and what it is building toward...",
  },
  idealCustomers: {
    label: "Who are your customers?",
    description: "Describe the types of people or companies you serve — one per line.",
    multiline: true,
    placeholder: "Online store owners doing $1M–$10M in revenue\nOperations managers at retail chains",
  },
  coreOffers: {
    label: "What do you sell?",
    description: "Your products or services, and what each one does for the customer (one per line).",
    multiline: true,
    placeholder: "Setup package — gets new clients live in 30 days\nMonthly retainer — ongoing optimization and reporting",
  },
  revenueModel: {
    label: "How do you make money?",
    description: "Subscriptions, one-time fees, contracts — however your pricing works.",
    multiline: true,
    placeholder: "Monthly subscription + one-time setup fee, most clients on annual plans...",
  },
  strategicGoals: {
    label: "What are you working toward?",
    description: "Your top goals for the next few months — one per line.",
    multiline: true,
    placeholder: "Keep more customers (88% → 92% retention)\nGet new clients set up faster (21 days → 10 days)",
  },
  constraints: {
    label: "What should your AI team never do?",
    description: "Rules they must always follow — privacy, legal, timing, quality, anything important.",
    multiline: true,
    placeholder: "Never share customer data with outside tools\nAll legal messages need a human to approve them first",
  },
  brandVoice: {
    label: "How should they sound?",
    description: "When your AI team writes emails or content for customers, how should it come across?",
    multiline: true,
    placeholder: "Friendly and clear, no corporate speak, straight to the point...",
  },
  departments: {
    label: "Your teams",
    description: "How is your company organized? One team per line — what they own and who they work with.",
    multiline: true,
    placeholder: "Support — handles customer tickets and escalations\nSales — manages the CRM and follows up on leads",
  },
  operatingCadence: {
    label: "Your routine",
    description: "How does your week look? Daily standups, weekly reviews, monthly reports — whatever rhythm you follow.",
    multiline: true,
    placeholder: "Support triage every morning at 9am\nWeekly numbers review every Monday",
  },
  approvalRules: {
    label: "When should they check with you?",
    description: "What can your AI team handle on their own, and what should they always run by you first?",
    multiline: true,
    placeholder: "Refunds over $500 need my approval\nAnything legal needs a human to sign off",
  },
  toolsAndSystems: {
    label: "Tools you use",
    description: "The apps your business runs on — one per line.",
    multiline: true,
    placeholder: "HubSpot — where we track customers\nNotion — where we keep our processes and docs",
  },
  keyMetrics: {
    label: "How do you measure success?",
    description: "The numbers that matter most to your business — one per line.",
    multiline: true,
    placeholder: "How fast we reply to customers\nHow many customers stick around\nHow quickly new clients get set up",
  },
  glossary: {
    label: "Your lingo",
    description: "Any terms, abbreviations, or internal names your AI team should know.",
    multiline: true,
    placeholder: "ICP — our ideal customer profile\nP1 — a critical issue that needs fixing right away",
  },
  notesForAgents: {
    label: "Anything else they should know?",
    description: "Tips, pet peeves, things that are important to you — anything that helps your AI team do a better job.",
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
