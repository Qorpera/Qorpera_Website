type OpenAiModelRecord = {
  id?: string;
  supported_endpoints?: string[];
  endpoints?: string[];
  capabilities?: Record<string, unknown>;
};

function looksLikeTextGenerationModel(id: string) {
  return /^(gpt|o\d|o3|o4|omni)/i.test(id);
}

function isClearlyNonTextModel(id: string) {
  return (
    /^(text-embedding|embedding|whisper|tts-|gpt-image|dall-e|omni-moderation|moderation|rerank|search)/i.test(id) ||
    /(?:-audio-|audio-preview|transcribe|speech)/i.test(id) ||
    id.includes("ft:")
  );
}

function supportsTextResponses(model: OpenAiModelRecord) {
  const endpointHints = [
    ...(Array.isArray(model.supported_endpoints) ? model.supported_endpoints : []),
    ...(Array.isArray(model.endpoints) ? model.endpoints : []),
  ]
    .map((v) => String(v).toLowerCase());

  if (endpointHints.length > 0) {
    return endpointHints.some((v) => v.includes("responses") || v.includes("chat"));
  }

  const capabilities = model.capabilities;
  if (capabilities && typeof capabilities === "object") {
    const text =
      capabilities["text"] ??
      capabilities["response"] ??
      capabilities["responses"] ??
      capabilities["chat_completions"];
    if (typeof text === "boolean") return text;
  }

  return true;
}

export function filterUsableOpenAiModels(models: OpenAiModelRecord[]) {
  return models
    .map((m) => ({ ...m, id: typeof m.id === "string" ? m.id : "" }))
    .filter((m) => m.id)
    .filter((m) => looksLikeTextGenerationModel(m.id))
    .filter((m) => !isClearlyNonTextModel(m.id))
    .filter((m) => supportsTextResponses(m))
    .map((m) => m.id)
    .sort((a, b) => a.localeCompare(b));
}

export async function listUsableOpenAiModelsForApiKey(apiKey: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { data?: OpenAiModelRecord[] } | null;
    const ids = filterUsableOpenAiModels(Array.isArray(data?.data) ? data!.data! : []);
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

