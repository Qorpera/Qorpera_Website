import {
  upsertEntity,
  relateEntities,
  resolveEntity,
  recordEntityMention,
  type ExternalRefInput,
} from "@/lib/entity-store";

// ---------------------------------------------------------------------------
// Main entry — fire-and-forget, all errors swallowed
// ---------------------------------------------------------------------------

export async function extractEntitiesFromToolOutput(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  output: string,
  delegatedTaskId?: string,
): Promise<void> {
  try {
    const data = safeJsonParse(output);
    if (!data) return;

    if (toolName.startsWith("hubspot_")) {
      await extractHubspot(userId, toolName, data, delegatedTaskId);
    } else if (toolName.startsWith("google_")) {
      await extractGoogle(userId, toolName, data, delegatedTaskId);
    } else if (toolName.startsWith("slack_")) {
      await extractSlack(userId, toolName, data, delegatedTaskId);
    } else if (toolName.startsWith("linear_")) {
      await extractLinear(userId, toolName, data, delegatedTaskId);
    }
  } catch {
    // fire-and-forget — never throw
  }
}

export async function extractEntitiesFromText(
  userId: string,
  text: string,
  sourceType?: string,
  sourceId?: string,
): Promise<void> {
  try {
    const emails = text.match(EMAIL_RE) || [];
    for (const email of emails.slice(0, 10)) {
      const entityId = await resolveEntity(userId, { email: email.toLowerCase() });
      if (entityId && sourceType && sourceId) {
        await recordEntityMention(userId, entityId, sourceType, sourceId, text.slice(0, 240));
      }
    }
  } catch {
    // fire-and-forget
  }
}

// ---------------------------------------------------------------------------
// HubSpot extractors
// ---------------------------------------------------------------------------

async function extractHubspot(
  userId: string,
  toolName: string,
  data: unknown,
  delegatedTaskId?: string,
): Promise<void> {
  if (toolName.includes("contact")) {
    const contacts = extractArray(data, "results") ?? (isRecord(data) && data.id ? [data] : []);
    for (const c of contacts.slice(0, 20)) {
      if (!isRecord(c)) continue;
      const props = isRecord(c.properties) ? c.properties : c;
      const name = str(props.firstname || props.first_name, "") + " " + str(props.lastname || props.last_name, "");
      const displayName = name.trim() || str(props.name || props.email, "Unknown");
      if (!displayName || displayName === "Unknown") continue;

      const ref: ExternalRefInput | undefined = c.id
        ? { provider: "hubspot", externalId: `contact/${c.id}`, label: displayName }
        : undefined;

      const personId = await upsertEntity(userId, {
        type: "PERSON",
        displayName,
        email: str(props.email),
        phone: str(props.phone),
      }, ref);

      // Link to company if present
      const companyName = str(props.company);
      if (companyName && personId) {
        const companyId = await upsertEntity(userId, { type: "COMPANY", displayName: companyName });
        await relateEntities(userId, personId, companyId, "WORKS_AT");
      }

      if (delegatedTaskId && personId) {
        await recordEntityMention(userId, personId, "TOOL_CALL", `${toolName}/${delegatedTaskId}`, displayName);
      }
    }
  } else if (toolName.includes("deal")) {
    const deals = extractArray(data, "results") ?? (isRecord(data) && data.id ? [data] : []);
    for (const d of deals.slice(0, 20)) {
      if (!isRecord(d)) continue;
      const props = isRecord(d.properties) ? d.properties : d;
      const name = str(props.dealname || props.name, "");
      if (!name) continue;

      const ref: ExternalRefInput | undefined = d.id
        ? { provider: "hubspot", externalId: `deal/${d.id}`, label: name }
        : undefined;

      await upsertEntity(userId, { type: "DEAL", displayName: name }, ref);
    }
  } else if (toolName.includes("company")) {
    const companies = extractArray(data, "results") ?? (isRecord(data) && data.id ? [data] : []);
    for (const c of companies.slice(0, 20)) {
      if (!isRecord(c)) continue;
      const props = isRecord(c.properties) ? c.properties : c;
      const name = str(props.name || props.company, "");
      if (!name) continue;

      const ref: ExternalRefInput | undefined = c.id
        ? { provider: "hubspot", externalId: `company/${c.id}`, label: name }
        : undefined;

      await upsertEntity(userId, {
        type: "COMPANY",
        displayName: name,
        domain: str(props.domain),
      }, ref);
    }
  }
}

// ---------------------------------------------------------------------------
// Google extractors
// ---------------------------------------------------------------------------

