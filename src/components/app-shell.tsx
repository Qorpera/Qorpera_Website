import Link from "next/link";
import { getSession } from "@/lib/auth";
import { AppNav, AppNavVerticalGrouped, type NavGroup } from "@/components/app-nav";
import { getInboxOpenApprovalCount } from "@/lib/inbox-store";
import { getCompanySoul } from "@/lib/company-soul-store";
import { getAppPreferences } from "@/lib/settings-store";
import { AdvisorExecutionMode } from "@/components/advisor-execution-mode";
import { listAdvisorSessions } from "@/lib/advisor-sessions-store";
import { BasketSidebarButton } from "@/components/basket-sidebar-button";
import { getModelRoutes, getAvailableModelCatalog } from "@/lib/model-routing-store";
import { ModelRouteSelector } from "@/components/model-route-selector";
import { RunnerApprovalsSidebar } from "@/components/runner-approvals-panel";
import { prisma } from "@/lib/db";

const NAV_GROUPS = [
  {
    label: "Work",
    items: [
      { href: "/", label: "New Advisor Chat" },
      { href: "/inbox", label: "Review" },
      { href: "/projects", label: "Projects" },
      { href: "/metrics", label: "Metrics" },
      { href: "/agents", label: "Agents" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/business-logs", label: "Business Logs" },
      { href: "/company-soul", label: "Company Soul" },
      { href: "/office", label: "Office" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings/connectors", label: "Connectors" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const PRIMARY_NAV = NAV_GROUPS.flatMap((g) => g.items);

function applyNavBadges(groups: NavGroup[], badges: Map<string, { badge: string; badgeTone: "warn" | "info"; badgeStyle?: React.CSSProperties }>): NavGroup[] {
  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      const b = badges.get(item.href);
      return b ? { ...item, ...b } : item;
    }),
  }));
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let navItems = PRIMARY_NAV;
  let navGroups = NAV_GROUPS as NavGroup[];

  if (session) {
    const [approvalCount, companySoul] = await Promise.all([
      getInboxOpenApprovalCount(session.userId),
      getCompanySoul(session.userId),
    ]);
    const soulFields = [
      companySoul.companyName,
      companySoul.oneLinePitch,
      companySoul.mission,
      companySoul.idealCustomers,
      companySoul.coreOffers,
      companySoul.strategicGoals,
      companySoul.departments,
      companySoul.approvalRules,
      companySoul.toolsAndSystems,
      companySoul.keyMetrics,
    ];
    const soulCompletion = Math.round((soulFields.filter((v) => v.trim().length > 0).length / soulFields.length) * 100);

    const badges = new Map<string, { badge: string; badgeTone: "warn" | "info"; badgeStyle?: React.CSSProperties }>();
    if (approvalCount > 0) {
      badges.set("/inbox", { badge: String(approvalCount), badgeTone: "warn" });
    }
    if (soulCompletion < 100) {
      const hue = Math.round((Math.max(0, Math.min(99, soulCompletion)) / 99) * 30);
      const severe = soulCompletion < 70;
      badges.set("/company-soul", {
        badge: `! ${soulCompletion}%`,
        badgeTone: "warn",
        badgeStyle: {
          backgroundColor: severe ? "rgba(239,68,68,0.22)" : `hsla(${hue}, 90%, 50%, 0.22)`,
          borderColor: severe ? "rgba(248,113,113,0.75)" : `hsla(${hue}, 95%, 60%, 0.75)`,
          color: severe ? "rgb(254,202,202)" : `hsl(${hue}, 95%, 82%)`,
          boxShadow: severe ? "0 0 0 1px rgba(239,68,68,0.25), 0 0 16px rgba(239,68,68,0.2)" : undefined,
        },
      });
    }

    navGroups = applyNavBadges(NAV_GROUPS as NavGroup[], badges);
    navItems = navGroups.flatMap((g) => g.items);
  }

  if (session) {
    const [prefs, advisorHistory, routes, initialPendingJobs] = await Promise.all([
      getAppPreferences(session.userId),
      listAdvisorSessions(session.userId, 30),
      getModelRoutes(session.userId),
      prisma.runnerJob.findMany({
        where: { userId: session.userId, status: "NEEDS_APPROVAL" },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, title: true, jobType: true, riskLevel: true, createdAt: true },
      }).catch(() => []),
    ]);
    const modelCatalog = getAvailableModelCatalog();

    return (
      <div className="wf-shell h-screen overflow-hidden text-[var(--foreground)]">
        <section className="grid h-full w-full xl:grid-cols-[220px_1fr]">
          <aside className="flex h-full flex-col border-r border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.008)]">
            <div className="px-3 pt-3 pb-2">
              <Link href="/" className="mb-2 flex justify-start">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-14" aria-label="Zygenic">
                  <defs>
                    <clipPath id="zy-z-clip">
                      <circle cx="50" cy="50" r="42" />
                    </clipPath>
                    <clipPath id="zy-ring-back">
                      <rect x="0" y="49" width="100" height="51" />
                    </clipPath>
                    <clipPath id="zy-ring-front">
                      <rect x="0" y="0" width="100" height="51" />
                    </clipPath>
                  </defs>
                  {/* Orbital ring — back half (dim, behind Z) */}
                  <ellipse cx="50" cy="50" rx="47" ry="13" transform="rotate(-12 50 50)" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.28" clipPath="url(#zy-ring-back)" />
                  {/* Z body clipped to circle */}
                  <g clipPath="url(#zy-z-clip)" fill="rgba(255,255,255,0.93)">
                    <rect x="8" y="10" width="84" height="20" />
                    <polygon points="86,21 95,39 15,79 6,61" />
                    <rect x="8" y="70" width="84" height="20" />
                  </g>
                  {/* Orbital ring — front half (bright, over Z) */}
                  <ellipse cx="50" cy="50" rx="47" ry="13" transform="rotate(-12 50 50)" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.88" clipPath="url(#zy-ring-front)" />
                </svg>
              </Link>
              <AdvisorExecutionMode initial={prefs} compact />
            </div>

            <div className="border-y border-[rgba(255,255,255,0.04)] px-2 py-2">
              <AppNavVerticalGrouped groups={navGroups} />
            </div>

            <RunnerApprovalsSidebar
              initialJobs={initialPendingJobs.map((j) => ({
                id: j.id,
                title: j.title,
                jobType: j.jobType,
                riskLevel: j.riskLevel,
                createdAt: j.createdAt.toISOString(),
              }))}
            />

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="px-3 py-2">
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/30">History</div>
              </div>
              <div className="h-full max-h-[calc(100%-2.25rem)] space-y-px overflow-y-auto px-2 pb-2">
                {advisorHistory.length === 0 ? (
                  <div className="px-2 py-1.5 text-[13px] text-white/35">No sessions yet.</div>
                ) : (
                  advisorHistory.map((entry) => (
                    <div key={entry.id} className="group relative rounded-md transition hover:bg-white/[0.04]">
                      <Link href={`/?session=${entry.id}`} className="block px-2 py-1.5 pr-8">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="truncate text-[13px] text-white/80">
                            {entry.title}
                          </div>
                          <span className="shrink-0 text-[11px] text-white/28">{new Date(entry.createdAt).toLocaleDateString()}</span>
                        </div>
                      </Link>
                      <form action={`/api/advisor/sessions/${entry.id}/delete`} method="post" className="absolute right-1 top-1/2 -translate-y-1/2">
                        <button
                          type="submit"
                          className="rounded p-1 text-white/35 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
                          title="Delete chat"
                          formAction={`/api/advisor/sessions/${entry.id}/delete`}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M7.5 3.5h5m-7 2h9m-1 0-.7 9.1a1.5 1.5 0 0 1-1.49 1.39H8.69A1.5 1.5 0 0 1 7.2 14.6L6.5 5.5m2.25 2.5v5m3-5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="sr-only">Delete chat</span>
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-auto border-t border-[rgba(255,255,255,0.04)] px-3 py-2">
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  aria-label="Open profile"
                  title="Profile"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/8 hover:text-white/90"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm0 1.5c-3.13 0-5.75 1.68-6.8 4.17-.2.48.18.83.66.83h12.28c.48 0 .86-.35.66-.83C15.75 13.18 13.13 11.5 10 11.5Z" fill="currentColor"/>
                  </svg>
                </Link>
                <Link
                  href="/agents/hire"
                  className="group relative flex-1 overflow-hidden rounded-lg border border-emerald-300/30 bg-gradient-to-r from-emerald-400/85 via-teal-400/80 to-cyan-400/80 px-3 py-1.5 text-[13px] font-semibold tracking-tight text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.12)] transition hover:brightness-105"
                >
                  <span className="absolute inset-0 opacity-25 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.9)_50%,transparent_80%)]" />
                  <span className="relative">Hire Agents</span>
                </Link>
                <BasketSidebarButton />
              </div>
            </div>
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6">
            <div className="mb-1">
              <ModelRouteSelector
                target="ADVISOR"
                initial={routes.ADVISOR}
                catalog={modelCatalog}
                chatTrigger
                showRuntimeWarnings
              />
            </div>
            <div className="mx-auto max-w-5xl">
              {children}
            </div>
          </main>
        </section>
      </div>
    );
  }

  return (
    <div className="wf-shell min-h-screen text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/80 bg-[color:rgba(14,20,24,0.88)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-teal-500/40 bg-teal-500/10 text-base font-bold text-teal-400">
                  Z
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">Zygenic</div>
                  <div className="text-xs wf-muted">AI workforce control room</div>
                </div>
              </Link>

              {session ? <AppNav items={navItems} /> : null}
            </div>

            <div className="flex items-center gap-2 text-sm lg:shrink-0">
              {session ? (
                <form action="/api/auth/logout" method="post">
                  <button className="wf-btn px-3 py-1.5">Logout</button>
                </form>
              ) : (
                <>
                  <Link className="wf-btn px-3 py-1.5" href="/login">
                    Login
                  </Link>
                  <Link className="wf-btn-primary px-3 py-1.5" href="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
