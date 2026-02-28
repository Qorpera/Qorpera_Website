import Link from "next/link";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { AppNav, AppNavVerticalGrouped, type NavGroup } from "@/components/app-nav";
import { getInboxOpenApprovalCount } from "@/lib/inbox-store";
import { getCompanySoul } from "@/lib/company-soul-store";
import { getAppPreferences } from "@/lib/settings-store";
import { listAdvisorSessions } from "@/lib/advisor-sessions-store";
import { getModelRoutes, getAvailableModelCatalog } from "@/lib/model-routing-store";
import { getPlanStatus } from "@/lib/plan-store";
import { ModelRouteSelector } from "@/components/model-route-selector";
import { RunnerApprovalsSidebar } from "@/components/runner-approvals-panel";
import { PlatformTour } from "@/components/platform-tour";
import { ResendVerificationBanner } from "@/components/resend-verification-banner";
import { prisma } from "@/lib/db";
import { listBusinessFiles } from "@/lib/business-files-store";
import { checkExpectedFiles, getExpectedFileSummary } from "@/lib/expected-business-files";
import { isOwner } from "@/lib/admin-auth";

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Work",
    items: [
      { href: "/", label: "Consulting Chat", actionLabel: "New Chat", actionHref: "/" },
      { href: "/inbox", label: "Review", dataTour: "nav-inbox" },
      { href: "/projects", label: "Projects" },
      { href: "/metrics", label: "Metrics" },
      { href: "/schedules", label: "Schedules" },
      { href: "/agents", label: "Agents", dataTour: "nav-agents" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { href: "/business-logs", label: "Business Logs" },
      { href: "/company-soul", label: "Company Identity" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings/connectors", label: "Connectors" },
      { href: "/settings/integrations", label: "Integrations" },
      { href: "/settings/automations", label: "Automations" },
      { href: "/settings", label: "Settings", dataTour: "nav-settings" },
    ],
  },
];

