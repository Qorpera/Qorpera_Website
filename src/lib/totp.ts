import { generateSecret as genSecret, generateSync, verifySync, generateURI } from "otplib";
import type { HashAlgorithm } from "otplib";
import QRCode from "qrcode";

const DIGITS = 6;
const PERIOD = 30;
const ALGO: HashAlgorithm = "sha1";

export function generateTotpSecret(): string {
  return genSecret({ length: 20 });
}

export function verifyTotpCode(code: string, secret: string): boolean {
  try {
    const result = verifySync({ token: code, secret, digits: DIGITS, period: PERIOD, algorithm: ALGO });
    return typeof result === "object" ? result.valid : Boolean(result);
  } catch {
    return false;
  }
}

export function getTotpOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: "Qorpera",
    label: email,
    secret,
    digits: DIGITS,
    period: PERIOD,
    algorithm: ALGO,
  });
}

export async function generateTotpQrDataUrl(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    color: { dark: "#14b8a6", light: "#00000000" },
    width: 200,
    margin: 2,
  });
}
