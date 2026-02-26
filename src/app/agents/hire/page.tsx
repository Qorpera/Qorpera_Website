import Link from "next/link";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { ensureBaseAgents } from "@/lib/seed";
import { prisma } from "@/lib/db";
import { UI_AGENTS } from "@/lib/workforce-ui";
import { AGENT_HIRE_CATALOG } from "@/lib/agent-hiring";
import { isStripeCheckoutEnabledForKind } from "@/lib/stripe-checkout";
import { AgentCharacterFigure } from "@/components/agent-character-figure";
import { CancelAgentButton } from "@/components/cancel-agent-button";
import { AddToBasketSection } from "@/components/add-to-basket-section";
import { getOrderForUserByCheckoutSession, getOrderForUserById } from "@/lib/agent-purchase-orders";
import { kindLabel } from "@/lib/format";
import { detectCurrency, countryFromAcceptLanguage, convertRecurringPrices } from "@/lib/geo-pricing";

type SearchParams = Promise<{
  checkout?: string;
  session_id?: string;
  order_id?: string;
  agentKind?: string;
  message?: string;
}>;

function orderStatusTone(status: string) {
  if (status === "FULFILLED") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "CHECKOUT_FAILED" || status === "PAYMENT_FAILED") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "PAID" || status === "PAYMENT_PENDING" || status === "CHECKOUT_CREATED") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-[var(--border)] bg-zinc-100 text-zinc-700";
}

const scheduleOptions = [
  { value: "DAILY" as const, label: "Daily" },
  { value: "WEEKLY" as const, label: "Weekly" },
  { value: "MONTHLY" as const, label: "Monthly" },
];

