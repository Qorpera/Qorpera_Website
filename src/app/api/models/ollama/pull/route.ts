import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getOllamaDiagnostics, pullOllamaModel } from "@/lib/ollama";
import { verifySameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

type Body = {
  modelName?: string;
};

function isValidOllamaModelName(name: string) {
  return /^[a-zA-Z0-9._:/-]{1,160}$/.test(name);
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

  const body = (await request.json().catch(() => ({}))) as Body;
  const modelName = (body.modelName ?? "").trim();

  if (!modelName) return NextResponse.json({ error: "Model name is required" }, { status: 400 });
  if (!isValidOllamaModelName(modelName)) {
    return NextResponse.json(
      { error: "Invalid model name. Use a valid Ollama model/tag like `llama3.1:8b` or `glm-4.7`." },
      { status: 400 },
    );
  }

  const before = await getOllamaDiagnostics({ selectedModel: modelName, timeoutMs: 1500 });
  if (!before.cliInstalled) {
    return NextResponse.json({ error: "Ollama is not installed on this machine.", diagnostics: before }, { status: 400 });
  }
  if (!before.serviceReachable) {
    return NextResponse.json(
      { error: `Ollama is not running at ${before.baseUrl}. Start it with \`ollama serve\`.`, diagnostics: before },
      { status: 503 },
    );
  }
  if (before.selectedModelInstalled) {
    return NextResponse.json({
      ok: true,
      status: "already-installed",
      modelName,
      diagnostics: before,
      message: `Model "${modelName}" is already installed.`,
    });
  }

  const pull = await pullOllamaModel(modelName);
  const after = await getOllamaDiagnostics({ selectedModel: modelName, timeoutMs: 2500 });

  if (!pull.ok || !after.selectedModelInstalled) {
    return NextResponse.json(
      {
        error: pull.ok ? `Ollama did not report "${modelName}" as installed after pull.` : pull.error,
        output: pull.output,
        diagnostics: after,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "pulled",
    modelName,
    output: pull.output,
    diagnostics: after,
    message: `Pulled "${modelName}" and it is now available for local routing.`,
  });
}
