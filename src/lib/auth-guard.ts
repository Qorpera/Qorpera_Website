/**
 * Convenience auth guard for API routes.
 * Wraps getSession() and returns a typed result or null.
 */

import { getSession, type Session } from "@/lib/auth";

export type AuthResult = { userId: string };

/**
 * Require an authenticated user. Returns { userId } or null if not authenticated.
 */
export async function requireUser(): Promise<AuthResult | null> {
  const session: Session | null = await getSession();
  if (!session) return null;
  return { userId: session.userId };
}