export default async function AgentsHirePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) return null;

  await ensureBaseAgents();
  const query = await searchParams;

  // Detect user's country for approximate currency display
  const hdrs = await headers();
  const country =
    hdrs.get("x-vercel-ip-country") ??
    countryFromAcceptLanguage(hdrs.get("accept-language"));
  const currency = detectCurrency(country);

  // Pre-compute display prices for each catalog item
  const displayPrices = Object.fromEntries(
    AGENT_HIRE_CATALOG.map((item) => [
      item.kind,
      convertRecurringPrices(item.recurringCents, currency),
    ]),
  ) as Record<string, Record<(typeof scheduleOptions)[number]["value"], string>>;

  let banner: { tone: "ok" | "warn" | "error"; text: string } | null = null;

  if (query.checkout === "success") {
    const order =
      (query.order_id ? await getOrderForUserById(session.userId, query.order_id) : null) ||
      (query.session_id ? await getOrderForUserByCheckoutSession(session.userId, query.session_id) : null);
    if (!order) {
      banner = { tone: "warn", text: "Checkout completed, but order is still syncing. Refresh in a moment." };
    } else if (order.status === "FULFILLED") {
      banner = { tone: "ok", text: `${kindLabel(order.agentKind)} agent added to your workforce.` };
    } else if (order.status === "PAID" || order.status === "PAYMENT_PENDING" || order.status === "CHECKOUT_CREATED") {
      banner = { tone: "warn", text: `Payment processing (${order.status}). This will update after the Stripe webhook arrives.` };
    } else {
      banner = { tone: "error", text: `Order not completed — ${order.status}${order.failureReason ? `: ${order.failureReason}` : ""}` };
    }
  } else if (query.checkout === "demo") {
    banner = { tone: "ok", text: `${query.agentKind ? `${kindLabel(query.agentKind)} agent` : "Agent"} added to your workforce.` };
  } else if (query.checkout === "cancelled") {
    banner = { tone: "warn", text: "Checkout cancelled. No purchase was made." };
  } else if (query.checkout === "error") {
    banner = { tone: "error", text: query.message || "Checkout failed." };
  } else if (query.message) {
    banner = { tone: "ok", text: query.message };
  }

  const [dbAgents, allJobs, recentOrders, stripeSubs] = await Promise.all([
    prisma.agent.findMany({ orderBy: { kind: "asc" } }),
    prisma.hiredJob.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } }),
    prisma.agentPurchaseOrder.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.stripeSubscription.findMany({
      where: { userId: session.userId, status: "active" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeJobs = allJobs.filter((j) => j.enabled);
  const activeKinds = new Set(activeJobs.map((j) => j.agentKind));
  const catalogItems = AGENT_HIRE_CATALOG.filter((item) => !activeKinds.has(item.kind));

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <header className="pb-5 border-b border-white/[0.07]">
        <Link className="text-sm wf-muted hover:text-[var(--foreground)]" href="/agents">
          ← Go to Your Agents
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Hire Agents</h1>
        <p className="mt-1 text-sm text-white/55">
          {activeJobs.length > 0
            ? `${activeJobs.length} active ${activeJobs.length === 1 ? "agent" : "agents"} working for you.`
            : "Hire your first agent to get started."}
        </p>
      </header>

      {/* ── Banner ── */}
      {banner ? (
        <div
          className={`rounded-lg border px-4 py-3 ${
            banner.tone === "ok"
              ? "border-emerald-400/20 bg-emerald-500/10"
              : banner.tone === "warn"
                ? "border-amber-400/20 bg-amber-500/10"
                : "border-rose-400/20 bg-rose-500/10"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              banner.tone === "ok" ? "text-emerald-300" : banner.tone === "warn" ? "text-amber-300" : "text-rose-300"
            }`}
          >
            {banner.text}
          </span>
        </div>
      ) : null}

      {/* ── Your Team ── */}
      {activeJobs.length > 0 ? (
        <section>
          <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] wf-muted">Your team</div>
          <div className="space-y-3">
            {activeJobs.map((job) => {
              const ui = UI_AGENTS.find((a) => a.kind === job.agentKind);
              const dbAgent = dbAgents.find((a) => a.kind === job.agentKind);
              const catalogItem = AGENT_HIRE_CATALOG.find((c) => c.kind === job.agentKind);
              const jobTone = ui?.tone ?? "teal";
              const scheduleLabel = scheduleOptions.find((o) => o.value === job.schedule)?.label ?? job.schedule;
              const sub = stripeSubs.find(
                (s) => s.agentKind === job.agentKind && s.currentPeriodEnd != null && new Date(s.currentPeriodEnd) > new Date(),
              );
              const isCancelling = sub?.cancelAtPeriodEnd === true;
              const periodEnd = sub?.currentPeriodEnd
                ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : null;
              const agentName = dbAgent?.name ?? kindLabel(job.agentKind);

              return (
                <div key={job.id} className="rounded-2xl border border-white/[0.08] bg-[var(--card)] p-5">
                  {/* Main row */}
                  <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                    {/* Role icon */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold bg-${jobTone}-900/60 text-${jobTone}-200`}>
                      {job.agentKind.slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{agentName}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                            jobTone === "teal" ? "border-teal-700/50 text-teal-300" : "border-amber-700/50 text-amber-300"
                          }`}
                        >
                          {scheduleLabel}
                        </span>
                        {isCancelling ? (
                          <span className="rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-300">
                            Cancelling — active until {periodEnd}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-[var(--foreground)]/70">{ui?.role ?? kindLabel(job.agentKind)}</div>
                      <div className="mt-0.5 text-xs wf-muted">
                        {periodEnd && !isCancelling
                          ? `Next billing: ${periodEnd}`
                          : `Active since ${new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/agents/${job.agentKind}`} className="wf-btn px-3 py-2 text-sm">
                        Configure
                      </Link>
                      {isCancelling ? null : sub ? (
                        <CancelAgentButton
                          jobId={job.id}
                          agentName={agentName}
                          activeUntil={periodEnd ?? "end of period"}
                        />
                      ) : (
                        <form action="/api/agents/fire" method="post">
                          <input type="hidden" name="jobId" value={job.id} />
                          <button
                            type="submit"
                            className="rounded-2xl border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-950/40 hover:text-rose-200"
                          >
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Change employment agreement */}
                  {!isCancelling ? (
                    <details className="mt-4 border-t border-white/[0.06] pt-4">
                      <summary className="cursor-pointer select-none text-sm text-[var(--foreground)]/60 transition-colors hover:text-[var(--foreground)]/90">
                        Change employment agreement
                      </summary>
                      <form action="/api/agents/change-schedule" method="post" className="mt-4">
                        <input type="hidden" name="jobId" value={job.id} />
                        <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] wf-muted">New cadence</div>
                        <div className="grid grid-cols-3 gap-2">
                          {scheduleOptions.map((plan) => (
                            <label key={plan.value} className="cursor-pointer">
                              <input
                                type="radio"
                                name="schedule"
                                value={plan.value}
                                defaultChecked={job.schedule === plan.value}
                                className="peer sr-only"
                              />
                              <div className="rounded-xl border border-[var(--border)] p-2.5 text-center transition-colors peer-checked:border-teal-600 peer-checked:bg-teal-950/40 hover:bg-white/5">
                                <div className="text-sm font-semibold peer-checked:text-teal-200">{plan.label}</div>
                                <div className="mt-0.5 text-xs wf-muted">
                                  {displayPrices[job.agentKind]?.[plan.value] ?? catalogItem?.recurringPrices[plan.value] ?? "—"}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <button
                          type="submit"
                          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white/5 px-3 py-2 text-sm font-medium text-[var(--foreground)]/80 transition hover:bg-white/10 hover:text-[var(--foreground)]"
                        >
                          Update agreement
                        </button>
                      </form>
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Available Agents Catalog ── */}
      {catalogItems.length > 0 ? (
        <section>
          <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.14em] wf-muted">
            {activeJobs.length > 0 ? "Add another agent" : "Available agents"}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {catalogItems.map((item) => {
              const ui = UI_AGENTS.find((e) => e.kind === item.kind);
              const dbAgent = dbAgents.find((e) => e.kind === item.kind);
              const stripeEnabled = isStripeCheckoutEnabledForKind(item.kind);
              const tone = ui?.tone ?? "teal";
              const GLOW_COLORS: Record<string, string> = {
                teal: "rgba(20,184,166,0.26)", amber: "rgba(245,158,11,0.22)", rose: "rgba(244,63,94,0.24)",
                green: "rgba(34,197,94,0.22)", purple: "rgba(168,85,247,0.24)", cyan: "rgba(6,182,212,0.24)",
                slate: "rgba(100,116,139,0.26)", violet: "rgba(139,92,246,0.24)", blue: "rgba(99,131,209,0.28)",
              };
              const BG_FROM: Record<string, string> = {
                teal: "#0d2422", amber: "#20170c", rose: "#2a0d14", green: "#0a1f12",
                purple: "#1a0a2a", cyan: "#091e26", slate: "#111827", violet: "#170a2a", blue: "#111d32",
              };
              const portraitGradient = `from-[${BG_FROM[tone] ?? "#0d2422"}] to-[#091918]`;
              const portraitGlow = `bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,${GLOW_COLORS[tone] ?? GLOW_COLORS.teal},transparent_68%)]`;
              const kindColor = `text-${tone}-300/70`;

              return (
                <div key={item.kind} className="overflow-hidden rounded-[22px] border border-white/8 bg-[var(--card)] shadow-md">
                  {/* ── Portrait with character ── */}
                  <div className={`relative h-[250px] overflow-hidden bg-gradient-to-b ${portraitGradient}`}>
                    <div className={`absolute inset-0 ${portraitGlow}`} />
                    <div className={`absolute left-5 top-4 z-10 text-[9px] font-semibold uppercase tracking-[0.22em] ${kindColor}`}>
                      {kindLabel(item.kind)}
                    </div>
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                      <AgentCharacterFigure
                        variant={ui?.figureVariant ?? "assistant"}
                        tone={tone as import("@/components/agent-character-figure").AgentToneColor}
                        size="lg"
                        pose="wave"
                      />
                    </div>
                  </div>

                  {/* ── Card body ── */}
                  <div className="p-5">
                    <div className="text-xl font-semibold tracking-tight">{dbAgent?.name ?? item.title}</div>
                    <div className="mt-0.5 text-sm text-[var(--foreground)]/70">{ui?.role ?? item.subtitle}</div>
                    <p className="mt-2 text-sm wf-muted leading-relaxed">{item.summary}</p>

                    {ui?.capabilities?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ui.capabilities.slice(0, 3).map((cap) => (
                          <span
                            key={cap}
                            className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--foreground)]/75"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <AddToBasketSection
                      agentKind={item.kind}
                      recurringPrices={displayPrices[item.kind] ?? item.recurringPrices}
                      stripeEnabled={stripeEnabled}
                      showDemo={process.env.NODE_ENV !== "production"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : activeJobs.length > 0 ? (
        <div className="rounded-lg border border-white/[0.07] px-4 py-3">
          <p className="text-sm text-[var(--foreground)]/75">All available agent types are active in your workforce.</p>
        </div>
      ) : null}

      {/* ── Purchase History ── */}
      {recentOrders.length > 0 ? (
        <details className="rounded-lg border border-white/[0.07] px-4 py-4">
          <summary className="cursor-pointer select-none text-sm font-semibold tracking-tight">Purchase history</summary>
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
            <div className="grid grid-cols-12 bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] wf-muted">
              <div className="col-span-3">Date</div>
              <div className="col-span-2">Agent</div>
              <div className="col-span-2">Plan</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-3">Status</div>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-12 border-t border-[var(--border)] px-4 py-3">
                <div className="col-span-3 text-sm text-[var(--foreground)]/75">
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-2 text-sm text-[var(--foreground)]/75">{kindLabel(order.agentKind)}</div>
                <div className="col-span-2 text-sm capitalize text-[var(--foreground)]/75">
                  {order.schedule.toLowerCase()}
                </div>
                <div className="col-span-2 text-sm text-[var(--foreground)]/75">
                  ${(order.amountCents / 100).toFixed(2)}
                </div>
                <div className="col-span-3">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${orderStatusTone(order.status)}`}>
                    {order.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                  {order.failureReason ? (
                    <div className="mt-1 truncate text-xs text-rose-300" title={order.failureReason}>
                      {order.failureReason}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
