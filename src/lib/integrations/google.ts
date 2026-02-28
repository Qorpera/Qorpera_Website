const GMAIL_BASE = "https://gmail.googleapis.com";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const DOCS_BASE = "https://docs.googleapis.com/v1";
const SHEETS_BASE = "https://sheets.googleapis.com/v4";

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

export async function readEmail(token: string, messageId: string) {
  const data = await googleFetch(
    token,
    `${GMAIL_BASE}/gmail/v1/users/me/messages/${messageId}?format=full`,
  );
  const payload = (data.payload ?? {}) as Record<string, unknown>;
  const headers = (payload.headers ?? []) as Array<{ name: string; value: string }>;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  function extractBody(part: Record<string, unknown>): string {
    const mimeType = String(part.mimeType ?? "");
    const bodyPart = (part.body ?? {}) as Record<string, unknown>;
    if (mimeType === "text/plain" && bodyPart.data) {
      return Buffer.from(String(bodyPart.data), "base64url").toString("utf-8");
    }
    if (mimeType.startsWith("multipart/")) {
      for (const sub of (part.parts ?? []) as Array<Record<string, unknown>>) {
        const text = extractBody(sub);
        if (text) return text;
      }
    }
    return "";
  }

  return {
    id: String(data.id),
    threadId: String(data.threadId),
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    messageId: getHeader("Message-ID"),
    body: extractBody(payload).slice(0, 8000),
  };
}

export async function sendEmail(
  token: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string,
) {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`] : []),
    ``,
    body,
  ];
  const raw = Buffer.from(lines.join("\r\n")).toString("base64url");
  return googleFetch(token, `${GMAIL_BASE}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
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

// ── Google Docs write ──────────────────────────────────────────────────────

export async function createGoogleDoc(token: string, title: string, content?: string) {
  // Create a blank document
  const doc = (await googleFetch(token, `${DOCS_BASE}/documents`, {
    method: "POST",
    body: JSON.stringify({ title }),
  })) as { documentId: string; title: string };

  // Insert content if provided
  if (content) {
    await googleFetch(token, `${DOCS_BASE}/documents/${doc.documentId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content.slice(0, 50000),
            },
          },
        ],
      }),
    });
  }

  return {
    documentId: doc.documentId,
    title: doc.title,
    url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
  };
}

export async function appendToGoogleDoc(token: string, documentId: string, content: string) {
  // Get current document end index
  const doc = (await googleFetch(token, `${DOCS_BASE}/documents/${documentId}`)) as {
    body: { content: Array<{ endIndex?: number }> };
    title: string;
  };

  const lastElement = doc.body.content[doc.body.content.length - 1];
  const endIndex = (lastElement?.endIndex ?? 2) - 1;

  await googleFetch(token, `${DOCS_BASE}/documents/${documentId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: endIndex },
            text: "\n" + content.slice(0, 50000),
          },
        },
      ],
    }),
  });

  return { documentId, title: doc.title, appended: true };
}

// ── Google Sheets write ────────────────────────────────────────────────────

export async function createGoogleSheet(token: string, title: string, headers?: string[]) {
  const spreadsheet = (await googleFetch(token, `${SHEETS_BASE}/spreadsheets`, {
    method: "POST",
    body: JSON.stringify({ properties: { title } }),
  })) as { spreadsheetId: string; spreadsheetUrl: string; sheets: Array<{ properties: { sheetId: number; title: string } }> };

  const sheetId = spreadsheet.sheets[0]?.properties.sheetId ?? 0;
  const sheetTitle = spreadsheet.sheets[0]?.properties.title ?? "Sheet1";

  // Add headers if provided
  if (headers && headers.length > 0) {
    await googleFetch(token, `${SHEETS_BASE}/spreadsheets/${spreadsheet.spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      body: JSON.stringify({ values: [headers] }),
    });
  }

  return {
    spreadsheetId: spreadsheet.spreadsheetId,
    title,
    sheetId,
    url: spreadsheet.spreadsheetUrl,
  };
}

export async function appendRowsToSheet(token: string, spreadsheetId: string, sheetName: string, rows: string[][]) {
  const range = `${sheetName}!A1`;
  await googleFetch(
    token,
    `${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: rows }),
    },
  );
  return { spreadsheetId, rowsAdded: rows.length };
}

export async function updateSheetCell(token: string, spreadsheetId: string, range: string, values: string[][]) {
  await googleFetch(
    token,
    `${SHEETS_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ range, values }),
    },
  );
  return { spreadsheetId, range, updated: true };
}
