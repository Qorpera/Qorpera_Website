import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createBusinessLog, listBusinessLogs } from "@/lib/business-logs-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const logs = await listBusinessLogs(userId, 80);
  return NextResponse.json({ logs });
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
  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    category?: string;
    source?: string;
    authorLabel?: string;
    body?: string;
    relatedRef?: string;
  };

  try {
    const log = await createBusinessLog(userId, {
      title: body.title ?? "",
      category: body.category as never,
      source: body.source as never,
      authorLabel: body.authorLabel,
      body: body.body ?? "",
      relatedRef: body.relatedRef,
    });
    return NextResponse.json({ ok: true, log });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create business log" }, { status: 400 });
  }
}
