import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock process.env for the session-codec module
vi.stubEnv("APP_SECRET", "test-secret-long-enough-for-hmac");

import { encodeSession, decodeSession, getSessionSecret } from "@/lib/session-codec";

describe("session-codec", () => {
  describe("getSessionSecret", () => {
    it("returns APP_SECRET when set", () => {
      const secret = getSessionSecret();
      expect(secret).toBe("test-secret-long-enough-for-hmac");
    });
  });

  describe("encodeSession / decodeSession round-trip", () => {
    it("round-trips a userId", async () => {
      const token = await encodeSession("user-123");
      const session = await decodeSession(token);
      expect(session).toEqual({ userId: "user-123" });
    });

    it("handles UUID userId", async () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const token = await encodeSession(id);
      const session = await decodeSession(token);
      expect(session).toEqual({ userId: id });
    });

    it("handles email-like userId", async () => {
      const token = await encodeSession("user@example.com");
      const session = await decodeSession(token);
      expect(session).toEqual({ userId: "user@example.com" });
    });
  });

  describe("signature verification", () => {
    it("rejects tampered signature", async () => {
      const token = await encodeSession("user-123");
      const tampered = token.slice(0, -3) + "xxx";
      const session = await decodeSession(tampered);
      expect(session).toBeNull();
    });

    it("rejects wrong secret", async () => {
      const token = await encodeSession("user-123", "secret-one-long-enough");
      const session = await decodeSession(token, "secret-two-long-enough");
      expect(session).toBeNull();
    });
  });

  describe("expiry", () => {
    it("rejects expired token", async () => {
      // Manually create an expired token by manipulating Date.now
      const originalNow = Date.now;
      // Set time to 31 days ago for encoding
      Date.now = () => originalNow() - 31 * 24 * 60 * 60 * 1000;
      const token = await encodeSession("user-123");
      // Restore time for decoding
      Date.now = originalNow;
      const session = await decodeSession(token);
      expect(session).toBeNull();
    });
  });

  describe("malformed tokens", () => {
    it("rejects empty string", async () => {
      expect(await decodeSession("")).toBeNull();
    });

    it("rejects too few parts", async () => {
      expect(await decodeSession("a.b.c")).toBeNull();
    });

    it("rejects wrong version", async () => {
      expect(await decodeSession("v2.abc.123.sig")).toBeNull();
    });

    it("rejects too many parts", async () => {
      expect(await decodeSession("v1.a.b.c.d")).toBeNull();
    });
  });
});
