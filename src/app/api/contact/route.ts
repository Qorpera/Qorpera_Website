import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, company, message } = body as {
      name?: string;
      email?: string;
      company?: string;
      role?: string;
      interest?: string;
      message?: string;
    };

    if (!name || !email || !company || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // For MVP: log the inquiry. In production, this would send an email
    // or write to a CRM via connectors.
    console.log("[Contact Inquiry]", { name, email, company, role: body.role, interest: body.interest, message });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
