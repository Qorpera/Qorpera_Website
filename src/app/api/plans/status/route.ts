import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getPlanStatus } from "@/lib/plan-store";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getPlanStatus(userId);
  return NextResponse.json(status);
}