// Dev nav item — injected at runtime for the owner only
const DEV_NAV_ITEM = { href: "/dev", label: "Dev" };

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
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isAdvisorChat = pathname === "/";
  const session = await getSession();
  let navItems = PRIMARY_NAV;
  let navGroups = NAV_GROUPS as NavGroup[];

  if (session) {
    const [approvalCount, companySoul, businessFiles] = await Promise.all([
      getInboxOpenApprovalCount(session.userId),
      getCompanySoul(session.userId),
      listBusinessFiles(session.userId, 200),
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

    const fileStatuses = checkExpectedFiles(
      businessFiles.map((f) => ({ id: f.id, name: f.name, category: f.category })),
    );
    const { criticalMissing } = getExpectedFileSummary(fileStatuses);
    if (criticalMissing > 0) {
      badges.set("/business-logs", {
        badge: String(criticalMissing),
        badgeTone: "warn",
      });
    }

    navGroups = applyNavBadges(NAV_GROUPS as NavGroup[], badges);
    navItems = navGroups.flatMap((g) => g.items);
  }

  if (session) {
    const ownerFlag = await isOwner(session.userId);
if (ownerFlag) {
      // Append "Dev" to the System group for the owner
      navGroups = navGroups.map((g) =>
        g.label === "System"
          ? { ...g, items: [...g.items, DEV_NAV_ITEM] }
          : g,
      );
      navItems = navGroups.flatMap((g) => g.items);
    }
  }

  if (session) {
    const [prefs, advisorHistory, routes, initialPendingJobs, tourUser, planStatus] = await Promise.all([
      getAppPreferences(session.userId),
      listAdvisorSessions(session.userId, 30),
      getModelRoutes(session.userId),
      prisma.runnerJob.findMany({
        where: { userId: session.userId, status: "NEEDS_APPROVAL" },
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { id: true, title: true, jobType: true, riskLevel: true, createdAt: true },
      }).catch(() => []),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { onboardedAt: true, tourCompletedAt: true, email: true, username: true, emailVerified: true },
      }),
      getPlanStatus(session.userId),
    ]);
    const modelCatalog = getAvailableModelCatalog();
    const showTour = Boolean(tourUser?.onboardedAt && !tourUser?.tourCompletedAt);

    return (
      <div className="wf-shell h-screen overflow-hidden text-[var(--foreground)]">
        <section className="grid h-full w-full xl:grid-cols-[220px_1fr]">
          <aside data-tour="sidebar-nav" className="flex h-full flex-col border-r border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.008)]">
            <div className="px-3 pt-3 pb-2">
              <Link href="/" className="mb-2 flex justify-start">
                <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="w-14" aria-label="Qorpera">
                  <defs>
                    <linearGradient id="qp-streak" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="qp-streak2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Sphere */}
                  <circle cx="42" cy="50" r="28" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.85" />
                  {/* Crescent shadow */}
                  <path d="M 52 26 A 28 28 0 0 1 52 74 A 22 28 0 0 0 52 26 Z" fill="white" fillOpacity="0.08" />
                  {/* Lower streak (bold) */}
                  <polygon points="62,46 155,38 155,42 62,52" fill="url(#qp-streak)" />
                  {/* Upper streak (thin) */}
                  <polygon points="58,40 150,28 150,30 58,43" fill="url(#qp-streak2)" />
                </svg>
              </Link>
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

            <div className="mt-auto border-t border-[rgba(255,255,255,0.04)]">
              <Link
                href="/profile"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/55">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 10a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 10Zm0 1.5c-3.13 0-5.75 1.68-6.8 4.17-.2.48.18.83.66.83h12.28c.48 0 .86-.35.66-.83C15.75 13.18 13.13 11.5 10 11.5Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-white/70">
                    {tourUser?.username ? `@${tourUser.username}` : (tourUser?.email ?? "Profile")}
                  </div>
                  {planStatus.plan ? (
                    <div className="text-[11px] text-teal-400/60">
                      {planStatus.plan.name} · {planStatus.hiredCount}/{planStatus.agentCap} agents
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/28">No plan</div>
                  )}
                </div>
              </Link>
            </div>
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6">
            <div className="mb-1 flex items-center justify-between gap-4">
              {isAdvisorChat && (
                <ModelRouteSelector
                  target="ADVISOR"
                  initial={routes.ADVISOR}
                  catalog={modelCatalog}
                  chatTrigger
                  showRuntimeWarnings
                />
              )}
              {!tourUser?.onboardedAt ? (
                <Link
                  href="/onboarding"
                  className="ml-auto shrink-0 rounded-xl bg-purple-600 px-5 py-2 text-sm font-bold tracking-wide text-white hover:bg-purple-500"
                  style={{
                    animation: "onboard-glow 2.4s ease-in-out infinite, onboard-nudge 6s ease-in-out infinite",
                  }}
                >
                  ONBOARD
                </Link>
              ) : null}
            </div>
            {tourUser && !tourUser.emailVerified && <ResendVerificationBanner />}
            <div className="mx-auto max-w-5xl">
              {children}
            </div>
          </main>
        </section>
        {showTour ? <PlatformTour /> : null}
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
                <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto" aria-label="Qorpera">
                  <defs>
                    <linearGradient id="qp-hdr-streak" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="qp-hdr-streak2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="white" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="42" cy="50" r="28" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.85" />
                  <path d="M 52 26 A 28 28 0 0 1 52 74 A 22 28 0 0 0 52 26 Z" fill="white" fillOpacity="0.08" />
                  <polygon points="62,46 155,38 155,42 62,52" fill="url(#qp-hdr-streak)" />
                  <polygon points="58,40 150,28 150,30 58,43" fill="url(#qp-hdr-streak2)" />
                </svg>
                <div>
                  <div className="text-base font-semibold tracking-tight">Qorpera</div>
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
                  <Link className="wf-btn px-3 py-1.5" href="/pricing">
                    View Plans
                  </Link>
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
