import { spawn } from "node:child_process";

export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

type OllamaTagRow = {
  name?: string;
  model?: string;
};

type OllamaTagsResponse = {
  models?: OllamaTagRow[];
  tags?: OllamaTagRow[];
};

type OllamaErrorResponse = {
  error?: string;
  message?: string;
};

export function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function listOllamaModels(options?: { baseUrl?: string; timeoutMs?: number }) {
  const baseUrl = (options?.baseUrl ?? getOllamaBaseUrl()).replace(/\/$/, "");
  try {
    const res = await withTimeout(
      (signal) =>
        fetch(`${baseUrl}/api/tags`, {
          method: "GET",
          signal,
        }),
      options?.timeoutMs ?? 2500,
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as OllamaTagsResponse | null;
    const rows = data?.models ?? data?.tags ?? [];
    const names = rows
      .map((row) => {
        if (typeof row.name === "string" && row.name.trim()) return row.name.trim();
        if (typeof row.model === "string" && row.model.trim()) return row.model.trim();
        return null;
      })
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  } catch {
    return null;
  }
}

export async function checkOllamaRuntime(options?: { baseUrl?: string; timeoutMs?: number }) {
  const models = await listOllamaModels({
    baseUrl: options?.baseUrl,
    timeoutMs: options?.timeoutMs ?? 1500,
  });
  return {
    reachable: models !== null,
    models: models ?? [],
  };
}

type CliCheckResult = {
  installed: boolean;
  version: string | null;
};

function runOllamaCommand(args: string[], options?: { timeoutMs?: number }) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    let timedOut = false;
    let child: ReturnType<typeof spawn> | null = null;

    const finish = (result: { code: number | null; stdout: string; stderr: string; timedOut: boolean }) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    try {
      child = spawn("ollama", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      finish({ code: null, stdout, stderr, timedOut: false });
      return;
    }

    const cap = (s: string, chunk: string) => (s.length > 16000 ? s : `${s}${chunk}`.slice(0, 16000));
    child.stdout!.on("data", (chunk) => {
      stdout = cap(stdout, String(chunk));
    });
    child.stderr!.on("data", (chunk) => {
      stderr = cap(stderr, String(chunk));
    });
    child.on("error", () => finish({ code: null, stdout, stderr, timedOut: false }));
    child.on("close", (code) => finish({ code, stdout, stderr, timedOut }));

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        child?.kill("SIGTERM");
      } catch {}
    }, options?.timeoutMs ?? 5000);
    child.on("close", () => clearTimeout(timeout));
  });
}

export async function checkOllamaCliInstalled(): Promise<CliCheckResult> {
  const result = await runOllamaCommand(["--version"], { timeoutMs: 2500 });
  const combined = `${result.stdout}\n${result.stderr}`.trim();
  if (result.code !== 0 && !combined) return { installed: false, version: null };
  const versionMatch = combined.match(/version\s+([^\s]+)/i);
  return {
    installed: true,
    version: versionMatch?.[1] ?? null,
  };
}

export type OllamaDiagnostics = {
  baseUrl: string;
  cliInstalled: boolean;
  cliVersion: string | null;
  serviceReachable: boolean;
  installedModels: string[];
  missing: Array<"cli" | "service" | "models" | "selected_model">;
  selectedModelInstalled: boolean | null;
  canUseLocalModels: boolean;
};

export async function getOllamaDiagnostics(options?: { baseUrl?: string; selectedModel?: string | null; timeoutMs?: number }) {
  const baseUrl = (options?.baseUrl ?? getOllamaBaseUrl()).replace(/\/$/, "");
  const [cli, runtime] = await Promise.all([
    checkOllamaCliInstalled(),
    checkOllamaRuntime({ baseUrl, timeoutMs: options?.timeoutMs }),
  ]);

  const selectedModel = options?.selectedModel?.trim() || null;
  const selectedModelInstalled = selectedModel ? runtime.models.includes(selectedModel) : null;
  const missing: OllamaDiagnostics["missing"] = [];
  if (!cli.installed) missing.push("cli");
  if (!runtime.reachable) missing.push("service");
  if (runtime.reachable && runtime.models.length === 0) missing.push("models");
  if (selectedModel && runtime.reachable && runtime.models.length > 0 && !selectedModelInstalled) missing.push("selected_model");

  return {
    baseUrl,
    cliInstalled: cli.installed,
    cliVersion: cli.version,
    serviceReachable: runtime.reachable,
    installedModels: runtime.models,
    missing,
    selectedModelInstalled,
    canUseLocalModels: cli.installed && runtime.reachable && runtime.models.length > 0,
  } satisfies OllamaDiagnostics;
}

export async function readOllamaError(response: Response) {
  const data = (await response.json().catch(() => null)) as OllamaErrorResponse | null;
  const msg = data?.error ?? data?.message;
  return typeof msg === "string" && msg.trim()
    ? msg.trim()
    : `Ollama request failed (${response.status})`;
}

export async function postOllamaJson<T>(
  path: "/api/chat" | "/api/generate",
  body: unknown,
  options?: { baseUrl?: string; timeoutMs?: number },
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const baseUrl = (options?.baseUrl ?? getOllamaBaseUrl()).replace(/\/$/, "");
  try {
    const res = await withTimeout(
      (signal) =>
        fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        }),
      options?.timeoutMs ?? 60000,
    );
    if (!res.ok) {
      return { ok: false, status: res.status, error: await readOllamaError(res) };
    }
    const data = (await res.json().catch(() => null)) as T | null;
    if (!data) return { ok: false, status: 502, error: "Invalid Ollama JSON response" };
    return { ok: true, data };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, status: 504, error: "Ollama request timed out" };
    }
    return { ok: false, status: 503, error: "Could not reach Ollama" };
  }
}

export async function pullOllamaModel(modelName: string, options?: { timeoutMs?: number }) {
  const result = await runOllamaCommand(["pull", modelName], { timeoutMs: options?.timeoutMs ?? 10 * 60 * 1000 });
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n").slice(0, 12000);
  if (result.timedOut) {
    return { ok: false as const, error: `Ollama pull timed out for "${modelName}"`, output };
  }
  if (result.code !== 0) {
    return { ok: false as const, error: `Ollama pull failed for "${modelName}"`, output };
  }
  return { ok: true as const, output };
}
