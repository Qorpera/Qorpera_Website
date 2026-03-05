"use client";

import { Section } from "@/components/marketing-page-shell";
import {
  FadeIn,
  StaggerGroup,
  StaggerItem,
} from "@/components/motion-primitives";

/* -- Data --------------------------------------------------------- */

const SITUATIONS = [
  {
    dept: "Finance",
    deptColor: "#3b82f6",
    name: "Overdue Invoice Follow-Up",
    trigger: "Invoice passes 30-day mark with no payment recorded",
    context: "Customer's support ticket history, deal size, payment history, account health score",
    action: "Draft follow-up email with context, escalate to account manager if high-value, flag in weekly review",
    governance: "Requires approval",
  },
  {
    dept: "Sales",
    deptColor: "#a855f7",
    name: "Stalled Deal Re-engagement",
    trigger: "Deal has no activity for 14+ days and is in negotiation stage",
    context: "Last touchpoint, competitor mentions, stakeholder map, proposal status",
    action: "Draft re-engagement email, suggest next-best-action based on deal context, notify sales rep",
    governance: "Requires approval",
  },
  {
    dept: "Support",
    deptColor: "#f43f5e",
    name: "Churn Risk Detection",
    trigger: "Customer opens 3+ support tickets in 30 days with negative sentiment",
    context: "Contract renewal date, lifetime value, escalation history, product usage trends",
    action: "Alert customer success, prepare retention offer, schedule executive check-in",
    governance: "Requires approval",
  },
  {
    dept: "Operations",
    deptColor: "#f59e0b",
    name: "Vendor Contract Expiry",
    trigger: "Contract renewal date is within 60 days",
    context: "Vendor performance history, spend data, alternative vendor options, internal satisfaction survey",
    action: "Notify procurement lead, prepare renewal brief, flag budget allocation",
    governance: "Autonomous (notification only)",
  },
  {
    dept: "HR",
    deptColor: "#06b6d4",
    name: "Onboarding Delay",
    trigger: "New hire start date is within 7 days and onboarding checklist is less than 50% complete",
    context: "Missing items, responsible parties, equipment order status, IT provisioning status",
    action: "Escalate to HR manager, send reminders to responsible parties, prepare contingency plan",
    governance: "Autonomous (escalation)",
  },
  {
    dept: "Sales",
    deptColor: "#10b981",
    name: "Lead Qualification",
    trigger: "New inbound lead matches ideal customer profile criteria",
    context: "Company size, industry, tech stack, recent funding, existing tool overlap",
    action: "Score and prioritize lead, enrich with public data, route to appropriate sales rep, draft intro email",
    governance: "Autonomous (routing + draft)",
  },
];

const COMPANY_SIZES = [
  {
    range: "10 — 50 people",
    title: "Growing teams",
    desc: "You're wearing multiple hats. Situations slip through because nobody has time to watch everything. Qorpera becomes your operations co-pilot.",
    examples: "Invoice follow-up, lead qualification, onboarding checklists",
    color: "#3b82f6",
  },
  {
    range: "50 — 500 people",
    title: "Scaling operations",
    desc: "Processes exist but they depend on tribal knowledge. Qorpera codifies your best practices into situation detection and governed responses.",
    examples: "Churn risk, deal management, vendor renewals, cross-team coordination",
    color: "#a855f7",
  },
  {
    range: "500+ people",
    title: "Enterprise complexity",
    desc: "Multiple teams, systems, and workflows. Qorpera provides cross-system operational intelligence that no single tool can deliver.",
    examples: "Multi-department situation detection, compliance workflows, executive reporting",
    color: "#f59e0b",
  },
];

/* -- Page content ------------------------------------------------- */

export function UseCasesClient() {
  return (
    <>
      {/* Situation Examples */}
      <Section label="Situations" title="What Qorpera detects — and what it does about it.">
        <StaggerGroup className="grid gap-6 sm:grid-cols-2" stagger={0.08}>
          {SITUATIONS.map((s) => (
            <StaggerItem key={s.name}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `${s.deptColor}15`, color: s.deptColor }}
                  >
                    {s.dept}
                  </span>
                  <span className="text-[11px] text-white/20">{s.governance}</span>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-white/85">{s.name}</h3>
                <div className="mt-4 space-y-3">
                  <DetailRow label="Trigger" value={s.trigger} />
                  <DetailRow label="Context" value={s.context} />
                  <DetailRow label="Action" value={s.action} />
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      {/* Who it's for */}
      <Section label="Who it's for" title="Operational intelligence at every stage.">
        <StaggerGroup className="grid gap-6 md:grid-cols-3" stagger={0.1}>
          {COMPANY_SIZES.map((size) => (
            <StaggerItem key={size.range}>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${size.color}15`, color: size.color }}
                >
                  {size.range}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold text-white/85">{size.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/35">{size.desc}</p>
                <p className="mt-3 text-[12px] text-white/25">
                  <span className="text-white/40">Examples:</span> {size.examples}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">
        {label}
      </span>
      <p className="mt-0.5 text-[13px] leading-relaxed text-white/40">{value}</p>
    </div>
  );
}
