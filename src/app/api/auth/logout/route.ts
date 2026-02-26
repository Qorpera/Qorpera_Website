import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  await clearSession();
  return NextResponse.json({ ok: true });
}
