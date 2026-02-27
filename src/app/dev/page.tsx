import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAllUsersWithStats, getManualLicenses, getDevStats } from "@/lib/admin-store";
import { listFeatureFlags } from "@/lib/feature-flags-store";
import { DevDashboard } from "@/components/dev-dashboard";

export const dynamic = "force-dynamic";

export default async function DevPage() {
  const session = await getSession();
  const ownerId = process.env.OWNER_USER_ID;

  if (!session || !ownerId || session.userId !== ownerId) {
    notFound();
  }

  const [users, manualLicenses, stats, flags] = await Promise.all([
    getAllUsersWithStats(),
    getManualLicenses(),
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
      stats={stats}
      flags={flags}
    />
  );
}
