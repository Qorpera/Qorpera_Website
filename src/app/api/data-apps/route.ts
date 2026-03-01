import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listDataApps } from "@/lib/data-app-store";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apps = await listDataApps(userId);
  return NextResponse.json({ apps });
}
