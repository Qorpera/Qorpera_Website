const SLACK_BASE = "https://slack.com/api";

async function slackFetch(
  token: string,
  path: string,
  options?: { method?: string; body?: string },
) {
  const res = await fetch(`${SLACK_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: options?.body,
    signal: AbortSignal.timeout(10000),
  });
  const data = (await res.json()) as { ok: boolean; error?: string } & Record<string, unknown>;
  if (!data.ok) throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  return data;
}

export async function listChannels(token: string) {
  return slackFetch(
    token,
    "/conversations.list?types=public_channel,private_channel&limit=100&exclude_archived=true",
  );
}

export async function postMessage(token: string, channel: string, text: string) {
  return slackFetch(token, "/chat.postMessage", {
    method: "POST",
    body: JSON.stringify({ channel, text }),
  });
}

export async function getUserInfo(token: string, userId: string) {
  return slackFetch(token, `/users.info?user=${encodeURIComponent(userId)}`);
}
