import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listConnections } from "@/lib/integrations/token-store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await listConnections(session.userId);
  return NextResponse.json({ connections });
}
