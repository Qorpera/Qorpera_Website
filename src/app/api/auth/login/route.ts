import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";
import { LoginBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;
  const json = await req.json().catch(() => null);
  const parsed = LoginBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
