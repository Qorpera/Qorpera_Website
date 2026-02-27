import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

/**
 * Server-only helper. Throws a Next.js notFound() response for anyone
 * who is not the configured owner. Use in server components and API routes.
 */
export async function requireOwner(): Promise<string> {
  const session = await getSession();
  const ownerId = process.env.OWNER_USER_ID;
  if (!session || !ownerId || session.userId !== ownerId) {
    notFound();
  }
  return session.userId;
}

/**
 * Lightweight check — returns true when the current session is the owner.
 * Safe to call from server components that render conditionally.
 */
export async function isOwner(userId: string): Promise<boolean> {
  const ownerId = process.env.OWNER_USER_ID;
  return Boolean(ownerId && userId === ownerId);
}
