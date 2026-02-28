import { NextRequest, NextResponse } from "next/server";
import { getSessionSecret } from "@/lib/session-codec";
import { saveConnection, getConnection } from "@/lib/integrations/token-store";
import { decryptSecret } from "@/lib/crypto-secrets";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

const VALID_PROVIDERS = ["hubspot", "slack", "google", "linear", "calendly", "quickbooks", "xero", "github", "notion", "jira"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is Provider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

type TokenResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string;
  metadata?: Record<string, string>;
};

async function exchangeCode(
  provider: Provider,
  code: string,
  redirectUri: string,
  extra?: { realmId?: string },
): Promise<TokenResult> {
  if (provider === "hubspot") {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HubSpot token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      hub_id?: number;
      hub_domain?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      metadata: {
        ...(data.hub_id != null ? { hub_id: String(data.hub_id) } : {}),
        ...(data.hub_domain ? { hub_domain: data.hub_domain } : {}),
      },
    };
  }

  if (provider === "slack") {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      access_token: string;
      team?: { id: string; name: string };
    };
    if (!data.ok) throw new Error(`Slack token exchange failed: ${data.error ?? "unknown"}`);
    return {
      accessToken: data.access_token,
      metadata: {
        ...(data.team?.name ? { workspace_name: data.team.name } : {}),
        ...(data.team?.id ? { workspace_id: data.team.id } : {}),
      },
    };
  }

  if (provider === "google") {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope,
    };
  }

  if (provider === "linear") {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.LINEAR_CLIENT_ID ?? "",
      client_secret: process.env.LINEAR_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Linear token exchange failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; scope?: string };

    // Fetch workspace name
    let workspaceName: string | undefined;
    try {
      const viewerRes = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: `query { viewer { organization { name } } }` }),
        signal: AbortSignal.timeout(5000),
      });
      const vData = (await viewerRes.json()) as {
        data?: { viewer?: { organization?: { name?: string } } };
      };
      workspaceName = vData.data?.viewer?.organization?.name;
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      scopes: data.scope,
      metadata: workspaceName ? { workspace_name: workspaceName } : {},
    };
  }

  if (provider === "calendly") {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.CALENDLY_CLIENT_ID ?? "",
      client_secret: process.env.CALENDLY_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch("https://auth.calendly.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Calendly token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      owner?: string; // user URI
    };

    // Fetch user info for display name
    let userName: string | undefined;
    let userUri = data.owner;
    try {
      const meRes = await fetch("https://api.calendly.com/users/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (meRes.ok) {
        const meData = (await meRes.json()) as { resource?: { uri?: string; name?: string } };
        userName = meData.resource?.name;
        if (meData.resource?.uri) userUri = meData.resource.uri;
      }
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope,
      metadata: {
        ...(userUri ? { user_uri: userUri } : {}),
        ...(userName ? { user_name: userName } : {}),
      },
    };
  }

  if (provider === "quickbooks") {
    const realmId = extra?.realmId ?? "";
    if (!realmId) throw new Error("QuickBooks realmId missing from callback");

    const credentials = Buffer.from(
      `${process.env.QUICKBOOKS_CLIENT_ID ?? ""}:${process.env.QUICKBOOKS_CLIENT_SECRET ?? ""}`,
    ).toString("base64");
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://oauth2.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`QuickBooks token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      x_refresh_token_expires_in?: number;
    };

    // Fetch company name for display
    let companyName: string | undefined;
    try {
      const { getCompanyInfo } = await import("@/lib/integrations/quickbooks");
      const info = await getCompanyInfo(data.access_token, realmId);
      const ci = (info as Record<string, unknown>).CompanyInfo as Record<string, unknown> | undefined;
      companyName = ci?.CompanyName ? String(ci.CompanyName) : undefined;
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      metadata: {
        realm_id: realmId,
        ...(companyName ? { company_name: companyName } : {}),
      },
    };
  }

  if (provider === "xero") {
    const credentials = Buffer.from(
      `${process.env.XERO_CLIENT_ID ?? ""}:${process.env.XERO_CLIENT_SECRET ?? ""}`,
    ).toString("base64");
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Xero token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    // Fetch tenant (organisation) info
    let tenantId: string | undefined;
    let tenantName: string | undefined;
    try {
      const { getConnections } = await import("@/lib/integrations/xero");
      const connections = await getConnections(data.access_token);
      const org = connections.find((c) => c.tenantType === "ORGANISATION") ?? connections[0];
      tenantId = org?.tenantId;
      tenantName = org?.tenantName;
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope,
      metadata: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(tenantName ? { tenant_name: tenantName } : {}),
      },
    };
  }

  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID ?? "",
      client_secret: process.env.GITHUB_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string; scope?: string; error?: string };
    if (data.error) throw new Error(`GitHub token exchange failed: ${data.error}`);

    // Fetch user info
    let login: string | undefined;
    try {
      const { getAuthenticatedUser } = await import("@/lib/integrations/github");
      const user = await getAuthenticatedUser(data.access_token);
      login = user.login;
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      scopes: data.scope,
      metadata: login ? { login } : {},
    };
  }

  if (provider === "notion") {
    const credentials = Buffer.from(
      `${process.env.NOTION_CLIENT_ID ?? ""}:${process.env.NOTION_CLIENT_SECRET ?? ""}`,
    ).toString("base64");
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Notion token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      workspace_id?: string;
      workspace_name?: string;
      bot_id?: string;
      owner?: { user?: { name?: string } };
    };

    return {
      accessToken: data.access_token,
      metadata: {
        ...(data.workspace_id ? { workspace_id: data.workspace_id } : {}),
        ...(data.workspace_name ? { workspace_name: data.workspace_name } : {}),
        ...(data.bot_id ? { bot_id: data.bot_id } : {}),
      },
    };
  }

  if (provider === "jira") {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.JIRA_CLIENT_ID ?? "",
      client_secret: process.env.JIRA_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Jira token exchange failed: ${res.status}`);
    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    // Fetch cloud ID (required for API calls)
    let cloudId: string | undefined;
    let siteName: string | undefined;
    try {
      const sitesRes = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
        headers: { Authorization: `Bearer ${data.access_token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (sitesRes.ok) {
        const sites = (await sitesRes.json()) as Array<{ id: string; name: string; url: string }>;
        if (sites[0]) {
          cloudId = sites[0].id;
          siteName = sites[0].name;
        }
      }
    } catch {
      // Non-critical
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: data.scope,
      metadata: {
        ...(cloudId ? { cloud_id: cloudId } : {}),
        ...(siteName ? { site_name: siteName } : {}),
      },
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://qorpera.com";
  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`${appUrl}/settings/connections?error=${encodeURIComponent(msg)}`);

  if (!isValidProvider(provider)) return errorRedirect("invalid_provider");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  // QuickBooks passes realmId (company ID) as a URL param in the callback
  const realmId = searchParams.get("realmId") ?? undefined;

  if (errorParam) return errorRedirect(errorParam);
  if (!code || !state) return errorRedirect("state_missing");

  // Verify HMAC state
  const lastDot = state.lastIndexOf(".");
  if (lastDot < 0) return errorRedirect("state_invalid");

  const payloadB64 = state.slice(0, lastDot);
  const receivedSig = state.slice(lastDot + 1);

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  let sigValid = false;
  try {
    sigValid = crypto.timingSafeEqual(
      Buffer.from(receivedSig),
      Buffer.from(expectedSig),
    );
  } catch {
    // Different lengths → invalid
  }
  if (!sigValid) return errorRedirect("state_invalid");

  // Decode payload: base64url(userId.timestamp)
  let userId: string;
  let timestamp: number;
  try {
    const decoded = Buffer.from(payloadB64, "base64url").toString("utf8");
    const dotIdx = decoded.indexOf(".");
    userId = decoded.slice(0, dotIdx);
    timestamp = parseInt(decoded.slice(dotIdx + 1), 10);
  } catch {
    return errorRedirect("state_invalid");
  }

  // Reject if state is older than 10 minutes
  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (ageSeconds > 600 || ageSeconds < 0) return errorRedirect("state_expired");

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return errorRedirect("user_not_found");

  const redirectUri = `${appUrl}/api/integrations/${provider}/callback`;

  // For Google: preserve existing refresh token if the new exchange doesn't return one
  let existingRefreshToken: string | undefined;
  if (provider === "google") {
    const existing = await getConnection(userId, provider);
    if (existing?.encryptedRefreshToken) {
      try {
        existingRefreshToken = decryptSecret(existing.encryptedRefreshToken);
      } catch {
        // ignore
      }
    }
  }

  try {
    const tokens = await exchangeCode(provider as Provider, code, redirectUri, { realmId });

    // Preserve Google refresh token when exchange doesn't include one
    if (provider === "google" && !tokens.refreshToken && existingRefreshToken) {
      tokens.refreshToken = existingRefreshToken;
    }

    await saveConnection(userId, provider, tokens);

    // Auto-register Calendly webhook subscription after connecting
    if (provider === "calendly" && tokens.metadata?.user_uri) {
      void (async () => {
        try {
          const signingKey = crypto.randomBytes(32).toString("hex");
          const { getUserOrganization, registerWebhookSubscription } = await import(
            "@/lib/integrations/calendly"
          );
          const userUri = tokens.metadata!.user_uri;
          const orgUri = await getUserOrganization(tokens.accessToken, userUri).catch(() => "");
          const { subscriptionUri } = await registerWebhookSubscription(
            tokens.accessToken,
            process.env.NEXT_PUBLIC_APP_URL ?? "https://qorpera.com",
            userUri,
            orgUri,
            signingKey,
          );
          const existing = await prisma.integrationConnection.findUnique({
            where: { userId_provider: { userId, provider: "calendly" } },
            select: { metadataJson: true },
          });
          const meta = existing?.metadataJson
            ? (JSON.parse(existing.metadataJson) as Record<string, string>)
            : {};
          await prisma.integrationConnection.update({
            where: { userId_provider: { userId, provider: "calendly" } },
            data: {
              metadataJson: JSON.stringify({
                ...meta,
                webhook_signing_key: signingKey,
                webhook_subscription_uri: subscriptionUri,
              }),
            },
          });
        } catch (e) {
          console.error("[calendly] webhook registration failed:", e);
        }
      })();
    }
  } catch {
    return errorRedirect("exchange_failed");
  }

  return NextResponse.redirect(`${appUrl}/settings/connections?connected=${provider}`);
}
