import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email-sender";
import { verifySameOrigin } from "@/lib/request-security";
import { z } from "zod";

const InquiryBody = z.object({
  tier: z.enum(["SMALL_BUSINESS", "MID_SIZE"]),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  companyName: z.string().max(200).default(""),
  employeeCount: z.string().max(50).default(""),
  message: z.string().max(2000).default(""),
});

export async function POST(req: Request) {
  const sameOrigin = verifySameOrigin(req);
  if (!sameOrigin.ok) return sameOrigin.response;

  const body = await req.json().catch(() => null);
  const parsed = InquiryBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const inquiry = await prisma.planInquiry.create({
    data: {
      tier: data.tier,
      name: data.name,
      email: data.email,
      companyName: data.companyName,
      employeeCount: data.employeeCount,
      message: data.message,
    },
  });

  // Send notification email to sales
  const salesEmail = process.env.SALES_NOTIFICATION_EMAIL?.trim();
  if (salesEmail && await isEmailConfigured()) {
    const tierLabel = data.tier === "SMALL_BUSINESS" ? "Small Business" : "Mid-size";
    await sendEmail({
      to: salesEmail,
      subject: `New ${tierLabel} plan inquiry from ${data.name}`,
      body: [
        `New plan inquiry received:`,
        ``,
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Company: ${data.companyName || "(not provided)"}`,
        `Employee Count: ${data.employeeCount || "(not provided)"}`,
        `Tier: ${tierLabel}`,
        ``,
        `Message:`,
        data.message || "(no message)",
      ].join("\n"),
      html: [
        `<h2>New ${tierLabel} Plan Inquiry</h2>`,
        `<table style="border-collapse:collapse;font-family:sans-serif;">`,
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${data.name}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company</td><td>${data.companyName || "<em>not provided</em>"}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Employees</td><td>${data.employeeCount || "<em>not provided</em>"}</td></tr>`,
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Tier</td><td>${tierLabel}</td></tr>`,
        `</table>`,
        data.message ? `<h3>Message</h3><p>${data.message}</p>` : "",
      ].join("\n"),
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, inquiryId: inquiry.id });
}
