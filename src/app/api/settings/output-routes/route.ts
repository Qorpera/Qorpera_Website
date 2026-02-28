import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  listOutputRoutes,
  createOutputRoute,
  updateOutputRoute,
  deleteOutputRoute,
} from "@/lib/output-routes-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireUserId();
    const routes = await listOutputRoutes(userId);
    return NextResponse.json({ routes });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json() as {
      name?: string;
      agentTarget?: string;
      routeType: string;
      routeTarget: string;
      onCompleted?: boolean;
      onFailed?: boolean;
    };

    if (!body.routeType || !body.routeTarget) {
      return NextResponse.json({ error: "routeType and routeTarget are required" }, { status: 400 });
    }

    const route = await createOutputRoute(userId, body);
    return NextResponse.json({ route }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json() as {
      id: string;
      name?: string;
      agentTarget?: string;
      routeType?: string;
      routeTarget?: string;
      onCompleted?: boolean;
      onFailed?: boolean;
      enabled?: boolean;
    };

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { id, ...rest } = body;
    const route = await updateOutputRoute(userId, id, rest);
    return NextResponse.json({ route });
  } catch (e) {
    if (e instanceof Error && e.message === "Route not found") {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await deleteOutputRoute(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Route not found") {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
