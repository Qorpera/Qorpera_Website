import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secrets";

export type IntegrationConnectionView = {
  id: string;
  provider: string;
  status: string;
  scopes: string | null;
  metadata: Record<string, string> | null;
  connectedAt: string;
};

export type SaveConnectionOptions = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
  metadata?: Record<string, string> | null;
};

export async function saveConnection(
  userId: string,
  provider: string,
  opts: SaveConnectionOptions,
): Promise<void> {
  const encryptedAccessToken = encryptSecret(opts.accessToken);
  const metadataJson = opts.metadata ? JSON.stringify(opts.metadata) : null;

  // Only encrypt and include refresh token when explicitly provided
  const refreshTokenUpdate =
    opts.refreshToken != null
      ? { encryptedRefreshToken: encryptSecret(opts.refreshToken) }
      : {};

  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      status: "CONNECTED",
      encryptedAccessToken,
      encryptedRefreshToken: opts.refreshToken ? encryptSecret(opts.refreshToken) : null,
      tokenExpiresAt: opts.expiresAt ?? null,
      scopes: opts.scopes ?? null,
      metadataJson,
    },
    update: {
      status: "CONNECTED",
      encryptedAccessToken,
      ...refreshTokenUpdate,
      tokenExpiresAt: opts.expiresAt ?? null,
      scopes: opts.scopes ?? null,
      metadataJson,
    },
  });
}

export async function getConnection(userId: string, provider: string) {
  return prisma.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
}

export async function listConnections(userId: string): Promise<IntegrationConnectionView[]> {
  const rows = await prisma.integrationConnection.findMany({
    where: { userId },
    orderBy: { connectedAt: "asc" },
  });

  return rows.map((row) => {
    let metadata: Record<string, string> | null = null;
    if (row.metadataJson) {
      try {
        metadata = JSON.parse(row.metadataJson) as Record<string, string>;
      } catch {
        // ignore corrupt metadata
      }
    }
    return {
      id: row.id,
      provider: row.provider,
      status: row.status,
      scopes: row.scopes,
      metadata,
      connectedAt: row.connectedAt.toISOString(),
    };
  });
}

export async function deleteConnection(userId: string, provider: string): Promise<void> {
  await prisma.integrationConnection.deleteMany({
    where: { userId, provider },
  });
}

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/**
 * Returns a decrypted access token for the given provider.
 * For Google, auto-refreshes if the token expires within 5 minutes.
 * Returns null if no connection exists.
 */
export async function getAccessToken(userId: string, provider: string): Promise<string | null> {
  const row = await getConnection(userId, provider);
  if (!row?.encryptedAccessToken) return null;

  // Google: auto-refresh when within 5 minutes of expiry
  if (provider === "google" && row.tokenExpiresAt) {
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (row.tokenExpiresAt <= fiveMinFromNow) {
      if (!row.encryptedRefreshToken) {
        // No refresh token available; return existing (may fail at API)
        try {
          return decryptSecret(row.encryptedAccessToken);
        } catch {
          return null;
        }
      }

      try {
        const refreshToken = decryptSecret(row.encryptedRefreshToken);
        const params = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        });
        const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = (await res.json()) as { access_token: string; expires_in?: number };
          const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : null;
          // Save new access token; don't pass refreshToken so existing one is preserved
          await saveConnection(userId, provider, {
            accessToken: data.access_token,
            expiresAt,
            scopes: row.scopes,
          });
          return data.access_token;
        }
      } catch {
        // Fall through to return existing token
      }
    }
  }

  try {
    return decryptSecret(row.encryptedAccessToken);
  } catch {
    return null;
  }
}
