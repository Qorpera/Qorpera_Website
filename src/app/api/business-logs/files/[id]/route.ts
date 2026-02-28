import { basename } from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { deleteBusinessFile, getFileBuffer } from "@/lib/business-files-store";
import { isCloudKey, getPresignedDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.businessFile.findFirst({
    where: { id, userId },
    select: { name: true, storagePath: true, mimeType: true },
  });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (isCloudKey(file.storagePath)) {
      const url = await getPresignedDownloadUrl(file.storagePath, 3600);
      return NextResponse.redirect(url);
    }
    const bytes = await getFileBuffer(file.storagePath);
    const headers = new Headers();
    headers.set("Content-Type", file.mimeType || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${basename(file.name).replace(/"/g, "")}"`);
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "File is unavailable" }, { status: 410 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteBusinessFile(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 400 });
  }
}
