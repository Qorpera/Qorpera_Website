const HUBSPOT_BASE = "https://api.hubapi.com";

async function hubspotFetch(
  token: string,
  path: string,
  options?: { method?: string; body?: string },
) {
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
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
    throw new Error(`HubSpot API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function searchContacts(token: string, query: string) {
  return hubspotFetch(token, "/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: query
        ? [
            {
              filters: [
                { propertyName: "email", operator: "CONTAINS_TOKEN", value: query },
              ],
            },
          ]
        : [],
      properties: ["firstname", "lastname", "email", "phone", "company", "hs_lead_status"],
      limit: 20,
    }),
  });
}

export async function createContact(token: string, properties: Record<string, string>) {
  return hubspotFetch(token, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  });
}

export async function updateContact(
  token: string,
  contactId: string,
  properties: Record<string, string>,
) {
  return hubspotFetch(token, `/crm/v3/objects/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

export async function listDeals(token: string) {
  return hubspotFetch(
    token,
    "/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate,hs_lastmodifieddate&limit=20",
  );
}

export async function createNote(token: string, noteBody: string, contactId?: string) {
  type Association = {
    to: { id: string };
    types: Array<{ associationCategory: string; associationTypeId: number }>;
  };
  const associations: Association[] = [];
  if (contactId) {
    associations.push({
      to: { id: contactId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
    });
  }

  return hubspotFetch(token, "/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString(),
      },
      ...(associations.length ? { associations } : {}),
    }),
  });
}
