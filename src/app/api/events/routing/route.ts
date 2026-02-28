import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-guard";

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.eventRoutingRule.findMany({
    where: { userId: session.userId },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    provider: string;
    eventPattern: string;
    agentTarget: string;
    priority?: number;
    conditionJson?: string;
    transformJson?: string;
  };

  if (!body.provider || !body.eventPattern || !body.agentTarget) {
    return NextResponse.json({ error: "provider, eventPattern, and agentTarget are required" }, { status: 400 });
  }

  const rule = await prisma.eventRoutingRule.create({
    data: {
      userId: session.userId,
      provider: body.provider,
      eventPattern: body.eventPattern,
      agentTarget: body.agentTarget,
      priority: body.priority ?? 50,
      conditionJson: body.conditionJson ?? null,
      transformJson: body.transformJson ?? null,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    id: string;
    provider?: string;
    eventPattern?: string;
    agentTarget?: string;
    priority?: number;
    enabled?: boolean;
    conditionJson?: string | null;
    transformJson?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.eventRoutingRule.findFirst({
    where: { id: body.id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rule = await prisma.eventRoutingRule.update({
    where: { id: body.id },
    data: {
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.eventPattern !== undefined && { eventPattern: body.eventPattern }),
      ...(body.agentTarget !== undefined && { agentTarget: body.agentTarget }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.conditionJson !== undefined && { conditionJson: body.conditionJson }),
      ...(body.transformJson !== undefined && { transformJson: body.transformJson }),
    },
  });

  return NextResponse.json({ rule });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.eventRoutingRule.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.eventRoutingRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
