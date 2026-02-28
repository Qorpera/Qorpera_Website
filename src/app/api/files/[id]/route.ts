import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isCloudKey, getPresignedDownloadUrl } from "@/lib/storage";
import { getFileBuffer } from "@/lib/business-files-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const file = await prisma.businessFile.findFirst({
    where: { id, userId },
  });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isCloudKey(file.storagePath)) {
    const url = await getPresignedDownloadUrl(file.storagePath, 3600);
    return NextResponse.redirect(url);
  }

  // Local file — stream raw bytes
  let bytes: Buffer;
  try {
    bytes = await getFileBuffer(file.storagePath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const contentType = file.mimeType ?? "application/octet-stream";
  const disposition = `attachment; filename="${encodeURIComponent(file.name)}"`;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
