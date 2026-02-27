import { prisma } from "@/lib/db";
import { FLAG_CATALOG, getFlagLabel } from "@/lib/feature-flags-catalog";

/**
 * Returns the effective boolean value for a feature flag.
 * Per-user override takes precedence over the global setting.
 * Falls back to false if no record exists.
 */
export async function getFeatureFlag(key: string, userId?: string): Promise<boolean> {
  if (userId) {
    const perUser = await prisma.featureFlag.findFirst({
      where: { key, userId },
    });
    if (perUser !== null) return perUser.enabled;
  }

  const global = await prisma.featureFlag.findFirst({
    where: { key, userId: null },
  });
  return global?.enabled ?? false;
}

/**
 * Set (create or update) a feature flag.
 * Pass userId=undefined for global; userId=<id> for per-user override.
 */
export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  userId?: string,
): Promise<void> {
  const label = getFlagLabel(key);
  const resolvedUserId = userId ?? null;

  const existing = await prisma.featureFlag.findFirst({
    where: { key, userId: resolvedUserId },
  });

  if (existing) {
    await prisma.featureFlag.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await prisma.featureFlag.create({
      data: {
        key,
        label,
        enabled,
        userId: resolvedUserId,
      },
    });
  }
}

export type FeatureFlagRow = {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  userId: string | null;
  updatedAt: Date;
};

/**
 * List all feature flag records (global + per-user overrides).
 * Returns records from the catalog enriched with DB state.
 */
export async function listFeatureFlags(): Promise<{
  global: FeatureFlagRow[];
  overrides: FeatureFlagRow[];
}> {
  const allRows = await prisma.featureFlag.findMany({
    orderBy: [{ key: "asc" }, { updatedAt: "desc" }],
  });

  // Merge catalog keys that have no DB record yet (show as disabled)
  const globalRows: FeatureFlagRow[] = FLAG_CATALOG.map((entry) => {
    const dbRow = allRows.find((r) => r.key === entry.key && r.userId === null);
    return {
      id: dbRow?.id ?? "",
      key: entry.key,
      label: entry.label,
      enabled: dbRow?.enabled ?? false,
      userId: null,
      updatedAt: dbRow?.updatedAt ?? new Date(0),
    };
  });

  const overrideRows: FeatureFlagRow[] = allRows
    .filter((r) => r.userId !== null)
    .map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label || getFlagLabel(r.key),
      enabled: r.enabled,
      userId: r.userId,
      updatedAt: r.updatedAt,
    }));

  return { global: globalRows, overrides: overrideRows };
}

/**
 * Delete a per-user override by row id.
 */
export async function deleteFeatureFlagOverride(id: string): Promise<void> {
  await prisma.featureFlag.delete({ where: { id } });
}