async function extractGoogle(
  userId: string,
  toolName: string,
  data: unknown,
  delegatedTaskId?: string,
): Promise<void> {
  if (toolName.includes("email") || toolName.includes("mail")) {
    // Extract from email messages
    const messages = extractArray(data, "messages") ?? extractArray(data, "results") ?? (isRecord(data) ? [data] : []);
    for (const m of messages.slice(0, 20)) {
      if (!isRecord(m)) continue;
      const fromField = str(m.from || m.sender);
      const toField = str(m.to || m.recipient);

      for (const field of [fromField, toField]) {
        if (!field) continue;
        const parsed = parseEmailField(field);
        for (const p of parsed) {
          const ref: ExternalRefInput = { provider: "google", externalId: `email/${p.email}`, label: p.name || p.email };
          await upsertEntity(userId, { type: "PERSON", displayName: p.name || p.email, email: p.email }, ref);
        }
      }
    }
  } else if (toolName.includes("calendar")) {
    const events = extractArray(data, "items") ?? extractArray(data, "events") ?? (isRecord(data) ? [data] : []);
    for (const ev of events.slice(0, 20)) {
      if (!isRecord(ev)) continue;
      const attendees = extractArray(ev, "attendees") ?? [];
      for (const a of attendees) {
        if (!isRecord(a)) continue;
        const email = str(a.email);
        if (!email) continue;
        const name = str(a.displayName || a.name) || email;
        const ref: ExternalRefInput = { provider: "google", externalId: `calendar/${email}`, label: name };
        await upsertEntity(userId, { type: "PERSON", displayName: name, email }, ref);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Slack extractors
// ---------------------------------------------------------------------------

async function extractSlack(
  userId: string,
  toolName: string,
  data: unknown,
  _delegatedTaskId?: string,
): Promise<void> {
  if (toolName.includes("user")) {
    const users = extractArray(data, "members") ?? extractArray(data, "users") ?? (isRecord(data) && data.id ? [data] : []);
    for (const u of users.slice(0, 50)) {
      if (!isRecord(u)) continue;
      const slackId = str(u.id);
      if (!slackId) continue;

      const profile = isRecord(u.profile) ? u.profile : u;
      const name = str(profile.real_name || profile.display_name || u.name || u.real_name, "");
      if (!name) continue;

      const email = str(profile.email || u.email);
      const ref: ExternalRefInput = { provider: "slack", externalId: `user/${slackId}`, label: name };
      await upsertEntity(userId, { type: "PERSON", displayName: name, email: email || undefined }, ref);
    }
  }
}

// ---------------------------------------------------------------------------
// Linear extractors
// ---------------------------------------------------------------------------

async function extractLinear(
  userId: string,
  toolName: string,
  data: unknown,
  _delegatedTaskId?: string,
): Promise<void> {
  if (toolName.includes("issue")) {
    const issues = extractArray(data, "issues") ?? extractArray(data, "nodes") ?? (isRecord(data) && data.id ? [data] : []);
    for (const issue of issues.slice(0, 20)) {
      if (!isRecord(issue)) continue;

      // Extract assignee
      const assignee = isRecord(issue.assignee) ? issue.assignee : null;
      if (assignee) {
        const name = str(assignee.name || assignee.displayName, "");
        if (name) {
          const ref: ExternalRefInput = { provider: "linear", externalId: `user/${name}`, label: name };
          await upsertEntity(userId, { type: "PERSON", displayName: name, email: str(assignee.email) || undefined }, ref);
        }
      }
    }
  } else if (toolName.includes("project")) {
    const projects = extractArray(data, "projects") ?? extractArray(data, "nodes") ?? (isRecord(data) && data.id ? [data] : []);
    for (const p of projects.slice(0, 20)) {
      if (!isRecord(p)) continue;
      const name = str(p.name, "");
      if (!name) continue;

      const ref: ExternalRefInput | undefined = p.id
        ? { provider: "linear", externalId: `project/${p.id}`, label: name }
        : undefined;

      const projectId = await upsertEntity(userId, { type: "PROJECT", displayName: name }, ref);

      // Extract lead
      const lead = isRecord(p.lead) ? p.lead : null;
      if (lead) {
        const leadName = str(lead.name || lead.displayName, "");
        if (leadName) {
          const leadRef: ExternalRefInput = { provider: "linear", externalId: `user/${leadName}`, label: leadName };
          const leadId = await upsertEntity(userId, { type: "PERSON", displayName: leadName, email: str(lead.email) || undefined }, leadRef);
          await relateEntities(userId, leadId, projectId, "OWNS");
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_FIELD_RE = /(?:"?([^"<]*)"?\s*)?<([^>]+)>/g;

function parseEmailField(field: string): { name: string | null; email: string }[] {
  const results: { name: string | null; email: string }[] = [];
  let match;
  EMAIL_FIELD_RE.lastIndex = 0;
  while ((match = EMAIL_FIELD_RE.exec(field)) !== null) {
    results.push({ name: match[1]?.trim() || null, email: match[2].toLowerCase().trim() });
  }
  // Fallback: plain email
  if (results.length === 0) {
    const plain = field.match(EMAIL_RE);
    if (plain) {
      for (const e of plain) results.push({ name: null, email: e.toLowerCase().trim() });
    }
  }
  return results;
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractArray(data: unknown, key: string): unknown[] | null {
  if (isRecord(data) && Array.isArray(data[key])) return data[key] as unknown[];
  if (Array.isArray(data)) return data;
  return null;
}

function str(v: unknown, fallback?: string): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return fallback;
}
