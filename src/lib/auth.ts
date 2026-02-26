import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import {
  encodeSession,
  decodeSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
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
    if (process.env.NODE_ENV !== "production" && !raw.includes(".")) return { userId: raw };
    return null;
  }

  // Check if sessions were revoked (e.g. password reset, logout-everywhere)
  if (decoded.issuedAt) {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { sessionRevokedAt: true },
    });
    if (user?.sessionRevokedAt) {
      const revokedEpoch = Math.floor(user.sessionRevokedAt.getTime() / 1000);
      if (decoded.issuedAt < revokedEpoch) return null;
    }
  }

  return { userId: decoded.userId };
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.userId;
}
