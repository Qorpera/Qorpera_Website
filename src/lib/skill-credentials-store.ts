import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillCredentialStatus = {
  varName: string;
  isSet: boolean;
  keyLast4: string | null;
  /** true if the value comes from process.env (server-managed), not DB */
  isManaged: boolean;
};

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Encrypt and upsert a skill credential for a user. */
export async function setSkillCredential(
  userId: string,
  varName: string,
  value: string,
): Promise<void> {
  const encryptedKey = encryptSecret(value);
  const keyLast4 = value.length >= 4 ? value.slice(-4) : null;

  await prisma.skillCredential.upsert({
    where: { userId_varName: { userId, varName } },
    create: { userId, varName, encryptedKey, keyLast4 },
    update: { encryptedKey, keyLast4 },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "SKILL_CREDENTIAL",
      entityId: `${userId}:${varName}`,
      action: "SET",
      summary: `Skill credential saved (${varName}${keyLast4 ? `, key ••••${keyLast4}` : ""})`,
    },
  }).catch(() => {});
}

/** Delete a skill credential for a user. */
export async function deleteSkillCredential(
  userId: string,
  varName: string,
): Promise<void> {
  await prisma.skillCredential.deleteMany({
    where: { userId, varName },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "SKILL_CREDENTIAL",
      entityId: `${userId}:${varName}`,
      action: "DELETE",
      summary: `Skill credential removed (${varName})`,
    },
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Read — status only (never exposes plaintext values to the UI)
// ---------------------------------------------------------------------------

/**
 * Returns the set/unset status of all known skill env vars for a user.
 * Checks DB credentials first, then falls back to process.env (server-managed).
 * Never returns actual key values.
 */
export async function getSkillCredentialStatus(
  userId: string,
  varNames: string[],
): Promise<SkillCredentialStatus[]> {
  if (varNames.length === 0) return [];

  const rows = await prisma.skillCredential.findMany({
    where: { userId, varName: { in: varNames } },
    select: { varName: true, keyLast4: true },
  });

  const dbMap = new Map(rows.map((r) => [r.varName, r.keyLast4]));

  return varNames.map((varName) => {
    if (dbMap.has(varName)) {
      return { varName, isSet: true, keyLast4: dbMap.get(varName) ?? null, isManaged: false };
    }
    const envVal = process.env[varName];
    if (envVal) {
      return {
        varName,
        isSet: true,
        keyLast4: envVal.length >= 4 ? envVal.slice(-4) : null,
        isManaged: true,
      };
    }
    return { varName, isSet: false, keyLast4: null, isManaged: false };
  });
}

// ---------------------------------------------------------------------------
// Read — decrypted values for runtime use only (never returned to client)
// ---------------------------------------------------------------------------

/**
 * Returns a map of varName → plaintext value for all skill credentials a user
 * has stored. Falls back to process.env when no DB credential exists.
 * NEVER send this to the client — only use server-side.
 */
export async function getDecryptedSkillEnvVars(userId: string): Promise<Record<string, string>> {
  const rows = await prisma.skillCredential.findMany({
    where: { userId },
    select: { varName: true, encryptedKey: true },
  });

  const result: Record<string, string> = {};

  for (const row of rows) {
    try {
      result[row.varName] = decryptSecret(row.encryptedKey);
    } catch {
      // Corrupted credential — skip
    }
  }

  return result;
}

/**
 * Get the decrypted value for a single skill env var.
 * Returns null if not found in DB or process.env.
 * NEVER send this to the client.
 */
export async function getDecryptedSkillEnvVar(
  userId: string,
  varName: string,
): Promise<string | null> {
  const row = await prisma.skillCredential.findUnique({
    where: { userId_varName: { userId, varName } },
    select: { encryptedKey: true },
  });

  if (row) {
    try {
      return decryptSecret(row.encryptedKey);
    } catch {
      return null;
    }
  }

  return process.env[varName] ?? null;
}

// ---------------------------------------------------------------------------
// One-time migration from ~/.openclaw/skill-env.json → encrypted DB
// ---------------------------------------------------------------------------

function legacySkillEnvPath(): string {
  return path.join(os.homedir(), ".openclaw", "skill-env.json");
}

function migratedSkillEnvPath(): string {
  return path.join(os.homedir(), ".openclaw", "skill-env.migrated.json");
}

/**
 * Migrate plaintext skill env vars from the old ~/.openclaw/skill-env.json
 * file into the encrypted DB for the given user.
 *
 * - Only runs if the legacy file exists (not yet migrated)
 * - Skips any vars the user has already set in the DB
 * - Renames the file to skill-env.migrated.json when done (prevents re-run)
 * - Safe to call on every request — exits immediately if nothing to do
 */
export async function migrateSkillEnvFileToDb(userId: string): Promise<{ migrated: number }> {
  const legacyPath = legacySkillEnvPath();

  // Fast exit: nothing to migrate if legacy file is gone
  try {
    await fs.access(legacyPath);
  } catch {
    return { migrated: 0 };
  }

  let legacy: Record<string, string> = {};
  try {
    const raw = await fs.readFile(legacyPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      legacy = parsed as Record<string, string>;
    }
  } catch {
    // Unreadable/corrupt file — rename and bail
    await fs.rename(legacyPath, migratedSkillEnvPath()).catch(() => {});
    return { migrated: 0 };
  }

  const entries = Object.entries(legacy).filter(([, v]) => typeof v === "string" && v.length > 0);
  if (entries.length === 0) {
    await fs.rename(legacyPath, migratedSkillEnvPath()).catch(() => {});
    return { migrated: 0 };
  }

  // Find which vars this user already has in the DB (don't overwrite)
  const varNames = entries.map(([k]) => k);
  const existing = await prisma.skillCredential.findMany({
    where: { userId, varName: { in: varNames } },
    select: { varName: true },
  });
  const alreadySet = new Set(existing.map((r) => r.varName));

  let migrated = 0;
  for (const [varName, value] of entries) {
    if (alreadySet.has(varName)) continue;
    try {
      await setSkillCredential(userId, varName, value);
      migrated++;
    } catch {
      // Non-fatal — continue with remaining keys
    }
  }

  // Mark as done by renaming the file
  await fs.rename(legacyPath, migratedSkillEnvPath()).catch(() => {});

  if (migrated > 0) {
    await prisma.auditLog.create({
      data: {
        userId,
        scope: "SKILL_CREDENTIAL",
        entityId: userId,
        action: "MIGRATE",
        summary: `Migrated ${migrated} skill credential(s) from legacy skill-env.json`,
      },
    }).catch(() => {});
  }

  return { migrated };
}

/**
 * Build an env var map for runner job execution.
 * Merges DB credentials (decrypted) with process.env fallback.
 * Only includes vars from the provided list.
 * NEVER send this to the client — only attach to runner job payloads server-side.
 */
export async function buildSkillEnvForJob(
  userId: string,
  requiredVars: string[],
): Promise<Record<string, string>> {
  if (requiredVars.length === 0) return {};

  const decrypted = await getDecryptedSkillEnvVars(userId);
  const env: Record<string, string> = {};

  for (const varName of requiredVars) {
    const value = decrypted[varName] ?? process.env[varName];
    if (value) env[varName] = value;
  }

  return env;
}
