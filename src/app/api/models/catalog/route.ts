import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProviderApiKeyRuntime } from "@/lib/connectors-store";
import { getAvailableModelCatalog } from "@/lib/model-routing-store";
import { listUsableOpenAiModelsForApiKey } from "@/lib/openai-model-catalog";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fallback = getAvailableModelCatalog();
  const openAiRuntime = await getProviderApiKeyRuntime(userId, "OPENAI");
  const openAiModels = openAiRuntime.apiKey ? await listUsableOpenAiModelsForApiKey(openAiRuntime.apiKey) : null;

  return NextResponse.json({
    catalog: {
      OPENAI: openAiModels ?? fallback.OPENAI,
      ANTHROPIC: fallback.ANTHROPIC,
      GOOGLE: fallback.GOOGLE,
    },
  });
}
