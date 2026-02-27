import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  encodeSession,
  decodeSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  encode2faPending,
  decode2faPending,
  TOTP_PENDING_COOKIE,
  TOTP_PENDING_TTL,
} from "@/lib/session-codec";
import { prisma } from "@/lib/db";

export type Session = { userId: string };

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSession(userId: string) {
  const store = await cookies();
  const token = await encodeSession(userId);
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const decoded = await decodeSession(raw);
  if (!decoded) {
    // Allow legacy unsigned cookie values only in local development to avoid locking out existing dev sessions.
    if (process.env.NODE_ENV !== "production" && !raw.includes(".")) {
      const exists = await prisma.user.findUnique({ where: { id: raw }, select: { id: true } });
      if (!exists) return null;
      return { userId: raw };
    }
    return null;
  }

  // Verify user still exists and check if sessions were revoked
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { sessionRevokedAt: true },
  });
  if (!user) return null;
  if (decoded.issuedAt && user.sessionRevokedAt) {
    const revokedEpoch = Math.floor(user.sessionRevokedAt.getTime() / 1000);
    if (decoded.issuedAt < revokedEpoch) return null;
  }

  return { userId: decoded.userId };
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.userId;
}

// ─── 2FA pending cookie ──────────────────────────────────────────────────────

export async function set2faPendingCookie(userId: string) {
  const store = await cookies();
  const token = await encode2faPending(userId);
  store.set(TOTP_PENDING_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOTP_PENDING_TTL,
  });
}

export async function get2faPendingUserId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(TOTP_PENDING_COOKIE)?.value;
  if (!raw) return null;
  const decoded = await decode2faPending(raw);
  return decoded?.userId ?? null;
}

export async function clear2faPendingCookie() {
  const store = await cookies();
  store.delete(TOTP_PENDING_COOKIE);
}
