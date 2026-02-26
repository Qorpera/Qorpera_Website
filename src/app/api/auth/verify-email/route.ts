import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const Params = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Params.safeParse({
    token: url.searchParams.get("token"),
    email: url.searchParams.get("email"),
  });
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  const { token, email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailVerifyToken || user.emailVerifyToken !== token) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  if (user.emailVerified) {
    return NextResponse.redirect(new URL("/verify-email?status=already", req.url));
  }

  if (user.emailVerifyExp && user.emailVerifyExp < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?status=expired", req.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExp: null },
  });

  return NextResponse.redirect(new URL("/verify-email?status=success", req.url));
}
