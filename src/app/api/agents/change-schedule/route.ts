import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  jobId: z.string().min(1),
  schedule: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let raw: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    raw = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData().catch(() => null);
    raw = form ? Object.fromEntries(form.entries()) : {};
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { jobId, schedule } = parsed.data;

  const job = await prisma.hiredJob.findFirst({ where: { id: jobId, userId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.hiredJob.update({ where: { id: jobId }, data: { schedule } });

  return NextResponse.redirect(new URL("/agents/hire", req.url), { status: 303 });
}
