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

export async function addReaction(token: string, channel: string, timestamp: string, name: string) {
  return slackFetch(token, "/reactions.add", {
    method: "POST",
    body: JSON.stringify({ channel, timestamp, name }),
  });
}

export async function removeReaction(token: string, channel: string, timestamp: string, name: string) {
  return slackFetch(token, "/reactions.remove", {
    method: "POST",
    body: JSON.stringify({ channel, timestamp, name }),
  });
}

export async function uploadFile(token: string, channels: string, content: string, filename: string, title?: string) {
  return slackFetch(token, "/files.upload", {
    method: "POST",
    body: JSON.stringify({ channels, content, filename, title: title ?? filename }),
  });
}

export async function replyToThread(token: string, channel: string, threadTs: string, text: string) {
  return slackFetch(token, "/chat.postMessage", {
    method: "POST",
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });
}

export async function createChannel(token: string, name: string, isPrivate = false) {
  return slackFetch(token, "/conversations.create", {
    method: "POST",
    body: JSON.stringify({ name, is_private: isPrivate }),
  });
}

export async function inviteToChannel(token: string, channel: string, users: string) {
  return slackFetch(token, "/conversations.invite", {
    method: "POST",
    body: JSON.stringify({ channel, users }),
  });
}

export async function lookupUser(token: string, email: string) {
  return slackFetch(token, `/users.lookupByEmail?email=${encodeURIComponent(email)}`);
}

export async function listUsers(token: string, limit = 100) {
  return slackFetch(token, `/users.list?limit=${Math.min(limit, 200)}`);
}

export async function scheduleMessage(token: string, channel: string, text: string, postAt: number) {
  return slackFetch(token, "/chat.scheduleMessage", {
    method: "POST",
    body: JSON.stringify({ channel, text, post_at: postAt }),
  });
}

export async function setChannelTopic(token: string, channel: string, topic: string) {
  return slackFetch(token, "/conversations.setTopic", {
    method: "POST",
    body: JSON.stringify({ channel, topic }),
  });
}
