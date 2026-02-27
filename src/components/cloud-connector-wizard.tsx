"use client";

import { useEffect, useMemo, useState } from "react";
import type { CloudConnectorView, SupportedProvider } from "@/lib/connectors-store";

type ConnectorMap = Record<SupportedProvider, CloudConnectorView>;
type OllamaRuntimeDetails = {
  baseUrl: string;
  cliInstalled: boolean;
  cliVersion: string | null;
  serviceReachable: boolean;
  installedModels: string[];
  missing: Array<"cli" | "service" | "models" | "selected_model">;
  canUseLocalModels: boolean;
};
type RuntimeStatus = {
  providers?: Record<
    "OPENAI" | "OLLAMA",
    { ready: boolean; message: string; details?: OllamaRuntimeDetails }
  >;
};

async function saveConnector(payload: {
  provider: SupportedProvider;
  mode?: "BYOK";
  apiKey?: string;
}) {
  const res = await fetch("/api/connectors/cloud", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; connector?: CloudConnectorView };
  if (!res.ok || !data.connector) throw new Error(data.error || "Failed to save connector");
  return data.connector;
}

async function clearConnector(provider: SupportedProvider) {
  const res = await fetch(`/api/connectors/cloud?provider=${provider}`, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as { error?: string; connector?: CloudConnectorView };
  if (!res.ok || !data.connector) throw new Error(data.error || "Failed to clear connector");
  return data.connector;
}

function providerLabel(provider: SupportedProvider) {
  if (provider === "OPENAI") return "OpenAI";
  if (provider === "ANTHROPIC") return "Anthropic";
  return "Google (Gemini)";
}

export function CloudConnectorWizard({ initial }: { initial: CloudConnectorView[] | CloudConnectorView }) {
  const normalizedInitial = useMemo(() => (Array.isArray(initial) ? initial : [initial]), [initial]);
  const initialMap = useMemo(
    () =>
      Object.fromEntries(normalizedInitial.map((c) => [c.provider, c])) as Partial<ConnectorMap>,
    [normalizedInitial],
  );
  const [connectors, setConnectors] = useState<ConnectorMap>({
    OPENAI:
      (initialMap.OPENAI as CloudConnectorView | undefined) ?? {
        provider: "OPENAI",
        mode: "BYOK",
        status: "PENDING",
        label: null,
        keyLast4: null,
        managedAvailable: false,
        hasStoredKey: false,
        updatedAt: null,
        monthlyRequestLimit: 500,
        monthlyRequestCount: 0,
        monthlyUsdLimit: 10,
        monthlyEstimatedUsd: 0,
        usageMonthKey: null,
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestMessage: null,
      },
    ANTHROPIC:
      (initialMap.ANTHROPIC as CloudConnectorView | undefined) ?? {
        provider: "ANTHROPIC",
        mode: "BYOK",
        status: "PENDING",
        label: null,
        keyLast4: null,
        managedAvailable: false,
        hasStoredKey: false,
        updatedAt: null,
        monthlyRequestLimit: 500,
        monthlyRequestCount: 0,
        monthlyUsdLimit: 10,
        monthlyEstimatedUsd: 0,
        usageMonthKey: null,
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestMessage: null,
      },
    GOOGLE:
      (initialMap.GOOGLE as CloudConnectorView | undefined) ?? {
        provider: "GOOGLE",
        mode: "BYOK",
        status: "PENDING",
        label: null,
        keyLast4: null,
        managedAvailable: false,
        hasStoredKey: false,
        updatedAt: null,
        monthlyRequestLimit: 500,
        monthlyRequestCount: 0,
        monthlyUsdLimit: 10,
        monthlyEstimatedUsd: 0,
        usageMonthKey: null,
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestMessage: null,
      },
  });
  const [provider, setProvider] = useState<SupportedProvider>("OPENAI");
  const [setupTab, setSetupTab] = useState<"LOCAL" | "CLOUD">("CLOUD");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus["providers"] | null>(null);
  const [localModelName, setLocalModelName] = useState("glm-5");
  const [localPullBusy, setLocalPullBusy] = useState(false);
  const [localPullOutput, setLocalPullOutput] = useState<string | null>(null);
  const [ollamaChecking, setOllamaChecking] = useState(false);
  const current = connectors[provider];
  const ollamaDetails = runtimeStatus?.OLLAMA?.details;

  function replaceConnector(next: CloudConnectorView) {
    setConnectors((curr) => ({ ...curr, [next.provider]: next }));
  }

  function onProviderChange(next: SupportedProvider) {
    setProvider(next);
    setApiKey("");
    setStatus(null);
    setError(null);
  }

  async function connectByok() {
    setBusy(true);
    setError(null);
    try {
      const next = await saveConnector({ provider, mode: "BYOK", apiKey });
      replaceConnector(next);
      setApiKey("");
      setStatus(`Saved ${providerLabel(provider)} key ••••${next.keyLast4 ?? ""}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save key");
    } finally {
      setBusy(false);
    }
  }

  async function removeByok() {
    const confirmed = window.confirm(
      `Remove the saved ${providerLabel(provider)} key from Zygenic? You can add it again later.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const next = await clearConnector(provider);
      replaceConnector(next);
      setStatus(`Removed ${providerLabel(provider)} BYOK key`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove key");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/connectors/cloud/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; connector?: CloudConnectorView };
      if (data.connector) replaceConnector(data.connector);
      if (data.ok) {
        setStatus(`${providerLabel(provider)}: ${data.message ?? "Connection successful"}`);
      } else {
        setError(`${providerLabel(provider)}: ${data.message ?? "Connection failed"}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function refreshRuntimeStatus() {
    const res = await fetch("/api/models/runtime-status", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as RuntimeStatus;
    if (!res.ok || !data.providers) throw new Error("Failed to load model runtime status");
    setRuntimeStatus(data.providers);
    return data.providers;
  }

  async function pullLocalModel() {
    const modelName = localModelName.trim();
    if (!modelName) return;
    setLocalPullBusy(true);
    setError(null);
    setStatus(null);
    setLocalPullOutput(null);
    try {
      const res = await fetch("/api/models/ollama/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        output?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to pull local model");
      setStatus(data.message || `Pulled "${modelName}"`);
      if (typeof data.output === "string" && data.output.trim()) setLocalPullOutput(data.output);
      await refreshRuntimeStatus().catch(() => null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to pull local model");
    } finally {
      setLocalPullBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/models/runtime-status", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as RuntimeStatus;
        if (!cancelled && data.providers) setRuntimeStatus(data.providers);
      } catch {
        if (!cancelled) setRuntimeStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="wf-panel rounded-3xl p-5">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] wf-muted">Model setup</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Connect local or cloud models</h2>
        <p className="mt-1 text-sm wf-muted">
          Start with a cloud key, or use Ollama for local open-source models.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ["CLOUD", "Cloud providers"],
          ["LOCAL", "Local open-source (Ollama)"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSetupTab(id)}
            className={`rounded-full border px-4 py-2 text-sm ${setupTab === id ? "border-teal-700 bg-teal-50 text-teal-900" : "border-[var(--border)] bg-white/80"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {setupTab === "LOCAL" ? (
        <div className="mt-4">
          <div className="wf-soft rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">Local open-source models (Ollama)</div>
                <div className="mt-1 text-sm wf-muted">Private, fast onboarding, and no cloud key required.</div>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] ${
                  runtimeStatus?.OLLAMA?.ready ? "bg-emerald-100 text-emerald-900" : "bg-orange-100 text-orange-900"
                }`}
              >
                {runtimeStatus?.OLLAMA?.ready ? "Ready" : "Setup needed"}
              </span>
            </div>
            {!ollamaDetails?.cliInstalled ? (
              <div className="mt-3 grid gap-2 text-sm">
                <div className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2">
                  1. Install Ollama on this machine.
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href="https://ollama.com" target="_blank" rel="noreferrer" className="wf-btn-info px-3 py-1.5 text-xs">
                      Open Ollama homepage
                    </a>
                    <button
                      type="button"
                      disabled={ollamaChecking}
                      onClick={async () => {
                        setOllamaChecking(true);
                        try { await refreshRuntimeStatus(); } catch { /* ignore */ } finally { setOllamaChecking(false); }
                      }}
                      className="wf-btn px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {ollamaChecking ? "Checking…" : "Already installed? Test connection"}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2">
                  2. Start Ollama and pull a model (example: <code>ollama pull llama3.1:8b</code>)
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2">
                  3. All downloaded models from Ollama are available for agentic workflows.
                </div>
              </div>
            ) : null}
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-white/80 p-3">
              <div className="text-sm font-medium">Pull a local model in Zygenic</div>
              <div className="mt-1 text-xs wf-muted">
                Use any Ollama tag, including <code>glm-5</code>.
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {["glm-5", "glm-4.7", "llama3.1:8b", "qwen2.5:14b"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setLocalModelName(suggestion)}
                    className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={localModelName}
                  onChange={(e) => setLocalModelName(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
                  placeholder="Model name (e.g. glm-4.7)"
                />
                <button
                  type="button"
                  onClick={pullLocalModel}
                  disabled={localPullBusy || !localModelName.trim()}
                  className="wf-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {localPullBusy ? "Pulling..." : "Pull model"}
                </button>
              </div>
              {localPullOutput ? (
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.6)] p-2 text-[11px] whitespace-pre-wrap">
                  {localPullOutput}
                </pre>
              ) : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  ollamaDetails?.cliInstalled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"
                }`}
              >
                <div className="font-medium">Ollama installed</div>
                <div className="mt-1">{ollamaDetails?.cliInstalled ? `Yes${ollamaDetails.cliVersion ? ` (${ollamaDetails.cliVersion})` : ""}` : "Missing"}</div>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  ollamaDetails?.serviceReachable ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"
                }`}
              >
                <div className="font-medium">Ollama running</div>
                <div className="mt-1">
                  {ollamaDetails?.serviceReachable ? "Reachable" : ollamaDetails?.baseUrl ? `Not reachable (${ollamaDetails.baseUrl})` : "Unknown"}
                </div>
              </div>
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  (ollamaDetails?.installedModels.length ?? 0) > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"
                }`}
              >
                <div className="font-medium">Local models</div>
                <div className="mt-1">{ollamaDetails ? `${ollamaDetails.installedModels.length} installed` : "Unknown"}</div>
              </div>
            </div>
            {runtimeStatus?.OLLAMA ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                  runtimeStatus.OLLAMA.ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-orange-200 bg-orange-50 text-orange-900"
                }`}
              >
                {runtimeStatus.OLLAMA.message}
              </div>
            ) : null}
            {ollamaDetails?.missing?.length ? (
              <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                Missing for local models: {ollamaDetails.missing.join(", ")}
              </div>
            ) : null}
            {ollamaDetails?.installedModels.length ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-white/80 p-3">
                <div className="text-xs uppercase tracking-[0.12em] wf-muted">Installed local models</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ollamaDetails.installedModels.map((name) => (
                    <span key={name} className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {setupTab === "CLOUD" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="wf-soft rounded-2xl p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] wf-muted">Provider</div>
            <div className="grid gap-2">
              {(["OPENAI", "ANTHROPIC", "GOOGLE"] as SupportedProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onProviderChange(p)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${provider === p ? "border-blue-700 bg-blue-50 text-blue-900" : "border-[var(--border)] bg-white/80"}`}
                >
                  {providerLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="wf-soft rounded-2xl p-4">
          <div className="space-y-4">
            <div>
              <div className="font-medium">Cloud key setup (advanced fallback)</div>
              <div className="mt-1 text-sm wf-muted">
                Use only if you want a cloud provider. We do not ask for account passwords; paste a key once.
              </div>
            </div>
            <div className="grid gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-white/80 p-3 text-sm">
                1. Choose a provider and open its key page in a new tab
                <div className="mt-2">
                  <a
                    href={
                      provider === "OPENAI"
                        ? "https://platform.openai.com/api-keys"
                        : provider === "ANTHROPIC"
                          ? "https://console.anthropic.com/settings/keys"
                          : "https://aistudio.google.com/app/apikey"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="wf-btn-info px-3 py-1.5 text-xs"
                  >
                    Open {providerLabel(provider)} keys page
                  </a>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-white/80 p-3 text-sm">
                2. Create a key and paste it below (stored encrypted)
              </div>
            </div>
            <input
              key={`cloud-key-${provider}`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm outline-none"
              placeholder={`Paste ${providerLabel(provider)} key`}
              type="password"
              autoComplete="new-password"
              name={`connector-key-${provider.toLowerCase()}`}
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={connectByok} disabled={busy || !apiKey.trim()} className="wf-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60">
                {busy ? "Saving..." : "Save cloud key"}
              </button>
              {current.hasStoredKey ? (
                <>
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={testing || busy}
                    className="wf-btn px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {testing ? "Testing…" : "Test connection"}
                  </button>
                  <button type="button" onClick={removeByok} disabled={busy} className="wf-btn-muted px-4 py-2 text-sm disabled:opacity-60">
                    Remove key
                  </button>
                </>
              ) : null}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="wf-muted">Stored key</span>
                <span className="font-medium">{current.keyLast4 ? `••••${current.keyLast4}` : "Not stored"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="wf-muted">Status</span>
                <span className={`font-medium ${current.hasStoredKey ? "text-emerald-300" : ""}`}>
                  {current.hasStoredKey ? `${providerLabel(provider)} connected` : "No key saved"}
                </span>
              </div>
              {current.lastTestStatus ? (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="wf-muted">Last test</span>
                  <span className={`font-medium text-xs ${current.lastTestStatus === "PASSED" ? "text-emerald-300" : "text-rose-300"}`}>
                    {current.lastTestStatus === "PASSED" ? "Passed" : "Failed"}
                    {current.lastTestedAt ? ` · ${new Date(current.lastTestedAt).toLocaleString()}` : ""}
                  </span>
                </div>
              ) : null}
              {current.lastTestMessage && current.lastTestStatus !== "PASSED" ? (
                <div className="mt-1 text-xs text-rose-300/80">{current.lastTestMessage}</div>
              ) : null}
              {current.hasStoredKey ? (
                <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-200">
                  Connected with a saved encrypted key. You can remove it anytime.
                </div>
              ) : null}
            </div>
            {provider !== "OPENAI" ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                Saved for future use. The advisor can already use Ollama locally, and OpenAI is available as a cloud route.
              </div>
            ) : null}
          </div>
        </div>
        </div>
      ) : null}

      {status ? <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}
    </section>
  );
}
