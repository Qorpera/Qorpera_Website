/**
 * Session codec using Web Crypto API for Edge/Node compatibility.
 * Pure functions with no framework dependencies.
 */

const SESSION_VERSION = "v2";
const SESSION_VERSION_LEGACY = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64url(input: Uint8Array): string {
  // Use Buffer in Node, TextEncoder-based approach for Edge
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  const binary = String.fromCharCode(...input);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlFromString(input: string): string {
  const encoder = new TextEncoder();
  return base64url(encoder.encode(input));
}

function fromBase64url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized + padding, "base64");
  }
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(new Uint8Array(sig));
}

async function verifyPayload(payload: string, sig: string, secret: string): Promise<boolean> {
  const key = await getCryptoKey(secret);
  const encoder = new TextEncoder();
  const sigBytes = fromBase64url(sig);
  return crypto.subtle.verify("HMAC", key, new Uint8Array(sigBytes) as BufferSource, encoder.encode(payload));
}

export function getSessionSecret(): string {
  const raw = process.env.APP_SECRET || process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw || raw.trim().length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_SECRET (or CREDENTIAL_ENCRYPTION_KEY) must be set in production");
    }
    return "zygenic-dev-session-secret-change-me";
  }
  return raw;
}

export async function encodeSession(userId: string, secret?: string): Promise<string> {
  const s = secret ?? getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_TTL_SECONDS;
  // v2 format: version.userId.exp.issuedAt.sig
  const payload = `${SESSION_VERSION}.${base64urlFromString(userId)}.${exp}.${now}`;
  const sig = await signPayload(payload, s);
  return `${payload}.${sig}`;
}

export async function decodeSession(
  token: string,
  secret?: string,
): Promise<{ userId: string; issuedAt?: number } | null> {
  const s = secret ?? getSessionSecret();
  const parts = token.split(".");

  // v2: 5 parts (version.userId.exp.iat.sig)
  if (parts.length === 5) {
    const [version, userIdB64, expRaw, iatRaw, sig] = parts;
    if (version !== SESSION_VERSION) return null;

    const payload = `${version}.${userIdB64}.${expRaw}.${iatRaw}`;
    const valid = await verifyPayload(payload, sig, s);
    if (!valid) return null;

    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

    const issuedAt = Number(iatRaw);

    try {
      const bytes = fromBase64url(userIdB64);
      const decoder = new TextDecoder();
      const userId = decoder.decode(bytes);
      if (!userId) return null;
      return { userId, issuedAt: Number.isFinite(issuedAt) ? issuedAt : undefined };
    } catch {
      return null;
    }
  }

  // v1 legacy: 4 parts (version.userId.exp.sig) — no issuedAt
  if (parts.length === 4) {
    const [version, userIdB64, expRaw, sig] = parts;
    if (version !== SESSION_VERSION_LEGACY) return null;

    const payload = `${version}.${userIdB64}.${expRaw}`;
    const valid = await verifyPayload(payload, sig, s);
    if (!valid) return null;

    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

    try {
      const bytes = fromBase64url(userIdB64);
      const decoder = new TextDecoder();
      const userId = decoder.decode(bytes);
      if (!userId) return null;
      return { userId };
    } catch {
      return null;
    }
  }

  return null;
}

export const SESSION_COOKIE = "wf_session";
export { SESSION_TTL_SECONDS };

// ─── 2FA pending token ───────────────────────────────────────────────────────

export const TOTP_PENDING_COOKIE = "wf_2fa";
export const TOTP_PENDING_TTL = 5 * 60; // 5 minutes

export async function encode2faPending(userId: string, secret?: string): Promise<string> {
  const s = secret ?? getSessionSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOTP_PENDING_TTL;
  const payload = `2fa.${base64urlFromString(userId)}.${exp}`;
  const sig = await signPayload(payload, s);
  return `${payload}.${sig}`;
}

export async function decode2faPending(
  token: string,
  secret?: string,
): Promise<{ userId: string } | null> {
  const s = secret ?? getSessionSecret();
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userIdB64, expRaw, sig] = parts;
  if (version !== "2fa") return null;

  const payload = `${version}.${userIdB64}.${expRaw}`;
  const valid = await verifyPayload(payload, sig, s);
  if (!valid) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  try {
    const bytes = fromBase64url(userIdB64);
    const userId = new TextDecoder().decode(bytes);
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
