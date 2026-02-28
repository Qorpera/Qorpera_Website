import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listDbConnections, createDbConnection } from "@/lib/db-connections-store";
import { CreateDbConnectionBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const connections = await listDbConnections(userId);
  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = CreateDbConnectionBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  try {
    const connection = await createDbConnection(userId, parsed.data);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (e) {
    console.error("[db-connections] create failed:", e);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}
