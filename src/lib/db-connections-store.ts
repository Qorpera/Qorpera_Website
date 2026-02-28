import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

export type DbConnectionView = {
  id: string;
  name: string;
  allowedTables: string[] | null;
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  createdAt: string;
};

function toView(r: {
  id: string;
  name: string;
  allowedTablesJson: string | null;
  enabled: boolean;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  createdAt: Date;
}): DbConnectionView {
  let allowedTables: string[] | null = null;
  if (r.allowedTablesJson) {
    try { allowedTables = JSON.parse(r.allowedTablesJson) as string[]; } catch { /* ignore */ }
  }
  return {
    id: r.id,
    name: r.name,
    allowedTables,
    enabled: r.enabled,
    lastTestedAt: r.lastTestedAt?.toISOString() ?? null,
    lastTestStatus: r.lastTestStatus,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listDbConnections(userId: string): Promise<DbConnectionView[]> {
  const rows = await prisma.databaseConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toView);
}

export async function createDbConnection(
  userId: string,
  input: { name: string; connectionString: string; allowedTables?: string[] | null },
): Promise<DbConnectionView> {
  const encrypted = encryptSecret(input.connectionString);
  const row = await prisma.databaseConnection.create({
    data: {
      userId,
      name: input.name,
      encryptedConnectionString: encrypted,
      allowedTablesJson: input.allowedTables ? JSON.stringify(input.allowedTables) : null,
    },
  });
  return toView(row);
}

export async function updateDbConnection(
  userId: string,
  id: string,
  input: Partial<{ name: string; connectionString: string; allowedTables: string[] | null; enabled: boolean }>,
): Promise<DbConnectionView> {
  const existing = await prisma.databaseConnection.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Connection not found");
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.connectionString !== undefined) data.encryptedConnectionString = encryptSecret(input.connectionString);
  if ("allowedTables" in input) data.allowedTablesJson = input.allowedTables ? JSON.stringify(input.allowedTables) : null;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  const row = await prisma.databaseConnection.update({ where: { id }, data });
  return toView(row);
}

export async function deleteDbConnection(userId: string, id: string): Promise<void> {
  const existing = await prisma.databaseConnection.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Connection not found");
  await prisma.databaseConnection.delete({ where: { id } });
}

/** Returns the decrypted connection string for server-side use only. */
export async function getDecryptedConnectionString(userId: string, id: string): Promise<string> {
  const row = await prisma.databaseConnection.findFirst({ where: { id, userId, enabled: true } });
  if (!row) throw new Error("Connection not found or disabled");
  return decryptSecret(row.encryptedConnectionString);
}

/** Returns the allowed tables list (null = unrestricted SELECT on any table). */
export async function getAllowedTables(userId: string, id: string): Promise<string[] | null> {
  const row = await prisma.databaseConnection.findFirst({ where: { id, userId, enabled: true } });
  if (!row) throw new Error("Connection not found");
  if (!row.allowedTablesJson) return null;
  try { return JSON.parse(row.allowedTablesJson) as string[]; } catch { return null; }
}

/** Test a connection by opening it and running SELECT 1. */
export async function testDbConnection(userId: string, id: string): Promise<{ ok: boolean; message: string }> {
  let connStr: string;
  try {
    connStr = await getDecryptedConnectionString(userId, id);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
  }
  // Dynamically import pg to avoid bundling it everywhere
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    await prisma.databaseConnection.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestStatus: "ok" },
    });
    return { ok: true, message: "Connection successful" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    await prisma.databaseConnection.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestStatus: msg.slice(0, 200) },
    });
    return { ok: false, message: msg };
  }
}
