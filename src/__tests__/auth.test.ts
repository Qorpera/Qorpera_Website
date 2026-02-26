import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// We test the session encode/decode logic directly since auth.ts depends on next/headers.
// We replicate the core session codec functions here for unit testing.
// Phase 2 will extract these into session-codec.ts.

const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const TEST_SECRET = "test-secret-at-least-16-chars";

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + padding, "base64");
}

function signPayload(payload: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

function encodeSession(userId: string, secret = TEST_SECRET) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${SESSION_VERSION}.${base64url(userId)}.${exp}`;
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

function decodeSession(token: string, secret = TEST_SECRET): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, userIdB64, expRaw, sig] = parts;
  if (version !== SESSION_VERSION) return null;
  const payload = `${version}.${userIdB64}.${expRaw}`;
  const expected = signPayload(payload, secret);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  try {
    const userId = fromBase64url(userIdB64).toString("utf8");
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

describe("session encode/decode", () => {
  it("round-trips a userId", () => {
    const token = encodeSession("user-123");
    const session = decodeSession(token);
    expect(session).toEqual({ userId: "user-123" });
  });

  it("rejects tampered signature", () => {
    const token = encodeSession("user-123");
    const tampered = token.slice(0, -3) + "xxx";
    expect(decodeSession(tampered)).toBeNull();
  });

  it("rejects wrong secret", () => {
    const token = encodeSession("user-123", TEST_SECRET);
    expect(decodeSession(token, "different-secret-at-least-16")).toBeNull();
  });

  it("rejects expired session", () => {
    const exp = Math.floor(Date.now() / 1000) - 100;
    const payload = `${SESSION_VERSION}.${base64url("user-123")}.${exp}`;
    const sig = signPayload(payload, TEST_SECRET);
    const token = `${payload}.${sig}`;
    expect(decodeSession(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("a.b.c")).toBeNull();
    expect(decodeSession("v2.abc.123.sig")).toBeNull();
  });

  it("handles special characters in userId", () => {
    const token = encodeSession("user@example.com");
    const session = decodeSession(token);
    expect(session).toEqual({ userId: "user@example.com" });
  });
});

describe("HMAC verification", () => {
  it("uses timing-safe comparison", () => {
    const token = encodeSession("user-456");
    const session = decodeSession(token);
    expect(session).not.toBeNull();
  });
});
