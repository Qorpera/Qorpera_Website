import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  getCloudConnector,
  getCloudConnectors,
  setManagedConnector,
  updateConnectorGuardrails,
  type SupportedProvider,
} from "@/lib/connectors-store";
import { CloudConnectorBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const provider = (url.searchParams.get("provider") as SupportedProvider | null) ?? null;
  if (provider && ["OPENAI", "ANTHROPIC", "GOOGLE"].includes(provider)) {
    const connector = await getCloudConnector(userId, provider);
    return NextResponse.json({ connector });
  }
  const connectors = await getCloudConnectors(userId);
  return NextResponse.json({ connectors, connector: connectors.find((c) => c.provider === "OPENAI") });
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
  const parsed = CloudConnectorBody.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const body = parsed.data;

  const provider: SupportedProvider = body.provider ?? "OPENAI";

  if (typeof body.monthlyRequestLimit === "number" || typeof body.monthlyUsdLimit === "number") {
    const connector = await updateConnectorGuardrails(userId, provider, {
      monthlyRequestLimit: typeof body.monthlyRequestLimit === "number" ? Math.max(1, Math.floor(body.monthlyRequestLimit)) : undefined,
      monthlyUsdLimit: typeof body.monthlyUsdLimit === "number" ? Math.max(0.1, Number(body.monthlyUsdLimit)) : undefined,
    });
    return NextResponse.json({ ok: true, connector });
  }

  const connector = await setManagedConnector(userId, body.label, provider);
  return NextResponse.json({ ok: true, connector });
}
