import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".csv", ".json", ".xml", ".html", ".tsv", ".rtf",
]);

const MAX_EXTRACT_CHARS = 20_000;

/**
 * Extract plain text from a file buffer.
 * Returns null for unsupported formats (.xls, .xlsx, .zip, etc.)
 */
export async function extractTextFromBuffer(
  fileName: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const ext = path.extname(fileName).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    return Buffer.from(bytes).toString("utf8").slice(0, MAX_EXTRACT_CHARS);
  }

  if (ext === ".docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const text = result.value?.trim();
      return text ? text.slice(0, MAX_EXTRACT_CHARS) : null;
    } catch {
      return null;
    }
  }

  if (ext === ".pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text?.trim();
      return text ? text.slice(0, MAX_EXTRACT_CHARS) : null;
    } catch {
      return null;
    }
  }

  return null;
}
