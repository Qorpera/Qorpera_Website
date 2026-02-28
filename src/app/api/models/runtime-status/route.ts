import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getCloudConnectors } from "@/lib/connectors-store";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectors = await getCloudConnectors(userId);
  const providers: Record<string, { ready: boolean; message: string }> = {};

  for (const c of connectors) {
    const ready = c.managedAvailable;
    providers[c.provider] = {
      ready,
      message: ready
        ? `${c.provider} is configured and ready.`
        : `${c.provider} managed key is not set. Contact support.`,
    };
  }

  return NextResponse.json({ providers });
}
