import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllUsersWithStats, getManualLicenses, getDevStats } from "@/lib/admin-store";
import { listFeatureFlags } from "@/lib/feature-flags-store";
import { listPlanLicenseKeys } from "@/lib/plan-license-keys-store";
import { DevDashboard } from "@/components/dev-dashboard";

export const dynamic = "force-dynamic";

export default async function DevPage() {
  const session = await getSession();
  const ownerId = process.env.OWNER_USER_ID;

  if (!session || !ownerId || session.userId !== ownerId) {
    notFound();
  }

  const [users, manualLicenses, planLicenseKeys, stats, flags] = await Promise.all([
    getAllUsersWithStats(),
    getManualLicenses(),
    listPlanLicenseKeys(session.userId),
    getDevStats(),
    listFeatureFlags(),
  ]);

  return (
    <DevDashboard
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        lastSessionAt: u.lastSessionAt?.toISOString() ?? null,
        subscription: u.subscription
          ? {
              ...u.subscription,
              currentPeriodEnd: u.subscription.currentPeriodEnd?.toISOString() ?? null,
            }
          : null,
        hiredAgents: u.hiredAgents,
      }))}
      manualLicenses={manualLicenses.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
      planLicenseKeys={planLicenseKeys.map((k) => ({
        id: k.id,
        tier: k.tier,
        code: k.code,
        status: k.status,
        redeemedBy: k.redeemedBy,
        redeemedAt: k.redeemedAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
      stats={stats}
      flags={flags}
    />
  );
}
