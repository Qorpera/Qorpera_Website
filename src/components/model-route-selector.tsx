"use client";

import { useEffect, useState } from "react";
import type { ModelRoute, ModelRouteProvider, ModelRouteTarget } from "@/lib/model-routing-store";

type Catalog = Record<ModelRouteProvider, string[]>;

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
  const [availableCatalog, setAvailableCatalog] = useState<Catalog>(catalog);
  const [open, setOpen] = useState(false);

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
      };
      if (!res.ok || !data.route) throw new Error(data.error || "Failed to save model route");
      setRoute(data.route);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setRoute(route);
    } finally {
      setBusy(false);
    }
  }

  const inCatalog = (availableCatalog[route.provider] ?? []).includes(route.modelName);

  const PROVIDERS: { id: ModelRouteProvider; label: string }[] = [
    { id: "OPENAI", label: "OpenAI" },
    { id: "ANTHROPIC", label: "Anthropic" },
    { id: "GOOGLE", label: "Google (Gemini)" },
  ];

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
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PROVIDERS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const fallbackModel = availableCatalog[id]?.[0] ?? route.modelName;
                    void save({ provider: id, modelName: fallbackModel });
                  }}
                  className={`rounded-xl border px-2 py-2 text-xs ${
                    route.provider === id
                      ? "border-white/15 bg-white/8 text-white"
                      : "border-white/8 bg-transparent text-white/75 hover:bg-white/4"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {(availableCatalog[route.provider] ?? []).map((model) => (
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

            {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
          </div>
        ) : null}
      </div>
    );
  }

  const wrapperClass = minimal
    ? "w-full max-w-full overflow-hidden"
    : compact
      ? "wf-soft w-full max-w-full overflow-hidden rounded-xl p-2"
      : "wf-soft rounded-2xl p-3";

  return (
    <div className={wrapperClass}>
      <div className={`grid min-w-0 gap-2 ${compact ? "grid-cols-1" : "md:grid-cols-[160px_minmax(0,1fr)_auto]"}`}>
        <select
          value={route.provider}
          onChange={(e) => {
            const provider = e.target.value as ModelRouteProvider;
            const fallbackModel = availableCatalog[provider]?.[0] ?? route.modelName;
            void save({ provider, modelName: fallbackModel });
          }}
          disabled={busy}
          className="min-w-0 max-w-full rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm"
        >
          {PROVIDERS.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <select
          value={route.modelName}
          onChange={(e) => void save({ provider: route.provider, modelName: e.target.value })}
          disabled={busy}
          className="min-w-0 max-w-full truncate rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-3 py-2 pr-8 text-sm"
        >
          {(availableCatalog[route.provider] ?? []).map((model) => (
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
      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
    </div>
  );
}
