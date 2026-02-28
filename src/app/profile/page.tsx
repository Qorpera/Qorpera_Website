import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { getCompanySoul } from "@/lib/company-soul-store";
import { getInboxOpenApprovalCount } from "@/lib/inbox-store";
import { listBusinessFiles } from "@/lib/business-files-store";
import { listAdvisorSessions } from "@/lib/advisor-sessions-store";
import { isValidUsername, normalizeUsernameInput } from "@/lib/usernames";
import { kindLabel } from "@/lib/format";
import { getPlanStatus } from "@/lib/plan-store";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { RedeemLicenseKeyForm } from "@/components/redeem-license-key-form";
import { CancelPlanButton } from "@/components/cancel-plan-button";
import { DeleteAccountButton } from "@/components/delete-account-button";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{
    usernameError?: string;
    usernameSaved?: string;
    tab?: string;
    pwChanged?: string;
    pwError?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const resolvedSearchParams = (await searchParams) ?? {};

  async function updateUsernameAction(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/login");

    const username = normalizeUsernameInput(String(formData.get("username") ?? ""));
    if (!isValidUsername(username)) redirect("/profile?usernameError=invalid");

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: session.userId } },
      select: { id: true },
    });
    if (existing) redirect("/profile?usernameError=taken");

    await prisma.user.update({ where: { id: session.userId }, data: { username } });
    revalidatePath("/profile");
    revalidatePath("/");
    revalidatePath("/agents");
    redirect("/profile?usernameSaved=1");
  }

  async function changePasswordAction(formData: FormData) {
    "use server";
    const s = await getSession();
    if (!s) redirect("/login");

    const current  = String(formData.get("currentPassword") ?? "");
    const next     = String(formData.get("newPassword") ?? "");
    const confirm  = String(formData.get("confirmPassword") ?? "");

    if (next.length < 8)  redirect("/profile?pwError=short");
    if (next !== confirm) redirect("/profile?pwError=mismatch");

    const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { passwordHash: true } });
    if (!u) redirect("/login");

    const ok = await verifyPassword(current, u.passwordHash);
    if (!ok) redirect("/profile?pwError=wrong");

    const same = await verifyPassword(next, u.passwordHash);
    if (same) redirect("/profile?pwError=same");

    const hash = await hashPassword(next);
    await prisma.user.update({ where: { id: s.userId }, data: { passwordHash: hash } });
    redirect("/profile?pwChanged=1");
  }

  const [soul, reviewCount, businessFiles, sessions, hiredJobs, planStatus] = await Promise.all([
    getCompanySoul(session.userId),
    getInboxOpenApprovalCount(session.userId),
    listBusinessFiles(session.userId, 200),
    listAdvisorSessions(session.userId, 200),
    prisma.hiredJob.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } }),
    getPlanStatus(session.userId),
  ]);
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, username: true, createdAt: true, totpEnabled: true } });
  const email = user?.email ?? "Unknown account";
  const username = user?.username ?? "";
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  const activeTab = resolvedSearchParams.tab === "billing" || resolvedSearchParams.tab === "agents" || resolvedSearchParams.tab === "plans" ? resolvedSearchParams.tab : "overview";

  const soulFields = [
    soul.companyName, soul.oneLinePitch, soul.mission, soul.idealCustomers, soul.coreOffers,
    soul.strategicGoals, soul.departments, soul.approvalRules, soul.toolsAndSystems, soul.keyMetrics,
  ];
  const soulCompletion = Math.round((soulFields.filter((v) => v.trim().length > 0).length / soulFields.length) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-0">
      {/* Page header */}
      <header className="pb-0 border-b border-white/[0.07]">
        <div className="flex items-start justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
              {username ? (
                <span className="text-xs text-white/35">@{username}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/45">Account and workspace controls.</p>
          </div>
          <form action="/api/auth/logout" method="post" className="mt-0.5">
            <button className="wf-btn px-3 py-1.5 text-sm">Logout</button>
          </form>
        </div>

        {/* Underline tabs */}
        <nav className="flex">
          {([
            ["/profile", "Overview", "overview"],
            ["/profile?tab=plans", "Plans", "plans"],
            ["/profile?tab=billing", "Billing", "billing"],
            ["/profile?tab=agents", "Agents", "agents"],
          ] as const).map(([href, label, tab]) => (
            <Link
              key={tab}
              href={href}
              className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition ${
                activeTab === tab
                  ? "border-teal-400 text-white font-medium"
                  : "border-transparent text-white/40 hover:text-white/65"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Stats row */}
      <section className="flex border-b border-white/[0.07] py-5">
        {[
          ["Review queue", String(reviewCount)],
          ["Company soul", `${soulCompletion}%`],
          ["Business files", String(businessFiles.length)],
          ["Advisor sessions", String(sessions.length)],
        ].map(([label, value], i) => (
          <div
            key={label}
            className={`flex-1 ${i > 0 ? "border-l border-white/[0.07] pl-6" : ""} ${i < 3 ? "pr-6" : ""}`}
          >
            <div className="text-xs text-white/35 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>

      {/* Overview tab */}
      {activeTab === "overview" ? (
        <div className="space-y-0">
          {/* Account info */}
          <section className="py-6 border-b border-white/[0.07]">
            <div className="text-xs uppercase tracking-wider text-white/35 mb-4">Account</div>
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div>
                <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Email</div>
                <div className="text-sm font-medium break-all">{email}</div>
              </div>
              <div>
                <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Member since</div>
                <div className="text-sm font-medium">{memberSince ?? "—"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/35 uppercase tracking-wider mb-1">Username</div>
              <p className="text-xs text-white/40 mb-3">Agents use this handle to address you in responses.</p>
              <form action={updateUsernameAction} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center rounded-md border border-white/[0.1] bg-white/[0.03] px-3 focus-within:border-teal-500/40">
                    <span className="text-sm text-white/35">@</span>
                    <input
                      id="username"
                      name="username"
                      defaultValue={username}
                      required
                      minLength={3}
                      maxLength={24}
                      pattern="[a-z0-9_]{3,24}"
                      autoComplete="username"
                      placeholder="owner"
                      className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
                    />
                  </div>
                  <button type="submit" className="wf-btn shrink-0 px-4 py-2 text-sm">Save</button>
                </div>
                <p className="text-xs text-white/30">3–24 chars · lowercase letters, numbers, underscores.</p>
                {resolvedSearchParams.usernameSaved === "1" ? (
                  <p className="text-xs text-emerald-400">Saved — agents will address you as @{username}.</p>
                ) : null}
                {resolvedSearchParams.usernameError === "invalid" ? (
                  <p className="text-xs text-rose-400">Invalid username format.</p>
                ) : null}
                {resolvedSearchParams.usernameError === "taken" ? (
                  <p className="text-xs text-rose-400">That username is already taken.</p>
                ) : null}
              </form>
            </div>
          </section>

          {/* 2FA */}
          <TwoFactorSetup initialEnabled={user?.totpEnabled ?? false} />

          {/* Change password */}
          <section className="py-6">
            <div className="text-xs uppercase tracking-wider text-white/35 mb-4">Change password</div>
            {resolvedSearchParams.pwChanged === "1" ? (
              <div className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                Password updated successfully.
              </div>
            ) : null}
            {resolvedSearchParams.pwError ? (
              <div className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                {resolvedSearchParams.pwError === "wrong"    && "Current password is incorrect."}
                {resolvedSearchParams.pwError === "mismatch" && "New passwords do not match."}
                {resolvedSearchParams.pwError === "short"    && "New password must be at least 8 characters."}
                {resolvedSearchParams.pwError === "same"     && "New password must differ from your current password."}
              </div>
            ) : null}
            <form action={changePasswordAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              {[
                ["currentPassword", "Current password", "current-password"],
                ["newPassword", "New password", "new-password"],
                ["confirmPassword", "Confirm password", "new-password"],
              ].map(([name, label, autocomplete]) => (
                <div key={name} className="space-y-1.5">
                  <label htmlFor={name} className="block text-xs text-white/40">{label}</label>
                  <input
                    id={name}
                    name={name}
                    type="password"
                    required
                    minLength={name === "currentPassword" ? undefined : 8}
                    autoComplete={autocomplete}
                    className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-teal-500/40"
                  />
                </div>
              ))}
              <div className="flex items-end">
                <button type="submit" className="wf-btn w-full px-4 py-2.5 text-sm sm:w-auto">Update</button>
              </div>
            </form>
            <p className="mt-2 text-xs text-white/30">Minimum 8 characters.</p>
          </section>

          {/* Danger zone */}
          <section className="py-6 border-t border-rose-500/20">
            <div className="text-xs uppercase tracking-wider text-rose-400/70 mb-1">Danger zone</div>
            <p className="text-sm text-white/40 mb-4">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <DeleteAccountButton />
          </section>
        </div>
      ) : null}

      {/* Plans tab */}
      {activeTab === "plans" ? (
        <div className="space-y-6 pt-6">
          {/* Current plan */}
          {planStatus.plan ? (
            <div className="rounded-xl border border-teal-500/25 bg-teal-500/8 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-teal-400/60 mb-1">Active Plan</div>
                  <div className="text-lg font-semibold text-white/90">{planStatus.plan.name}</div>
                  <div className="mt-1 text-sm text-white/50">
                    {planStatus.hiredCount} of {planStatus.agentCap} agent slots used
                  </div>
                  {planStatus.subscription?.currentPeriodEnd && (
                    <div className="mt-1 text-xs text-white/35">
                      {planStatus.subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
                      {new Date(planStatus.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                  {!planStatus.subscription?.cancelAtPeriodEnd && <CancelPlanButton />}
                </div>
                <Link href="/agents" className="shrink-0 rounded-lg border border-teal-500/30 bg-teal-500/15 px-4 py-2 text-sm font-medium text-teal-300 transition hover:bg-teal-500/25">
                  Manage Agents
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 text-center">
              <div className="text-sm font-medium text-white/60 mb-1">No active plan</div>
              <p className="text-xs text-white/35 mb-4">Subscribe to unlock AI agents for your workspace.</p>
              <Link href="/pricing" className="inline-block rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-500">
                View Plans
              </Link>
            </div>
          )}

          {/* Plan comparison */}
          <div>
            <div className="text-xs uppercase tracking-wider text-white/35 mb-4">Available Plans</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLAN_CATALOG.map((plan) => {
                const isCurrent = planStatus.plan?.name === plan.name;
                return (
                  <div
                    key={plan.slug}
                    className={`rounded-xl border p-4 ${isCurrent ? "border-teal-500/40 bg-teal-500/8" : "border-white/8 bg-white/[0.02]"}`}
                  >
                    {isCurrent && (
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-teal-400">Current</div>
                    )}
                    <div className="text-sm font-semibold text-white/80">{plan.name}</div>
                    <div className="mt-0.5 text-lg font-bold text-white/90">{plan.priceDisplay}<span className="text-xs font-normal text-white/35">{plan.priceNote}</span></div>
                    <div className="mt-2 text-xs text-white/40">{plan.agentCap} agents</div>
                    {!isCurrent && (
                      <Link
                        href={plan.ctaMode === "checkout" ? "/pricing" : "/pricing"}
                        className="mt-3 block rounded-md border border-white/12 px-3 py-1.5 text-center text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white/75"
                      >
                        {plan.ctaText}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* License key redemption */}
          <RedeemLicenseKeyForm />
        </div>
      ) : null}

      {/* Billing tab */}
      {activeTab === "billing" ? (
        <div className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Billing</div>
              <p className="mt-0.5 text-sm text-white/45">Manage your plan and review financial artifacts.</p>
            </div>
            <Link href="/pricing" className="wf-btn-primary px-4 py-2 text-sm">View Plans</Link>
          </div>
          <div className="flex gap-3">
            <Link href="/business-logs" className="wf-btn px-4 py-2 text-sm">Business Logs</Link>
            <Link href="/profile?tab=plans" className="wf-btn px-4 py-2 text-sm">Plan &amp; subscription</Link>
          </div>
        </div>
      ) : null}

      {/* Agents tab */}
      {activeTab === "agents" ? (
        <div className="space-y-0 pt-6">
          <div className="flex items-center justify-between gap-2 pb-5 border-b border-white/[0.07]">
            <div>
              <div className="text-sm font-medium">Manage Agents</div>
              <p className="mt-0.5 text-sm text-white/45">Hire, inspect, and configure your workforce.</p>
            </div>
            <Link href="/pricing" className="wf-btn-primary px-4 py-2 text-sm">View Plans</Link>
          </div>

          <div className="flex gap-3 py-5 border-b border-white/[0.07]">
            <Link href="/agents" className="wf-btn px-4 py-2 text-sm">Agent Roster</Link>
          </div>

          <div className="pt-5">
            <div className="text-xs uppercase tracking-wider text-white/35 mb-3">Purchased agents</div>
            {hiredJobs.length === 0 ? (
              <p className="text-sm text-white/35">No purchased agents yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {hiredJobs.slice(0, 20).map((job) => (
                  <div key={job.id} className="py-3">
                    <div className="text-sm font-medium">{job.title}</div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {kindLabel(job.agentKind)} · {job.schedule} · {job.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
