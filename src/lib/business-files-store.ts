import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { BusinessFileCategory, BusinessLogSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";
import { extractTextFromBuffer } from "@/lib/text-extraction";

const STORAGE_ROOT = path.join(process.cwd(), ".data", "business-files");
const MAX_STORED_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = [
  "text/",
  "application/pdf",
  "application/json",
  "application/xml",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml",
  "application/zip",
];
const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".tsv",
  ".xml",
  ".html",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".rtf",
  ".zip",
]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 180) || "file";
}

function extIsText(name: string, mime?: string | null) {
  const ext = path.extname(name).toLowerCase();
  if (mime?.startsWith("text/")) return true;
  return [".txt", ".md", ".json", ".csv", ".tsv", ".xml", ".html"].includes(ext);
}

function fileTypeAllowed(name: string, mime?: string | null) {
  const ext = path.extname(name).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  const normalizedMime = (mime ?? "").toLowerCase();
  return ALLOWED_MIME_PREFIXES.some((prefix) => normalizedMime.startsWith(prefix));
}

export async function listBusinessFiles(userId: string, limit = 200) {
  return prisma.businessFile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createBusinessFileFromUpload(input: {
  userId: string;
  fileName: string;
  mimeType?: string | null;
  bytes: Uint8Array;
  category?: keyof typeof BusinessFileCategory;
  source?: keyof typeof BusinessLogSource;
  authorLabel?: string;
  relatedRef?: string;
}) {
  if (!input.fileName.trim()) throw new Error("File name is required");
  if (input.bytes.byteLength <= 0) throw new Error("Empty files are not allowed");
  if (input.bytes.byteLength > MAX_STORED_FILE_BYTES) {
    throw new Error(`File exceeds size limit (${Math.round(MAX_STORED_FILE_BYTES / 1024 / 1024)} MB)`);
  }
  if (!fileTypeAllowed(input.fileName, input.mimeType ?? null)) {
    throw new Error("File type is not allowed");
  }

  const folder = path.join(STORAGE_ROOT, input.userId);
  await mkdir(folder, { recursive: true });
  const stamped = `${Date.now()}-${safeName(input.fileName)}`;
  const absPath = path.join(folder, stamped);
  await writeFile(absPath, input.bytes);

  const textExtract = await extractTextFromBuffer(input.fileName, input.bytes);

  const category =
    input.category && input.category in BusinessFileCategory
      ? BusinessFileCategory[input.category]
      : BusinessFileCategory.GENERAL;
  const source =
    input.source && input.source in BusinessLogSource ? BusinessLogSource[input.source] : BusinessLogSource.IMPORT;

  const row = await prisma.businessFile.create({
    data: {
      userId: input.userId,
      name: clean(input.fileName, 240),
      category,
      mimeType: clean(input.mimeType, 200) || null,
      sizeBytes: input.bytes.byteLength,
      storagePath: absPath,
      textExtract,
      source,
      authorLabel: clean(input.authorLabel, 160) || null,
      relatedRef: clean(input.relatedRef, 240) || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      scope: "BUSINESS_FILE",
      entityId: row.id,
      action: "UPLOAD",
      summary: `Uploaded business file: ${row.name}`,
      metadata: JSON.stringify({ category: row.category, mimeType: row.mimeType, sizeBytes: row.sizeBytes }),
    },
  });

  eventBus.emit({
    type: "BUSINESS_FILE_UPLOADED",
    userId: input.userId,
    fileId: row.id,
    fileName: row.name,
    category: row.category,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
  });

  return row;
}

export async function deleteBusinessFile(userId: string, fileId: string) {
  const row = await prisma.businessFile.findFirst({ where: { id: fileId, userId } });
  if (!row) throw new Error("File not found");

  try {
    await unlink(row.storagePath);
  } catch {
    // file already gone from disk — fine
  }

  await prisma.businessFile.delete({ where: { id: fileId } });

  await prisma.auditLog.create({
    data: {
      userId,
      scope: "BUSINESS_FILE",
      entityId: row.id,
      action: "DELETE",
      summary: `Deleted business file: ${row.name}`,
    },
  });
}

const EXTRACTABLE_EXTENSIONS = new Set([
  ".txt", ".md", ".csv", ".json", ".xml", ".html", ".tsv", ".rtf", ".docx", ".pdf",
]);

/**
 * Backfill text extracts for files that were uploaded before extraction was enabled.
 * Reads files from disk, extracts text, and caches the result in the DB.
 * Mutates the input array in-place so the current request benefits immediately.
 */
export async function backfillMissingExtracts(
  files: Array<{ id: string; name: string; storagePath: string; textExtract: string | null }>,
) {
  const needed = files.filter(
    (f) => f.textExtract === null && EXTRACTABLE_EXTENSIONS.has(path.extname(f.name).toLowerCase()),
  );
  if (needed.length === 0) return;

  await Promise.all(
    needed.map(async (file) => {
      try {
        const bytes = new Uint8Array(await readFile(file.storagePath));
        const text = await extractTextFromBuffer(file.name, bytes);
        if (text) {
          await prisma.businessFile.update({ where: { id: file.id }, data: { textExtract: text } });
          file.textExtract = text;
        }
      } catch {
        // file missing from disk or extraction failed — skip
      }
    }),
  );
}

export function summarizeBusinessFilesForAdvisor(
  rows: Array<{
    name: string;
    category: BusinessFileCategory;
    source: BusinessLogSource;
    mimeType: string | null;
    sizeBytes: number;
    textExtract: string | null;
    authorLabel: string | null;
    relatedRef: string | null;
    createdAt: Date;
  }>,
) {
  return rows.map((row) => ({
    name: row.name,
    category: row.category,
    source: row.source,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    author: row.authorLabel,
    relatedRef: row.relatedRef,
    createdAt: row.createdAt.toISOString(),
    textExtract: row.textExtract ? (row.textExtract.length > 1500 ? row.textExtract.slice(0, 1500) + "..." : row.textExtract) : null,
  }));
}
