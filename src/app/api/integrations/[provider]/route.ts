import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteConnection, getConnection } from "@/lib/integrations/token-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await params;
  const validProviders = ["hubspot", "slack", "google", "linear", "calendly"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  // Clean up Calendly webhook subscription before deleting connection
  if (provider === "calendly") {
    const conn = await getConnection(session.userId, "calendly");
    if (conn?.metadataJson && conn.encryptedAccessToken) {
      try {
        const meta = JSON.parse(conn.metadataJson) as Record<string, string>;
        if (meta.webhook_subscription_uri) {
          const { decryptSecret } = await import("@/lib/crypto-secrets");
          const { deleteWebhookSubscription } = await import(
            "@/lib/integrations/calendly"
          );
          void deleteWebhookSubscription(
            decryptSecret(conn.encryptedAccessToken),
            meta.webhook_subscription_uri,
          ).catch(() => {});
        }
      } catch {
        // Non-fatal
      }
    }
  }

  await deleteConnection(session.userId, provider);
  return NextResponse.json({ ok: true });
}
