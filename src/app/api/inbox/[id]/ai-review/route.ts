import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInboxItems, applyInboxAction } from "@/lib/inbox-store";
import { createBusinessLog } from "@/lib/business-logs-store";
import { getModelRoute } from "@/lib/model-routing-store";
import { getProviderApiKeyRuntime } from "@/lib/connectors-store";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

function buildPrompt(item: {
  summary: string;
  impact: string;
  type: string;
  owner: string;
  department: string;
  state?: string;
}) {
  return [
    "You are Qorpera's AI reviewer.",
    "Review the item and produce a practical recommendation for the business owner.",
    "Be concise and decisive.",
    "Return plain text with this format:",
    "Recommendation: <Approve | Open workspace | Terminate job | Ask agent>",
    "Why: <1-3 bullets>",
    "Next step: <one sentence>",
    "",
    `Type: ${item.type}`,
    `Owner: ${item.owner}`,
    `Department: ${item.department}`,
    `Current state: ${item.state ?? "open"}`,
    `Summary: ${item.summary}`,
    `Impact: ${item.impact}`,
  ].join("\n");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sameOrigin = verifySameOrigin(_request);
  if (!sameOrigin.ok) return sameOrigin.response;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const items = await getInboxItems(session.userId);
  const item = items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: "Inbox item not found" }, { status: 404 });

  const assistantRoute = await getModelRoute(session.userId, "ASSISTANT");
  const runtime = await getProviderApiKeyRuntime(session.userId, "OPENAI");
  if (!runtime.apiKey) {
    return NextResponse.json({ error: "Managed OpenAI key is not configured." }, { status: 503 });
  }

  const model = assistantRoute.provider === "OPENAI" ? assistantRoute.modelName : (process.env.OPENAI_ADVISOR_MODEL ?? "gpt-4.1-mini");
  const prompt = buildPrompt(item);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${runtime.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      max_output_tokens: 512,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return NextResponse.json(
      { error: `AI review failed: ${err?.error?.message ?? response.status}` },
      { status: 400 },
    );
  }

  const data = (await response.json().catch(() => null)) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  } | null;

  const reviewText = (
    data?.output_text ??
    data?.output?.flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("\n") ??
    ""
  ).trim();

  if (!reviewText) {
    return NextResponse.json({ error: "AI reviewer returned an empty review" }, { status: 400 });
  }

  await createBusinessLog(session.userId, {
    title: `AI review: ${item.summary}`.slice(0, 240),
    category: "OPERATIONS",
    source: "AGENT",
    authorLabel: `AI reviewer (${model})`,
    body: [
      "AI Review",
      "",
      `Item: ${item.summary}`,
      `Impact: ${item.impact}`,
      "",
      reviewText,
    ].join("\n"),
    relatedRef: `INBOX:${item.id}`,
  });

  const updated = await applyInboxAction(session.userId, item.id, "ask_agent");

  return NextResponse.json({
    ok: true,
    review: reviewText,
    model,
    item: updated,
  });
}
