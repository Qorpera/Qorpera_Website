import { prisma } from "@/lib/db";
import { EntityType, EntityRelationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityHints = {
  type?: EntityType;
  displayName?: string;
  email?: string;
  phone?: string;
  domain?: string;
  provider?: string;
  externalId?: string;
};

export type EntityInput = {
  type: EntityType;
  displayName: string;
  email?: string;
  phone?: string;
  domain?: string;
  metadataJson?: string;
};

export type ExternalRefInput = {
  provider: string;
  externalId: string;
  label?: string;
  metadataJson?: string;
};

export type EntityContext = {
  id: string;
  type: EntityType;
  displayName: string;
  email: string | null;
  phone: string | null;
  domain: string | null;
  metadata: Record<string, unknown> | null;
  externalRefs: { provider: string; externalId: string; label: string | null }[];
  relationships: { direction: "from" | "to"; relationType: EntityRelationType; entityName: string; entityId: string }[];
  recentMentions: { sourceType: string; sourceId: string; snippet: string | null; createdAt: Date }[];
};

export type EntitySearchResult = {
  id: string;
  type: EntityType;
  displayName: string;
  email: string | null;
  domain: string | null;
  refCount: number;
};

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Resolve an existing entity by hints. Returns entity ID or null. */
export async function resolveEntity(
  userId: string,
  hints: EntityHints,
): Promise<string | null> {
  // 1. External ref lookup
  if (hints.provider && hints.externalId) {
    const ref = await prisma.entityExternalRef.findFirst({
      where: { provider: hints.provider, externalId: hints.externalId },
      include: { entity: { select: { id: true, userId: true, mergedIntoId: true } } },
    });
    if (ref && ref.entity.userId === userId && !ref.entity.mergedIntoId) {
      return ref.entity.id;
    }
  }

  // 2. Email match
  if (hints.email) {
    const entity = await prisma.entity.findFirst({
      where: { userId, email: hints.email.toLowerCase().trim(), mergedIntoId: null },
      select: { id: true },
    });
    if (entity) return entity.id;
  }

  // 3. Domain match (Company only)
  if (hints.domain && (!hints.type || hints.type === "COMPANY")) {
    const entity = await prisma.entity.findFirst({
      where: { userId, domain: hints.domain.toLowerCase().trim(), type: "COMPANY", mergedIntoId: null },
      select: { id: true },
    });
    if (entity) return entity.id;
  }

  // 4. Display name (exact case-insensitive, single match only)
  if (hints.displayName) {
    const matches = await prisma.entity.findMany({
      where: {
        userId,
        displayName: { equals: hints.displayName, mode: "insensitive" },
        mergedIntoId: null,
        ...(hints.type ? { type: hints.type } : {}),
      },
      select: { id: true },
      take: 2,
    });
    if (matches.length === 1) return matches[0].id;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/** Resolve or create an entity. Returns entity ID. */
export async function upsertEntity(
  userId: string,
  input: EntityInput,
  externalRef?: ExternalRefInput,
): Promise<string> {
  const hints: EntityHints = {
    type: input.type,
    displayName: input.displayName,
    email: input.email,
    domain: input.domain,
    provider: externalRef?.provider,
    externalId: externalRef?.externalId,
  };

  const existingId = await resolveEntity(userId, hints);

  if (existingId) {
    // Update if name differs
    const existing = await prisma.entity.findUnique({
      where: { id: existingId },
      select: { displayName: true, email: true, phone: true, domain: true, metadataJson: true },
    });
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (input.displayName && input.displayName !== existing.displayName) updates.displayName = input.displayName;
      if (input.email && !existing.email) updates.email = input.email.toLowerCase().trim();
      if (input.phone && !existing.phone) updates.phone = input.phone;
      if (input.domain && !existing.domain) updates.domain = input.domain.toLowerCase().trim();
      if (input.metadataJson) {
        updates.metadataJson = mergeMetadataJson(existing.metadataJson, input.metadataJson);
      }
      if (Object.keys(updates).length > 0) {
        await prisma.entity.update({ where: { id: existingId }, data: updates });
      }
    }

    // Attach external ref if provided
    if (externalRef) {
      await linkExternalRef(userId, existingId, externalRef);
    }
    return existingId;
  }

  // Create new entity
  const entity = await prisma.entity.create({
    data: {
      userId,
      type: input.type,
      displayName: input.displayName,
      email: input.email?.toLowerCase().trim() || null,
      phone: input.phone || null,
      domain: input.domain?.toLowerCase().trim() || null,
      metadataJson: input.metadataJson || null,
    },
  });

  if (externalRef) {
    await linkExternalRef(userId, entity.id, externalRef);
  }

  return entity.id;
}

// ---------------------------------------------------------------------------
// External Refs
// ---------------------------------------------------------------------------

export async function linkExternalRef(
  userId: string,
  entityId: string,
  ref: ExternalRefInput,
): Promise<void> {
  await prisma.entityExternalRef.upsert({
    where: {
      entityId_provider_externalId: {
        entityId,
        provider: ref.provider,
        externalId: ref.externalId,
      },
    },
    update: {
      lastSeenAt: new Date(),
      label: ref.label ?? undefined,
      metadataJson: ref.metadataJson ?? undefined,
    },
    create: {
      entityId,
      provider: ref.provider,
      externalId: ref.externalId,
      label: ref.label || null,
      metadataJson: ref.metadataJson || null,
    },
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Full entity context for prompt injection or API response. */
export async function getEntityContext(
  userId: string,
  entityIdOrName: string,
  type?: EntityType,
): Promise<EntityContext | null> {
  // Try by ID first
  let entity = await prisma.entity.findFirst({
    where: { id: entityIdOrName, userId },
    include: {
      externalRefs: { select: { provider: true, externalId: true, label: true } },
      relationsFrom: { include: { toEntity: { select: { id: true, displayName: true } } } },
      relationsTo: { include: { fromEntity: { select: { id: true, displayName: true } } } },
      mentions: { orderBy: { createdAt: "desc" }, take: 10, select: { sourceType: true, sourceId: true, snippet: true, createdAt: true } },
    },
  });

  // Try by email
  if (!entity) {
    entity = await prisma.entity.findFirst({
      where: { userId, email: entityIdOrName.toLowerCase().trim(), mergedIntoId: null, ...(type ? { type } : {}) },
      include: {
        externalRefs: { select: { provider: true, externalId: true, label: true } },
        relationsFrom: { include: { toEntity: { select: { id: true, displayName: true } } } },
        relationsTo: { include: { fromEntity: { select: { id: true, displayName: true } } } },
        mentions: { orderBy: { createdAt: "desc" }, take: 10, select: { sourceType: true, sourceId: true, snippet: true, createdAt: true } },
      },
    });
  }

  // Try by name (ILIKE)
  if (!entity) {
    entity = await prisma.entity.findFirst({
      where: {
        userId,
        displayName: { contains: entityIdOrName, mode: "insensitive" },
        mergedIntoId: null,
        ...(type ? { type } : {}),
      },
      include: {
        externalRefs: { select: { provider: true, externalId: true, label: true } },
        relationsFrom: { include: { toEntity: { select: { id: true, displayName: true } } } },
        relationsTo: { include: { fromEntity: { select: { id: true, displayName: true } } } },
        mentions: { orderBy: { createdAt: "desc" }, take: 10, select: { sourceType: true, sourceId: true, snippet: true, createdAt: true } },
      },
    });
  }

  if (!entity) return null;

  // Follow mergedIntoId chain (max 3 hops)
  let resolved = entity;
  for (let i = 0; i < 3 && resolved.mergedIntoId; i++) {
    const merged = await prisma.entity.findFirst({
      where: { id: resolved.mergedIntoId, userId },
      include: {
        externalRefs: { select: { provider: true, externalId: true, label: true } },
        relationsFrom: { include: { toEntity: { select: { id: true, displayName: true } } } },
        relationsTo: { include: { fromEntity: { select: { id: true, displayName: true } } } },
        mentions: { orderBy: { createdAt: "desc" }, take: 10, select: { sourceType: true, sourceId: true, snippet: true, createdAt: true } },
      },
    });
    if (!merged) break;
    resolved = merged;
  }

  const relationships: EntityContext["relationships"] = [];
  for (const r of resolved.relationsFrom) {
    relationships.push({ direction: "from", relationType: r.relationType, entityName: r.toEntity.displayName, entityId: r.toEntity.id });
  }
  for (const r of resolved.relationsTo) {
    relationships.push({ direction: "to", relationType: r.relationType, entityName: r.fromEntity.displayName, entityId: r.fromEntity.id });
  }

  let metadata: Record<string, unknown> | null = null;
  if (resolved.metadataJson) {
    try { metadata = JSON.parse(resolved.metadataJson); } catch { /* ignore */ }
  }

  return {
    id: resolved.id,
    type: resolved.type,
    displayName: resolved.displayName,
    email: resolved.email,
    phone: resolved.phone,
    domain: resolved.domain,
    metadata,
    externalRefs: resolved.externalRefs,
    relationships,
    recentMentions: resolved.mentions,
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchEntities(
  userId: string,
  query: string,
  type?: EntityType,
  limit = 20,
): Promise<EntitySearchResult[]> {
  const cap = Math.min(limit, 50);
  const entities = await prisma.entity.findMany({
    where: {
      userId,
      mergedIntoId: null,
      ...(type ? { type } : {}),
      OR: [
        { displayName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { domain: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { _count: { select: { externalRefs: true } } },
    orderBy: { updatedAt: "desc" },
    take: cap,
  });

  return entities.map((e) => ({
    id: e.id,
    type: e.type,
    displayName: e.displayName,
    email: e.email,
    domain: e.domain,
    refCount: e._count.externalRefs,
  }));
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export async function relateEntities(
  userId: string,
  fromId: string,
  toId: string,
  relationType: EntityRelationType,
  label?: string,
  confidence?: number,
): Promise<void> {
  // Verify both belong to user
  const [from, to] = await Promise.all([
    prisma.entity.findFirst({ where: { id: fromId, userId }, select: { id: true } }),
    prisma.entity.findFirst({ where: { id: toId, userId }, select: { id: true } }),
  ]);
  if (!from || !to) return;

  await prisma.entityRelationship.upsert({
    where: {
      fromEntityId_toEntityId_relationType: { fromEntityId: fromId, toEntityId: toId, relationType },
    },
    update: {
      label: label ?? undefined,
      confidence: confidence ?? undefined,
    },
    create: {
      userId,
      fromEntityId: fromId,
      toEntityId: toId,
      relationType,
      label: label || null,
      confidence: confidence ?? 1.0,
    },
  });
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

export async function mergeEntities(
  userId: string,
  keepId: string,
  mergeId: string,
): Promise<void> {
  const [keep, merge] = await Promise.all([
    prisma.entity.findFirst({ where: { id: keepId, userId, mergedIntoId: null } }),
    prisma.entity.findFirst({ where: { id: mergeId, userId, mergedIntoId: null } }),
  ]);
  if (!keep || !merge) return;

  await prisma.$transaction(async (tx) => {
    // Move external refs (check for duplicates to avoid unique constraint violation)
    const mergeRefs = await tx.entityExternalRef.findMany({ where: { entityId: mergeId } });
    for (const ref of mergeRefs) {
      const existing = await tx.entityExternalRef.findUnique({
        where: { entityId_provider_externalId: { entityId: keepId, provider: ref.provider, externalId: ref.externalId } },
      });
      if (!existing) {
        await tx.entityExternalRef.update({ where: { id: ref.id }, data: { entityId: keepId } });
      } else {
        // Keep the one on keepId, delete the duplicate from mergeId
        await tx.entityExternalRef.delete({ where: { id: ref.id } });
      }
    }

    // Move relationships (from)
    const relsFrom = await tx.entityRelationship.findMany({ where: { fromEntityId: mergeId } });
    for (const r of relsFrom) {
      const existing = await tx.entityRelationship.findUnique({
        where: { fromEntityId_toEntityId_relationType: { fromEntityId: keepId, toEntityId: r.toEntityId, relationType: r.relationType } },
      });
      if (!existing) {
        await tx.entityRelationship.update({ where: { id: r.id }, data: { fromEntityId: keepId } });
      } else {
        await tx.entityRelationship.delete({ where: { id: r.id } });
      }
    }

    // Move relationships (to)
    const relsTo = await tx.entityRelationship.findMany({ where: { toEntityId: mergeId } });
    for (const r of relsTo) {
      const existing = await tx.entityRelationship.findUnique({
        where: { fromEntityId_toEntityId_relationType: { fromEntityId: r.fromEntityId, toEntityId: keepId, relationType: r.relationType } },
      });
      if (!existing) {
        await tx.entityRelationship.update({ where: { id: r.id }, data: { toEntityId: keepId } });
      } else {
        await tx.entityRelationship.delete({ where: { id: r.id } });
      }
    }

    // Move mentions
    await tx.entityMention.updateMany({ where: { entityId: mergeId }, data: { entityId: keepId } });

    // Copy missing fields
    const updates: Record<string, unknown> = {};
    if (!keep.email && merge.email) updates.email = merge.email;
    if (!keep.phone && merge.phone) updates.phone = merge.phone;
    if (!keep.domain && merge.domain) updates.domain = merge.domain;
    if (merge.metadataJson) {
      updates.metadataJson = mergeMetadataJson(keep.metadataJson, merge.metadataJson);
    }
    if (Object.keys(updates).length > 0) {
      await tx.entity.update({ where: { id: keepId }, data: updates });
    }

    // Mark merged
    await tx.entity.update({ where: { id: mergeId }, data: { mergedIntoId: keepId } });
  });
}

// ---------------------------------------------------------------------------
// Update / Delete
// ---------------------------------------------------------------------------

export async function updateEntity(
  userId: string,
  entityId: string,
  fields: { displayName?: string; email?: string; phone?: string; domain?: string; metadataJson?: string },
): Promise<boolean> {
  const entity = await prisma.entity.findFirst({ where: { id: entityId, userId } });
  if (!entity) return false;

  const data: Record<string, unknown> = {};
  if (fields.displayName !== undefined) data.displayName = fields.displayName;
  if (fields.email !== undefined) data.email = fields.email?.toLowerCase().trim() || null;
  if (fields.phone !== undefined) data.phone = fields.phone || null;
  if (fields.domain !== undefined) data.domain = fields.domain?.toLowerCase().trim() || null;
  if (fields.metadataJson !== undefined) data.metadataJson = fields.metadataJson;

  if (Object.keys(data).length > 0) {
    await prisma.entity.update({ where: { id: entityId }, data });
  }
  return true;
}

export async function deleteEntity(userId: string, entityId: string): Promise<void> {
  await prisma.entity.deleteMany({ where: { id: entityId, userId } });
}

// ---------------------------------------------------------------------------
// Mentions
// ---------------------------------------------------------------------------

export async function recordEntityMention(
  userId: string,
  entityId: string,
  sourceType: string,
  sourceId: string,
  snippet?: string,
): Promise<void> {
  await prisma.entityMention.create({
    data: {
      entityId,
      sourceType,
      sourceId,
      snippet: snippet ? snippet.slice(0, 240) : null,
    },
  });
}

// ---------------------------------------------------------------------------
// Task context injection
// ---------------------------------------------------------------------------

/** Extract entity context from task title/instructions for agent prompt injection. */
export async function extractEntityContextForTask(
  userId: string,
  title: string,
  instructions: string,
): Promise<string | null> {
  const text = `${title} ${instructions}`;
  const candidates = extractCandidates(text);
  if (candidates.length === 0) return null;

  const matched: EntityContext[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (matched.length >= 3) break;
    const ctx = await getEntityContext(userId, c);
    if (ctx && !seen.has(ctx.id)) {
      seen.add(ctx.id);
      matched.push(ctx);
    }
  }

  if (matched.length === 0) return null;

  let block = "## ENTITY CONTEXT\n";
  for (const ctx of matched) {
    const formatted = formatEntityContextForPrompt(ctx);
    if (block.length + formatted.length > 4000) break;
    block += formatted + "\n";
  }

  return block.trim();
}

/** Format a single entity for prompt injection. */
export function formatEntityContextForPrompt(ctx: EntityContext): string {
  const lines: string[] = [];
  lines.push(`### ${ctx.displayName} (${ctx.type})`);

  if (ctx.email) lines.push(`- Email: ${ctx.email}`);
  if (ctx.phone) lines.push(`- Phone: ${ctx.phone}`);
  if (ctx.domain) lines.push(`- Domain: ${ctx.domain}`);

  if (ctx.externalRefs.length > 0) {
    lines.push(`- Sources: ${ctx.externalRefs.map((r) => `${r.provider}:${r.externalId}${r.label ? ` (${r.label})` : ""}`).join(", ")}`);
  }

  if (ctx.relationships.length > 0) {
    const relLines = ctx.relationships.slice(0, 5).map((r) => {
      const arrow = r.direction === "from" ? `→ ${r.relationType} → ${r.entityName}` : `← ${r.relationType} ← ${r.entityName}`;
      return `  - ${arrow}`;
    });
    lines.push("- Relationships:");
    lines.push(...relLines);
  }

  if (ctx.recentMentions.length > 0) {
    lines.push("- Recent mentions:");
    for (const m of ctx.recentMentions.slice(0, 3)) {
      const snip = m.snippet ? `: ${m.snippet}` : "";
      lines.push(`  - ${m.sourceType}/${m.sourceId}${snip}`);
    }
  }

  const result = lines.join("\n");
  return result.length > 2000 ? result.slice(0, 2000) + "..." : result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeMetadataJson(existing: string | null, incoming: string): string {
  try {
    const base = existing ? JSON.parse(existing) : {};
    const overlay = JSON.parse(incoming);
    return JSON.stringify({ ...base, ...overlay });
  } catch {
    return incoming;
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractCandidates(text: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  // Extract emails
  const emails = text.match(EMAIL_RE) || [];
  for (const e of emails) {
    const lower = e.toLowerCase();
    if (!seen.has(lower)) { seen.add(lower); candidates.push(lower); }
  }

  // Extract capitalized multi-word names (e.g. "Sarah Johnson", "Acme Corp")
  const nameRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const names = text.match(nameRe) || [];
  for (const n of names) {
    const lower = n.toLowerCase();
    if (!seen.has(lower)) { seen.add(lower); candidates.push(n); }
  }

  return candidates.slice(0, 10);
}
