import { describe, it, expect } from "vitest";
import { generateTotpSecret, verifyTotpCode, getTotpOtpAuthUrl } from "@/lib/totp";
import { generateSync } from "otplib";

describe("generateTotpSecret", () => {
  it("returns a non-empty base32 string", () => {
    const secret = generateTotpSecret();
    expect(secret).toBeTruthy();
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThanOrEqual(16);
    // base32 characters only
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("returns a different secret each call", () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});

describe("verifyTotpCode", () => {
  it("returns true for a valid current code", () => {
    const secret = generateTotpSecret();
    const token = generateSync({ secret, label: "test", digits: 6, period: 30, algorithm: "sha1" }) as string;
    expect(verifyTotpCode(token, secret)).toBe(true);
  });

  it("returns false for a wrong code", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("000000", secret)).toBe(false);
  });

  it("returns false for a code from a different secret", () => {
    const secret1 = generateTotpSecret();
    const secret2 = generateTotpSecret();
    const token = generateSync({ secret: secret1, label: "test", digits: 6, period: 30, algorithm: "sha1" }) as string;
    expect(verifyTotpCode(token, secret2)).toBe(false);
  });

  it("returns false for gibberish", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("notacode", secret)).toBe(false);
    expect(verifyTotpCode("", secret)).toBe(false);
  });
});

describe("getTotpOtpAuthUrl", () => {
  it("returns a valid otpauth URI", () => {
    const secret = generateTotpSecret();
    const url = getTotpOtpAuthUrl("user@example.com", secret);
    expect(url).toMatch(/^otpauth:\/\/totp\//);
    expect(url).toContain("Zygenic");
    expect(url).toContain(secret);
  });
});
