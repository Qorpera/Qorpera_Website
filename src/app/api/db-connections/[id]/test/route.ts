import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { testDbConnection } from "@/lib/db-connections-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await testDbConnection(userId, id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
