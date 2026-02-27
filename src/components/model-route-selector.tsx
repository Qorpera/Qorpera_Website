"use client";

import { useEffect, useState } from "react";
import type { ModelRoute, ModelRouteProvider, ModelRouteTarget } from "@/lib/model-routing-store";

type Catalog = Record<ModelRouteProvider, string[]>;
type OllamaRuntimeDetails = {
  baseUrl: string;
  cliInstalled: boolean;
  cliVersion: string | null;
  serviceReachable: boolean;
  installedModels: string[];
  missing: Array<"cli" | "service" | "models" | "selected_model">;
  canUseLocalModels: boolean;
};
type RuntimeStatus = Record<
  ModelRouteProvider,
  { ready: boolean; message: string; details?: OllamaRuntimeDetails }
>;

export function ModelRouteSelector({
  target,
  initial,
  catalog,
  compact = false,
  showRuntimeWarnings = false,
  minimal = false,
  chatTrigger = false,
}: {
  target: ModelRouteTarget;
  initial: ModelRoute;
  catalog: Catalog;
  compact?: boolean;
  showRuntimeWarnings?: boolean;
  minimal?: boolean;
  chatTrigger?: boolean;
}) {
  const [route, setRoute] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [runtimeStatusError, setRuntimeStatusError] = useState<string | null>(null);
  const [availableCatalog, setAvailableCatalog] = useState<Catalog>(catalog);
  const [open, setOpen] = useState(false);

  // Re-fetch catalog on mount and whenever the popover opens (picks up newly pulled models)
  const refreshKey = chatTrigger ? open : false;
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/models/catalog", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { catalog?: Catalog };
        if (!cancelled && data.catalog) setAvailableCatalog(data.catalog);
      } catch {
        if (!cancelled) setAvailableCatalog(catalog);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, refreshKey]);

  useEffect(() => {
    if (!showRuntimeWarnings) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/models/runtime-status", { cache: "no-store" });
        const data = (await res.json()) as { providers?: RuntimeStatus; error?: string };
        if (!res.ok || !data.providers) throw new Error(data.error || "Failed to load runtime status");
        if (!cancelled) setRuntimeStatus(data.providers);
      } catch (e: unknown) {
        if (!cancelled) setRuntimeStatusError(e instanceof Error ? e.message : "Failed to load runtime status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showRuntimeWarnings]);

  async function save(next: { provider: ModelRouteProvider; modelName: string }) {
    setBusy(true);
    setError(null);
    const optimistic = { ...route, ...next };
    setRoute(optimistic);
    try {
      const res = await fetch("/api/models/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, provider: next.provider, modelName: next.modelName }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        route?: ModelRoute;
        installedModels?: string[];
      };
      if (!res.ok || !data.route) throw new Error(data.error || "Failed to save model route");
      setRoute(data.route);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setRoute(route);
      void (async () => {
        try {
          const res = await fetch("/api/models/runtime-status", { cache: "no-store" });
          const data = (await res.json().catch(() => ({}))) as { providers?: RuntimeStatus };
          if (data.providers) setRuntimeStatus(data.providers);
        } catch {}
      })();
    } finally {
      setBusy(false);
    }
  }

  const wrapperClass = minimal
    ? "w-full max-w-full overflow-hidden"
    : compact
      ? "wf-soft w-full max-w-full overflow-hidden rounded-xl p-2"
      : "wf-soft rounded-2xl p-3";
  const providerState = runtimeStatus?.[route.provider];
  const showProviderWarning = showRuntimeWarnings && providerState && !providerState.ready;
  const missingLocalRequirements =
    route.provider === "OLLAMA"
      ? providerState?.details?.missing.filter((m) => m !== "selected_model") ?? []
      : [];
  const selectedOllamaModelMissing =
    route.provider === "OLLAMA" &&
    providerState?.details?.serviceReachable &&
    providerState?.details?.installedModels.length &&
    !providerState.details.installedModels.includes(route.modelName);
  const activeCatalog = availableCatalog;
  const inCatalog = (activeCatalog[route.provider] ?? []).includes(route.modelName);

  if (chatTrigger) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2.5 rounded-xl px-1 py-2 text-xl transition hover:bg-white/4"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className="truncate font-light tracking-tight text-[rgba(255,248,230,0.55)]">{route.modelName}</span>
          <svg className={`h-4 w-4 text-white/30 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-white/10 bg-[rgba(12,16,22,0.96)] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Business advisor model</div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {([
                ["OPENAI", "Cloud Models"],
                ["OLLAMA", "Local Models"],
              ] as const).map(([providerId, label]) => (
                <button
                  key={providerId}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const provider = providerId as ModelRouteProvider;
                    const fallbackModel = activeCatalog[provider]?.[0] ?? route.modelName;
                    void save({ provider, modelName: fallbackModel });
                  }}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    route.provider === providerId
                      ? "border-white/15 bg-white/8 text-white"
                      : "border-white/8 bg-transparent text-white/75 hover:bg-white/4"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {(activeCatalog[route.provider] ?? []).map((model) => (
                <button
                  key={model}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void save({ provider: route.provider, modelName: model });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    route.modelName === model
                      ? "bg-white/8 text-white"
                      : "text-white/80 hover:bg-white/4"
                  }`}
                >
                  <span className="truncate">{model}</span>
                  {route.modelName === model ? <span className="text-[11px] text-white/60">Current</span> : null}
                </button>
              ))}
              {!inCatalog ? (
                <div className="rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-100">
                  Current model is not in the latest available list from the provider API.
                </div>
              ) : null}
            </div>

            {showProviderWarning ? (
              <div className="mt-3 rounded-xl border border-orange-400/30 bg-orange-500/10 p-2 text-xs text-orange-100">
                <div className="font-medium">Selected provider not ready</div>
                <div className="mt-1 text-orange-200/90">{providerState.message}</div>
                {route.provider === "OLLAMA" && missingLocalRequirements.length ? (
                  <div className="mt-1 text-orange-200/80">
                    Missing: {missingLocalRequirements.join(", ")}
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedOllamaModelMissing ? (
              <div className="mt-2 rounded-xl border border-orange-400/30 bg-orange-500/10 p-2 text-xs text-orange-100">
                Selected local model is not installed. Pull <code>{route.modelName}</code> in Settings → Local open-source (Ollama), or choose an installed model.
              </div>
            ) : null}
            {runtimeStatusError && showRuntimeWarnings ? <div className="mt-2 text-xs text-rose-300">{runtimeStatusError}</div> : null}
            {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className={`grid min-w-0 gap-2 ${compact ? "grid-cols-1" : "md:grid-cols-[140px_minmax(0,1fr)_auto]"}`}>
        <select
          value={route.provider}
          onChange={(e) => {
            const provider = e.target.value as ModelRouteProvider;
            const fallbackModel = activeCatalog[provider]?.[0] ?? route.modelName;
            void save({ provider, modelName: fallbackModel });
          }}
          disabled={busy}
          className="min-w-0 max-w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm"
        >
          <option value="OPENAI">OpenAI (cloud key)</option>
          <option value="OLLAMA">Ollama (local open-source)</option>
        </select>

        <select
          value={route.modelName}
          onChange={(e) => void save({ provider: route.provider, modelName: e.target.value })}
          disabled={busy}
          className="min-w-0 max-w-full truncate rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-2 pr-8 text-sm"
        >
          {(activeCatalog[route.provider] ?? []).map((model) => (
            <option key={model} value={model}>{model}</option>
          ))}
          {inCatalog ? null : <option value={route.modelName}>{route.modelName}</option>}
        </select>

        {!compact ? (
          <div className="flex items-center">
            <span className="wf-chip rounded-full px-2 py-1 text-xs">{busy ? "Saving..." : route.provider}</span>
          </div>
        ) : null}
      </div>
      {!inCatalog ? <div className="mt-1 text-xs wf-muted">Current model is not in the latest available list from the provider API.</div> : null}
      {showProviderWarning ? (
        <div className="mt-2 rounded-xl border border-orange-400/30 bg-orange-500/10 p-2 text-xs text-orange-100">
          <div className="font-medium">Selected model is not ready yet</div>
          <div className="mt-1 text-orange-200/90">{providerState.message}</div>
          {route.provider === "OLLAMA" && missingLocalRequirements.length ? (
            <div className="mt-1 text-orange-200/80">Missing: {missingLocalRequirements.join(", ")}</div>
          ) : null}
          {selectedOllamaModelMissing ? (
            <div className="mt-1 text-orange-200/80">
              Local model <code>{route.modelName}</code> is not installed. Pull it in Settings or choose another installed model.
            </div>
          ) : null}
          <div className="mt-2">
            <a href="/settings" className="inline-flex rounded-lg border border-orange-300/30 bg-orange-500/10 px-2 py-1 text-[11px] font-medium text-orange-100 hover:bg-orange-500/20">
              Open Settings
            </a>
          </div>
        </div>
      ) : null}
      {runtimeStatusError && showRuntimeWarnings ? <div className="mt-2 text-xs text-rose-300">{runtimeStatusError}</div> : null}
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
    </div>
  );
}
