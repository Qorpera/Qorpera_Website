/**
 * Output auto-routing: when a delegated task completes, fire configured routes
 * to deliver the digest to Slack channels, email addresses, or webhooks.
 */
import { prisma } from "@/lib/db";

export type OutputRouteView = {
  id: string;
  name: string;
  agentTarget: string;
  routeType: string;
  routeTarget: string;
  onCompleted: boolean;
  onFailed: boolean;
  enabled: boolean;
  createdAt: string;
};

function toView(r: {
  id: string; name: string; agentTarget: string; routeType: string;
  routeTarget: string; onCompleted: boolean; onFailed: boolean;
  enabled: boolean; createdAt: Date;
}): OutputRouteView {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

export async function listOutputRoutes(userId: string): Promise<OutputRouteView[]> {
  const rows = await prisma.outputRoute.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map(toView);
}

export async function createOutputRoute(
  userId: string,
  input: { name?: string; agentTarget?: string; routeType: string; routeTarget: string; onCompleted?: boolean; onFailed?: boolean },
): Promise<OutputRouteView> {
  const row = await prisma.outputRoute.create({
    data: {
      userId,
      name: input.name ?? "",
      agentTarget: input.agentTarget ?? "*",
      routeType: input.routeType,
      routeTarget: input.routeTarget,
      onCompleted: input.onCompleted ?? true,
      onFailed: input.onFailed ?? false,
    },
  });
  return toView(row);
}

export async function updateOutputRoute(
  userId: string,
  id: string,
  input: Partial<{ name: string; agentTarget: string; routeType: string; routeTarget: string; onCompleted: boolean; onFailed: boolean; enabled: boolean }>,
): Promise<OutputRouteView> {
  const existing = await prisma.outputRoute.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Route not found");
  const row = await prisma.outputRoute.update({ where: { id }, data: input });
  return toView(row);
}

export async function deleteOutputRoute(userId: string, id: string): Promise<void> {
  const existing = await prisma.outputRoute.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Route not found");
  await prisma.outputRoute.delete({ where: { id } });
}

// ── Fire routes after task completion ────────────────────────────────────────

async function postToSlack(channelOrUrl: string, text: string, token?: string): Promise<void> {
  // Support both Slack channel IDs (post via API) and webhook URLs (POST directly)
  if (channelOrUrl.startsWith("https://")) {
    await fetch(channelOrUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return;
  }
  if (!token) return;
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: channelOrUrl, text }),
  });
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
}

export async function fireOutputRoutes(opts: {
  userId: string;
  agentTarget: string;
  event: "completed" | "failed";
  digest: string;
  taskTitle: string;
  taskId: string;
}): Promise<void> {
  const routes = await prisma.outputRoute.findMany({
    where: { userId: opts.userId, enabled: true },
  });

  const matching = routes.filter((r) => {
    const targetMatch = r.agentTarget === "*" || r.agentTarget === opts.agentTarget;
    const eventMatch = (opts.event === "completed" && r.onCompleted) || (opts.event === "failed" && r.onFailed);
    return targetMatch && eventMatch;
  });

  if (matching.length === 0) return;

  const agentLabel = opts.agentTarget.replaceAll("_", " ");
  const status = opts.event === "completed" ? "✅ Completed" : "❌ Failed";
  const message = `${status} — ${agentLabel}\n*${opts.taskTitle}*\n\n${opts.digest.slice(0, 1200)}`;

  // Get Slack token once (shared across all slack routes)
  let slackToken: string | undefined;
  if (matching.some((r) => r.routeType === "slack" && !r.routeTarget.startsWith("https://"))) {
    const conn = await prisma.integrationConnection.findUnique({
      where: { userId_provider: { userId: opts.userId, provider: "slack" } },
      select: { encryptedAccessToken: true },
    });
    if (conn?.encryptedAccessToken) {
      try {
        const { decryptSecret } = await import("@/lib/crypto-secrets");
        slackToken = decryptSecret(conn.encryptedAccessToken);
      } catch { /* decryption failed */ }
    }
  }

  await Promise.allSettled(
    matching.map(async (route) => {
      if (route.routeType === "slack") {
        await postToSlack(route.routeTarget, message, slackToken);
      } else if (route.routeType === "email") {
        const subject = `[Qorpera] ${status}: ${opts.taskTitle}`;
        await sendEmail(route.routeTarget, subject, message.replace(/\*/g, ""));
      } else if (route.routeType === "webhook") {
        await fetch(route.routeTarget, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: opts.event,
            agentTarget: opts.agentTarget,
            taskTitle: opts.taskTitle,
            taskId: opts.taskId,
            digest: opts.digest,
          }),
        });
      }
    }),
  );
}
