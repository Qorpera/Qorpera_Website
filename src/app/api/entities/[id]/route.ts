import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getEntityContext, updateEntity, deleteEntity } from "@/lib/entity-store";
import { verifySameOrigin } from "@/lib/request-security";
import { EntityType } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TYPES: string[] = ["PERSON", "COMPANY", "DEAL", "PROJECT"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(_request.url);
  const typeParam = url.searchParams.get("type")?.toUpperCase();
  const type = typeParam && VALID_TYPES.includes(typeParam) ? (typeParam as EntityType) : undefined;

  try {
    const ctx = await getEntityContext(userId, id, type);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entity: ctx });
  } catch (e) {
    console.error("[entities] get failed:", e);
    return NextResponse.json({ error: "Failed to fetch entity" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const fields: Record<string, string | undefined> = {};
  if (typeof body.displayName === "string") fields.displayName = body.displayName.trim();
  if (typeof body.email === "string") fields.email = body.email;
  if (typeof body.phone === "string") fields.phone = body.phone;
  if (typeof body.domain === "string") fields.domain = body.domain;
  if (typeof body.metadataJson === "string") fields.metadataJson = body.metadataJson;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const ok = await updateEntity(userId, id, fields);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[entities] update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteEntity(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[entities] delete failed:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
