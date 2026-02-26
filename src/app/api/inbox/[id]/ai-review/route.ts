import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInboxItems, applyInboxAction } from "@/lib/inbox-store";
import { createBusinessLog } from "@/lib/business-logs-store";
import { getModelRoute } from "@/lib/model-routing-store";
import { postOllamaJson } from "@/lib/ollama";
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
    "You are a local open-source AI reviewer for Zygenic.",
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
  if (assistantRoute.provider !== "OLLAMA") {
    return NextResponse.json(
      { error: 'AI review requires a local open-source model. Set the Assistant model to "Ollama (local open-source)" first.' },
      { status: 400 },
    );
  }

  const ollama = await postOllamaJson<{ response?: string }>(
    "/api/generate",
    {
      model: assistantRoute.modelName,
      stream: false,
      prompt: buildPrompt(item),
    },
    { timeoutMs: 45000 },
  );

  if (!ollama.ok) {
    return NextResponse.json(
      { error: `AI review failed with local model "${assistantRoute.modelName}": ${ollama.error}` },
      { status: 400 },
    );
  }

  const reviewText = (ollama.data.response ?? "").trim();
  if (!reviewText) {
    return NextResponse.json({ error: "Local model returned an empty review" }, { status: 400 });
  }

  await createBusinessLog(session.userId, {
    title: `AI review: ${item.summary}`.slice(0, 240),
    category: "OPERATIONS",
    source: "AGENT",
    authorLabel: `Local reviewer (${assistantRoute.modelName})`,
    body: [
      "AI Review (local open-source model)",
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
    model: assistantRoute.modelName,
    item: updated,
  });
}
