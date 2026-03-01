import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { searchEntities } from "@/lib/entity-store";
import { EntityType } from "@prisma/client";

export const runtime = "nodejs";

const VALID_TYPES: string[] = ["PERSON", "COMPANY", "DEAL", "PROJECT"];

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const typeParam = url.searchParams.get("type")?.toUpperCase();
  const type = typeParam && VALID_TYPES.includes(typeParam) ? (typeParam as EntityType) : undefined;
  const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const entities = await searchEntities(userId, q, type, limit);
    return NextResponse.json({ entities });
  } catch (e) {
    console.error("[entities] search failed:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
