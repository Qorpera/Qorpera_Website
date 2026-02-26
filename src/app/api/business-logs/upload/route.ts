import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createBusinessFileFromUpload } from "@/lib/business-files-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const MAX_FILES_PER_REQUEST = 20;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES_PER_REQUEST})` }, { status: 400 });
  }

  const category = String(form.get("category") ?? "GENERAL");
  const source = String(form.get("source") ?? "IMPORT");
  const authorLabel = String(form.get("authorLabel") ?? "");
  const relatedRef = String(form.get("relatedRef") ?? "");

  try {
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: `Total upload too large (max ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB)` }, { status: 400 });
    }
    const created = [];
    for (const file of files.slice(0, MAX_FILES_PER_REQUEST)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds max size (${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB)` },
          { status: 400 },
        );
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      const row = await createBusinessFileFromUpload({
        userId: userId,
        fileName: file.name,
        mimeType: file.type || null,
        bytes: buf,
        category: category as never,
        source: source as never,
        authorLabel,
        relatedRef,
      });
      created.push(row);
    }
    return NextResponse.json({ ok: true, files: created });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
