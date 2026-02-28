import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
    // R2 requires path-style (no virtual-hosted bucket subdomain)
    forcePathStyle: !!process.env.STORAGE_ENDPOINT,
  });
  return _client;
}

function getBucket(): string {
  return process.env.STORAGE_BUCKET_NAME!;
}

export function isStorageConfigured(): boolean {
  return !!(process.env.STORAGE_ACCESS_KEY_ID && process.env.STORAGE_BUCKET_NAME);
}

/**
 * Cloud keys are bare paths like "business-files/userId/ts-name.pdf".
 * Local paths start with "/" (absolute) or "." (relative to cwd).
 */
export function isCloudKey(storagePath: string): boolean {
  return !storagePath.startsWith("/") && !storagePath.startsWith(".");
}

export async function uploadToStorage(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function downloadFromStorage(key: string): Promise<Buffer> {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFromStorage(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  );
}
