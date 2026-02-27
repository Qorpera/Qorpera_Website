import { describe, it, expect } from "vitest";
import { vi } from "vitest";

vi.stubEnv("APP_SECRET", "test-secret-long-enough-for-hmac");

import { encode2faPending, decode2faPending } from "@/lib/session-codec";

describe("encode2faPending / decode2faPending", () => {
  it("round-trips a userId", async () => {
    const token = await encode2faPending("user-abc");
    const result = await decode2faPending(token);
    expect(result).toEqual({ userId: "user-abc" });
  });

  it("rejects tampered signature", async () => {
    const token = await encode2faPending("user-abc");
    const tampered = token.slice(0, -3) + "xxx";
    expect(await decode2faPending(tampered)).toBeNull();
  });

  it("rejects wrong secret", async () => {
    const token = await encode2faPending("user-abc", "secret-one-long-enough");
    expect(await decode2faPending(token, "secret-two-long-enough")).toBeNull();
  });

  it("rejects expired token", async () => {
    const originalNow = Date.now;
    // Encode 6 minutes ago (TTL is 5 min)
    Date.now = () => originalNow() - 6 * 60 * 1000;
    const token = await encode2faPending("user-abc");
    Date.now = originalNow;
    expect(await decode2faPending(token)).toBeNull();
  });

  it("rejects a full session token", async () => {
    // Session tokens start with v2. not 2fa.
    const { encodeSession } = await import("@/lib/session-codec");
    const sessionToken = await encodeSession("user-abc");
    expect(await decode2faPending(sessionToken)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await decode2faPending("")).toBeNull();
    expect(await decode2faPending("a.b.c")).toBeNull();
    expect(await decode2faPending("notvalid")).toBeNull();
  });
});
