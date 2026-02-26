import crypto from "node:crypto";

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
  v: 1;
};

function getKey() {
  const raw =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.APP_SECRET ||
    "zygenic-dev-only-insecure-key-change-me";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
    v: 1,
  };

  return JSON.stringify(payload);
}

export function decryptSecret(encoded: string): string {
  const payload = JSON.parse(encoded) as EncryptedPayload;
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
