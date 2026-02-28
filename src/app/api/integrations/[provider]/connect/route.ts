import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSessionSecret } from "@/lib/session-codec";
import crypto from "node:crypto";

export const runtime = "nodejs";

const VALID_PROVIDERS = ["hubspot", "slack", "google", "linear", "calendly", "quickbooks", "xero", "github", "notion", "jira"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(p: string): p is Provider {
  return (VALID_PROVIDERS as readonly string[]).includes(p);
}

function buildAuthUrl(provider: Provider, state: string, redirectUri: string): string {
  if (provider === "hubspot") {
    const params = new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope:
        "crm.objects.contacts.read crm.objects.contacts.write crm.objects.deals.read crm.objects.notes.write",
      state,
    });
    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  if (provider === "slack") {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "channels:read chat:write users:read",
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/spreadsheets",
      ].join(" "),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "linear") {
    const params = new URLSearchParams({
      client_id: process.env.LINEAR_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "read write",
      response_type: "code",
      state,
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }

  if (provider === "calendly") {
    const params = new URLSearchParams({
      client_id: process.env.CALENDLY_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "default",
      state,
    });
    return `https://calendly.com/oauth/authorize?${params.toString()}`;
  }

  if (provider === "quickbooks") {
    const params = new URLSearchParams({
      client_id: process.env.QUICKBOOKS_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      state,
    });
    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  if (provider === "xero") {
    const params = new URLSearchParams({
      client_id: process.env.XERO_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "accounting.transactions.read accounting.reports.read accounting.contacts.read offline_access",
      state,
    });
    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "repo read:user read:org",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === "notion") {
    const params = new URLSearchParams({
      client_id: process.env.NOTION_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      owner: "user",
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  if (provider === "jira") {
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: process.env.JIRA_CLIENT_ID ?? "",
      scope: "read:jira-work write:jira-work read:jira-user offline_access",
      redirect_uri: redirectUri,
      state,
      response_type: "code",
      prompt: "consent",
    });
    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const session = await getSession();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!session) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payloadStr = `${session.userId}.${timestamp}`;
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const state = `${payloadB64}.${sig}`;

  const redirectUri = `${appUrl}/api/integrations/${provider}/callback`;
  const authUrl = buildAuthUrl(provider as Provider, state, redirectUri);

  return NextResponse.redirect(authUrl);
}
