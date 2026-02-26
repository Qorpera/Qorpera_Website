import net from "node:net";

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string) {
  const normalized = host.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isUrlAllowedForServerFetch(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { allowed: false, reason: "Only http/https URLs are allowed" };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host) return { allowed: false, reason: "Missing hostname" };
  if (host === "localhost" || host.endsWith(".local")) {
    return { allowed: false, reason: "Local hostnames are blocked" };
  }
  if (host.endsWith(".internal")) {
    return { allowed: false, reason: "Internal hostnames are blocked" };
  }

  if (net.isIP(host) === 4 && isPrivateIpv4(host)) {
    return { allowed: false, reason: "Private IPv4 ranges are blocked" };
  }
  if (net.isIP(host) === 6 && isPrivateIpv6(host)) {
    return { allowed: false, reason: "Private IPv6 ranges are blocked" };
  }

  return { allowed: true as const };
}
