const GMAIL_BASE = "https://gmail.googleapis.com";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

async function googleFetch(token: string, url: string, options?: { method?: string; body?: string }) {
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
    throw new Error(`Google API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function listEmails(token: string, maxResults = 10) {
  const data = (await googleFetch(
    token,
    `${GMAIL_BASE}/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
  )) as { messages?: Array<{ id: string; threadId: string }> };

  if (!data.messages?.length) return { messages: [] };

  // Fetch metadata for first 5 messages
  const snippets = await Promise.allSettled(
    data.messages.slice(0, 5).map((m) =>
      googleFetch(
        token,
        `${GMAIL_BASE}/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  );

  return {
    messages: snippets
      .filter((r) => r.status === "fulfilled")
      .map((r) => {
        const msg = (r as PromiseFulfilledResult<Record<string, unknown>>).value;
        const headers = (
          (msg.payload as Record<string, unknown>)?.headers ?? []
        ) as Array<{ name: string; value: string }>;
        const getHeader = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: msg.snippet,
          from: getHeader("From"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
        };
      }),
  };
}

export async function sendEmail(token: string, to: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\r\n");
  const raw = Buffer.from(message).toString("base64url");
  return googleFetch(token, `${GMAIL_BASE}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}

export async function listCalendarEvents(token: string, daysAhead = 7) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  return googleFetch(
    token,
    `${CALENDAR_BASE}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`,
  );
}

export async function createCalendarEvent(
  token: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  description?: string,
  attendees?: string[],
) {
  return googleFetch(token, `${CALENDAR_BASE}/calendars/primary/events`, {
    method: "POST",
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startDateTime },
      end: { dateTime: endDateTime },
      ...(attendees?.length ? { attendees: attendees.map((email) => ({ email })) } : {}),
    }),
  });
}

export async function listDriveFiles(token: string, query?: string) {
  const q = query
    ? `fullText contains '${query.replace(/'/g, "\\'")}' and trashed=false`
    : "trashed=false";
  return googleFetch(
    token,
    `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=20`,
  );
}

export async function getDriveFile(
  token: string,
  fileId: string,
  mimeType?: string,
): Promise<{ content: string; contentType: string | null }> {
  const isGoogleDoc = mimeType?.startsWith("application/vnd.google-apps.");
  const url = isGoogleDoc
    ? `${DRIVE_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent("text/plain")}`
    : `${DRIVE_BASE}/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive API ${res.status}: ${body.slice(0, 200)}`);
  }
  const content = await res.text();
  return { content, contentType: res.headers.get("content-type") };
}
