"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { title: string; body: string }> = {
  success: {
    title: "Email verified",
    body: "Your email has been verified. You're all set.",
  },
  already: {
    title: "Already verified",
    body: "This email was already verified.",
  },
  expired: {
    title: "Link expired",
    body: "This verification link has expired. Log in and request a new one from your profile.",
  },
  invalid: {
    title: "Invalid link",
    body: "This verification link is invalid or has already been used.",
  },
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "invalid";
  const msg = MESSAGES[status] || MESSAGES.invalid;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{msg.title}</h1>
      <p className="text-sm text-zinc-400">{msg.body}</p>
      <Link
        className="inline-block rounded-lg bg-white text-zinc-900 font-medium px-4 py-2"
        href="/"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
