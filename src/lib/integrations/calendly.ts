const CALENDLY_BASE = "https://api.calendly.com";

async function calendlyFetch(
  token: string,
  url: string,
  options?: { method?: string; body?: string },
) {
  const res = await fetch(url, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options?.body,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Calendly API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getCurrentUser(token: string) {
  return calendlyFetch(token, `${CALENDLY_BASE}/users/me`);
}

export async function listEventTypes(token: string, userUri: string) {
  const params = new URLSearchParams({
    user: userUri,
    active: "true",
    count: "20",
  });
  return calendlyFetch(token, `${CALENDLY_BASE}/event_types?${params.toString()}`);
}

export async function listScheduledEvents(
  token: string,
  userUri: string,
  status: "active" | "canceled" = "active",
  daysAhead = 30,
) {
  const minStartTime = new Date().toISOString();
  const maxStartTime = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    user: userUri,
    status,
    count: "20",
    sort: "start_time:asc",
    min_start_time: minStartTime,
    max_start_time: maxStartTime,
  });
  return calendlyFetch(token, `${CALENDLY_BASE}/scheduled_events?${params.toString()}`);
}

export async function getEventInvitees(token: string, eventUuid: string) {
  return calendlyFetch(
    token,
    `${CALENDLY_BASE}/scheduled_events/${eventUuid}/invitees?count=20`,
  );
}

export async function createSchedulingLink(
  token: string,
  eventTypeUri: string,
  maxEventCount = 1,
) {
  return calendlyFetch(token, `${CALENDLY_BASE}/scheduling_links`, {
    method: "POST",
    body: JSON.stringify({
      max_event_count: maxEventCount,
      owner: eventTypeUri,
      owner_type: "EventType",
    }),
  });
}
