import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 200);
  const goal = String(body.goal ?? "").trim().slice(0, 1000);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) + "-" + Date.now().toString(36);

  const project = await prisma.project.create({
    data: { userId, name, goal, slug, status: "Active" },
  });

  return NextResponse.json({ id: project.id, slug: project.slug }, { status: 201 });
}
