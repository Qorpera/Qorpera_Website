import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { email, token, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetToken || user.resetToken !== token) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  if (!user.resetTokenExp || user.resetTokenExp < new Date()) {
    return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExp: null,
      sessionRevokedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
