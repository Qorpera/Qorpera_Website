import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { getCloudConnector } from "@/lib/connectors-store";
import { getOllamaDiagnostics } from "@/lib/ollama";

export const runtime = "nodejs";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openai = await getCloudConnector(userId, "OPENAI");
  const openaiReady =
    openai.status === "CONNECTED" &&
    ((openai.mode === "MANAGED" && openai.managedAvailable) || (openai.mode === "BYOK" && openai.hasStoredKey));

  const ollama = await getOllamaDiagnostics({ timeoutMs: 1200 });
  const ollamaReady = ollama.canUseLocalModels;

  return NextResponse.json({
    providers: {
      OPENAI: {
        ready: openaiReady,
        message: openaiReady
          ? "OpenAI is configured."
          : "OpenAI is not ready. Add an OpenAI cloud key in Settings if you want to use cloud advisor models.",
      },
      OLLAMA: {
        ready: ollamaReady,
        message: ollamaReady
          ? `Ollama is ready (${ollama.installedModels.length} model${ollama.installedModels.length === 1 ? "" : "s"} installed).`
          : !ollama.cliInstalled
            ? "Ollama is not installed on this machine."
            : !ollama.serviceReachable
              ? `Ollama is installed but not reachable at ${ollama.baseUrl}. Start it with \`ollama serve\`.`
              : ollama.serviceReachable
                ? "Ollama is running, but no local models are installed yet. Pull one first (e.g. `ollama pull llama3.1:8b`)."
                : "Ollama setup is incomplete.",
        details: {
          baseUrl: ollama.baseUrl,
          cliInstalled: ollama.cliInstalled,
          cliVersion: ollama.cliVersion,
          serviceReachable: ollama.serviceReachable,
          installedModels: ollama.installedModels,
          missing: ollama.missing,
          canUseLocalModels: ollama.canUseLocalModels,
        },
      },
    },
  });
}
