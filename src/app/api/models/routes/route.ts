import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getProviderApiKeyRuntime } from "@/lib/connectors-store";
import {
  getAvailableModelCatalog,
  getModelRoutes,
  setModelRoute,
  type ModelRouteProvider,
  type ModelRouteTarget,
} from "@/lib/model-routing-store";
import { listOllamaModels } from "@/lib/ollama";
import { listUsableOpenAiModelsForApiKey } from "@/lib/openai-model-catalog";
import { SetModelRouteBody } from "@/lib/schemas";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const routes = await getModelRoutes(userId);
  return NextResponse.json({ routes, catalog: getAvailableModelCatalog() });
}

export async function POST(request: Request) {
  const sameOrigin = verifySameOrigin(request);
  if (!sameOrigin.ok) return sameOrigin.response;
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = SetModelRouteBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const provider: ModelRouteProvider = (parsed.data.provider ?? "OPENAI") as ModelRouteProvider;
  const cleanModelName = (parsed.data.modelName ?? "").trim();
  if (!cleanModelName) return NextResponse.json({ error: "Model name required" }, { status: 400 });

  if (provider === "OLLAMA") {
    const installed = await listOllamaModels();
    if (installed === null) {
      return NextResponse.json(
        { error: "Ollama is not reachable. Start Ollama (`ollama serve`) and try again." },
        { status: 503 },
      );
    }
    if (installed.length === 0) {
      return NextResponse.json(
        { error: "Ollama is running but no models are installed. Pull one first (e.g. `ollama pull llama3.1:8b`)." },
        { status: 400 },
      );
    }
    if (!installed.includes(cleanModelName)) {
      return NextResponse.json(
        {
          error: `Ollama model "${cleanModelName}" is not installed locally. Pull it first or choose one from the list.`,
          installedModels: installed,
        },
        { status: 400 },
      );
    }
  }
  if (provider === "OPENAI") {
    const runtime = await getProviderApiKeyRuntime(userId, "OPENAI");
    if (runtime.apiKey) {
      const usable = await listUsableOpenAiModelsForApiKey(runtime.apiKey);
      if (usable && !usable.includes(cleanModelName)) {
        return NextResponse.json(
          {
            error: `OpenAI model "${cleanModelName}" is not available for your current API key or not supported for text responses in Zygenic.`,
            availableModels: usable,
          },
          { status: 400 },
        );
      }
    }
  }

  if (provider === "ANTHROPIC") {
    const catalog = getAvailableModelCatalog();
    if (!catalog.ANTHROPIC.includes(cleanModelName)) {
      return NextResponse.json(
        { error: `Anthropic model "${cleanModelName}" is not in the supported catalog.`, availableModels: catalog.ANTHROPIC },
        { status: 400 },
      );
    }
  }

  if (provider === "GOOGLE") {
    const catalog = getAvailableModelCatalog();
    if (!catalog.GOOGLE.includes(cleanModelName)) {
      return NextResponse.json(
        { error: `Google AI model "${cleanModelName}" is not in the supported catalog.`, availableModels: catalog.GOOGLE },
        { status: 400 },
      );
    }
  }

  try {
    const route = await setModelRoute(userId, parsed.data.target as ModelRouteTarget, provider, cleanModelName);
    return NextResponse.json({ ok: true, route, catalog: getAvailableModelCatalog() });
  } catch (err) {
    console.error("[models/routes] setModelRoute failed:", err);
    return NextResponse.json({ error: "Failed to save model route. Please try again." }, { status: 500 });
  }
}
