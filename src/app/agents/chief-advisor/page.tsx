import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getChiefAdvisorSoulPackForUser } from "@/lib/agent-soul";
import { getAvailableModelCatalog, getModelRoutes } from "@/lib/model-routing-store";
import { ModelRouteSelector } from "@/components/model-route-selector";
import { getAgentAutomationConfig, getAvailableWorkerAgentTargetsForUser, listDelegatedTasks } from "@/lib/orchestration-store";
import { AgentAutomationConfigPanel } from "@/components/agent-automation-config-panel";
import { ChiefAdvisorDelegationPanel } from "@/components/chief-advisor-delegation-panel";
import { AgentsSectionNav } from "@/components/agents-section-nav";

export default async function ChiefAdvisorPage() {
  const session = await getSession();
  if (!session) return null;

  const [soulPack, routes, automationConfig, delegatedTasks, availableTargets] = await Promise.all([
    getChiefAdvisorSoulPackForUser(session.userId),
    getModelRoutes(session.userId),
    getAgentAutomationConfig(session.userId, "CHIEF_ADVISOR"),
    listDelegatedTasks(session.userId, 60),
    getAvailableWorkerAgentTargetsForUser(session.userId),
  ]);
  const modelCatalog = getAvailableModelCatalog();

  return (
    <div className="space-y-6">
      <header className="wf-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents">
              Back to Agents
            </Link>
            <div className="mt-3 text-xs uppercase tracking-[0.16em] wf-muted">Primary advisor agent</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Chief Advisor</h1>
            <p className="mt-1 text-sm wf-muted">
              Main advisor for the business. Uses Company Soul, Business Logs, files, and session memory to guide decisions.
            </p>
          </div>
          <div className="wf-soft rounded-2xl p-4 text-sm">
            <div className="font-medium">Model route</div>
            <div className="mt-2 min-w-[260px]">
              <ModelRouteSelector target="ADVISOR" initial={routes.ADVISOR} catalog={modelCatalog} />
            </div>
          </div>
        </div>
        <AgentsSectionNav />
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <AgentAutomationConfigPanel target="CHIEF_ADVISOR" initial={automationConfig} />
        <ChiefAdvisorDelegationPanel initialTasks={delegatedTasks} availableTargets={availableTargets} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="wf-panel rounded-3xl p-5">
          <h2 className="text-lg font-semibold tracking-tight">Chief Advisor soul</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs uppercase tracking-[0.14em] wf-muted">Identity</div>
              <ul className="mt-2 space-y-1">
                {(soulPack?.roleIdentity ?? []).map((line, index) => (
                  <li key={`${index}:${line}`}>• {line}</li>
                ))}
              </ul>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs uppercase tracking-[0.14em] wf-muted">Core truths</div>
              <ul className="mt-2 space-y-1">
                {(soulPack?.coreTruths ?? []).map((line, index) => (
                  <li key={`${index}:${line}`}>• {line}</li>
                ))}
              </ul>
            </div>
            <div className="wf-soft rounded-2xl p-4">
              <div className="text-xs uppercase tracking-[0.14em] wf-muted">Boundaries</div>
              <ul className="mt-2 space-y-1">
                {(soulPack?.boundaries ?? []).map((line, index) => (
                  <li key={`${index}:${line}`}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <section className="wf-panel rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Business memory anchors</h2>
              <Link href="/business-logs" className="wf-btn px-3 py-1 text-xs">Open Business Logs</Link>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {(soulPack?.companyAnchors ?? []).length ? (
                (soulPack?.companyAnchors ?? []).map((line, index) => (
                  <div key={`${index}:${line}`} className="wf-soft rounded-2xl p-3">{line}</div>
                ))
              ) : (
                <div className="wf-soft rounded-2xl p-3 wf-muted">
                  Company Soul is incomplete. Fill it out to make Chief Advisor much stronger.
                </div>
              )}
            </div>
          </section>

          <section className="wf-panel rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Operating memory (recent)</h2>
              <Link href="/company-soul" className="wf-btn px-3 py-1 text-xs">Edit Company Soul</Link>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {(soulPack?.operatingMemory ?? []).length ? (
                (soulPack?.operatingMemory ?? []).slice(0, 12).map((line, index) => (
                  <div key={`${index}:${line}`} className="wf-soft rounded-2xl p-3">{line}</div>
                ))
              ) : (
                <div className="wf-soft rounded-2xl p-3 wf-muted">
                  No memory items yet. Use the advisor, add business files, and post business logs to build memory.
                </div>
              )}
            </div>
          </section>
        </section>
      </div>

      <section className="wf-panel rounded-3xl p-5">
        <h2 className="text-lg font-semibold tracking-tight">Generated soul prompt (admin view)</h2>
        <pre className="mt-3 max-h-[28rem] overflow-auto rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4 text-xs whitespace-pre-wrap">
          {soulPack?.promptText ?? "Chief Advisor soul unavailable"}
        </pre>
      </section>
    </div>
  );
}
