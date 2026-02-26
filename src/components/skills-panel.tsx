"use client";

import { useCallback, useEffect, useState } from "react";
import type { SkillMeta, CatalogSkill } from "@/lib/skills-store";

type Tab = "catalog" | "installed";

type EnvVarStatus = {
  key: string;
  isSet: boolean;
  keyLast4: string | null;
  isManaged: boolean;
};

export function SkillsPanel() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [installed, setInstalled] = useState<SkillMeta[]>([]);
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [envVars, setEnvVars] = useState<EnvVarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  // key → input value for inline forms
  const [envInputs, setEnvInputs] = useState<Record<string, string>>({});
  const [envBusy, setEnvBusy] = useState<string | null>(null);
  // which skill cards have their key section expanded
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    try {
      const [instRes, catRes, envRes] = await Promise.all([
        fetch("/api/skills"),
        fetch("/api/skills?view=catalog"),
        fetch("/api/skills?view=env"),
      ]);
      if (!instRes.ok || !catRes.ok) throw new Error("Failed to load skills");
      const [instData, catData, envData] = await Promise.all([
        instRes.json() as Promise<{ skills: SkillMeta[] }>,
        catRes.json() as Promise<{ catalog: CatalogSkill[] }>,
        envRes.ok ? (envRes.json() as Promise<{ envVars: EnvVarStatus[] }>) : { envVars: [] },
      ]);
      setInstalled(instData.skills);
      setCatalog(catData.catalog);
      setEnvVars(envData.envVars);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function postAction(body: Record<string, unknown>) {
    const name = body.name as string;
    setBusy(name);
    setError(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { skills?: SkillMeta[]; catalog?: CatalogSkill[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.skills) setInstalled(data.skills);
      if (data.catalog) setCatalog(data.catalog);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleSetEnvVar(key: string) {
    const value = envInputs[key]?.trim();
    if (!value) return;
    setEnvBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_env", key, value }),
      });
      const data = (await res.json()) as { envVars?: EnvVarStatus[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save key");
      if (data.envVars) setEnvVars(data.envVars);
      setEnvInputs((prev) => ({ ...prev, [key]: "" }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save key");
    } finally {
      setEnvBusy(null);
    }
  }

  async function handleDeleteEnvVar(key: string) {
    setEnvBusy(key);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_env", key }),
      });
      const data = (await res.json()) as { envVars?: EnvVarStatus[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to remove key");
      if (data.envVars) setEnvVars(data.envVars);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove key");
    } finally {
      setEnvBusy(null);
    }
  }

  function toggleKeyExpanded(skillName: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(skillName)) next.delete(skillName);
      else next.add(skillName);
      return next;
    });
  }

  function envStatusFor(key: string): EnvVarStatus | undefined {
    return envVars.find((e) => e.key === key);
  }

  /** True when all required env vars for a skill are set. */
  function skillKeysReady(skill: CatalogSkill): boolean {
    const vars = skill.requirements.envVars ?? [];
    if (vars.length === 0) return true;
    return vars.every((v) => envStatusFor(v)?.isSet);
  }

  const categories = [...new Set(catalog.map((c) => c.category))].sort();
  const filteredCatalog = categoryFilter ? catalog.filter((c) => c.category === categoryFilter) : catalog;

  if (loading) {
    return (
      <article className="wf-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
        <div className="mt-4 text-sm wf-muted">Loading skills...</div>
      </article>
    );
  }

  return (
    <article className="wf-panel rounded-3xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
          <p className="mt-1 text-sm wf-muted">
            Browse and install skills from the curated catalog. Enabled skills inject instructions into agent prompts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("catalog")}
            className={`rounded-xl border px-4 py-2 text-sm ${
              tab === "catalog" ? "border-teal-400/40 bg-teal-500/10 text-teal-100" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
            }`}
          >
            Catalog ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("installed")}
            className={`rounded-xl border px-4 py-2 text-sm ${
              tab === "installed" ? "border-teal-400/40 bg-teal-500/10 text-teal-100" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
            }`}
          >
            Installed ({installed.length})
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>
      ) : null}

      {/* ---- CATALOG TAB ---- */}
      {tab === "catalog" ? (
        <div className="mt-5">
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full border px-3 py-1 text-xs ${
                !categoryFilter ? "border-teal-400/40 bg-teal-500/10 text-teal-100" : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`rounded-full border px-3 py-1 text-xs capitalize ${
                  categoryFilter === cat
                    ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                    : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="wf-soft rounded-2xl p-5 text-sm wf-muted">No skills match this filter.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCatalog.map((skill) => {
                const requiredVars = skill.requirements.envVars ?? [];
                const keysReady = skillKeysReady(skill);
                const keyExpanded = expandedKeys.has(skill.name);
                const needsKeys = requiredVars.length > 0 && !keysReady;

                return (
                  <div
                    key={skill.name}
                    className={`wf-soft rounded-2xl p-4 flex flex-col gap-3 ${
                      skill.installed && !keysReady && requiredVars.length > 0 ? "border border-amber-500/20" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{skill.displayName}</span>
                          {skill.source === "anthropic" && (
                            <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-400">
                              Anthropic
                            </span>
                          )}
                          {skill.installed && keysReady && requiredVars.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          )}
                          {needsKeys && skill.installed && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Key needed
                            </span>
                          )}
                          {requiredVars.length > 0 && !skill.installed && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] wf-muted">
                              API key required
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs wf-muted">{skill.shortDescription}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {skill.installed ? (
                        <>
                          <button
                            type="button"
                            disabled={busy === skill.name}
                            onClick={() => postAction({ name: skill.name, enabled: !skill.enabled })}
                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                              skill.enabled
                                ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                                : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                            } ${busy === skill.name ? "opacity-50" : ""}`}
                          >
                            {busy === skill.name ? "..." : skill.enabled ? "Enabled" : "Disabled"}
                          </button>
                          {requiredVars.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleKeyExpanded(skill.name)}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                keyExpanded
                                  ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                                  : needsKeys
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                              }`}
                            >
                              {keyExpanded ? "Hide keys" : "API keys"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy === skill.name}
                            onClick={() => postAction({ action: "uninstall", name: skill.name })}
                            className={`rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-400 hover:bg-rose-500/20 ${busy === skill.name ? "opacity-50" : ""}`}
                          >
                            {busy === skill.name ? "..." : "Uninstall"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busy === skill.name}
                          onClick={() => postAction({ action: "install", name: skill.name })}
                          className={`rounded-full border border-teal-700 bg-teal-500/10 px-3 py-1 text-xs text-teal-300 hover:bg-teal-500/20 ${busy === skill.name ? "opacity-50" : ""}`}
                        >
                          {busy === skill.name ? "Installing..." : "Install"}
                        </button>
                      )}
                    </div>

                    {/* Inline API key section — only for installed skills with required vars */}
                    {skill.installed && requiredVars.length > 0 && keyExpanded && (
                      <div className="border-t border-[var(--border)] pt-3 space-y-2">
                        <div className="text-[10px] font-medium uppercase tracking-wider wf-muted mb-2">
                          API Keys — stored encrypted
                        </div>
                        {requiredVars.map((varName) => {
                          const status = envStatusFor(varName);
                          const isSet = status?.isSet ?? false;
                          const isManaged = status?.isManaged ?? false;
                          return (
                            <div key={varName} className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    isSet ? "bg-emerald-400" : "bg-amber-400"
                                  }`}
                                />
                                <span className="text-xs font-mono font-medium">{varName}</span>
                                {isManaged && (
                                  <span className="text-[10px] wf-muted">(server-managed)</span>
                                )}
                                {isSet && !isManaged && status?.keyLast4 && (
                                  <span className="text-[10px] wf-muted">···{status.keyLast4}</span>
                                )}
                                {isSet && !isManaged && (
                                  <button
                                    type="button"
                                    disabled={envBusy === varName}
                                    onClick={() => handleDeleteEnvVar(varName)}
                                    className="ml-auto rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    {envBusy === varName ? "..." : "Remove"}
                                  </button>
                                )}
                              </div>
                              {!isSet && (
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    placeholder={`Enter ${varName}...`}
                                    value={envInputs[varName] ?? ""}
                                    onChange={(e) =>
                                      setEnvInputs((prev) => ({ ...prev, [varName]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void handleSetEnvVar(varName);
                                    }}
                                    className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-2 py-1.5 text-xs font-mono placeholder:wf-muted focus:outline-none focus:border-teal-500/50"
                                  />
                                  <button
                                    type="button"
                                    disabled={envBusy === varName || !envInputs[varName]?.trim()}
                                    onClick={() => handleSetEnvVar(varName)}
                                    className="shrink-0 rounded-lg border border-teal-700 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20 disabled:opacity-40"
                                  >
                                    {envBusy === varName ? "..." : "Save"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {skill.requirements.notes && (
                          <p className="text-[10px] wf-muted mt-1">{skill.requirements.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs wf-muted">
            Sources:{" "}
            <span className="font-mono">github.com/openai/skills</span>
            {" · "}
            <span className="font-mono">github.com/anthropics/skills</span>
          </div>
        </div>
      ) : null}

      {/* ---- INSTALLED TAB ---- */}
      {tab === "installed" ? (
        <div className="mt-5">
          {installed.length === 0 ? (
            <div className="wf-soft rounded-2xl p-5 text-sm wf-muted">
              No skills installed. Browse the Catalog tab to install skills from the curated collection.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {installed.map((skill) => {
                // Find catalog entry for this installed skill to check required vars
                const catEntry = catalog.find((c) => c.name === skill.name);
                const requiredVars = catEntry?.requirements.envVars ?? [];
                const keyExpanded = expandedKeys.has(skill.name);
                const keysReady = catEntry ? skillKeysReady(catEntry) : true;

                return (
                  <div key={skill.name} className="wf-soft rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-medium">{skill.displayName}</span>
                          {requiredVars.length > 0 && keysReady && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Ready
                            </span>
                          )}
                          {requiredVars.length > 0 && !keysReady && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Key needed
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm wf-muted">{skill.shortDescription}</div>
                      </div>
                      {!skill.isSystem ? (
                        <div className="flex shrink-0 gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={busy === skill.name}
                            onClick={() => postAction({ name: skill.name, enabled: !skill.enabled })}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              skill.enabled
                                ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                                : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                            } ${busy === skill.name ? "opacity-50" : ""}`}
                          >
                            {busy === skill.name ? "..." : skill.enabled ? "Enabled" : "Disabled"}
                          </button>
                          {requiredVars.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleKeyExpanded(skill.name)}
                              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                                keyExpanded
                                  ? "border-teal-400/40 bg-teal-500/10 text-teal-100"
                                  : !keysReady
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
                              }`}
                            >
                              {keyExpanded ? "Hide keys" : "API keys"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy === skill.name}
                            onClick={() => postAction({ action: "uninstall", name: skill.name })}
                            className={`rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 ${busy === skill.name ? "opacity-50" : ""}`}
                          >
                            {busy === skill.name ? "..." : "Uninstall"}
                          </button>
                        </div>
                      ) : (
                        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs wf-muted">
                          Built-in
                        </span>
                      )}
                    </div>

                    {/* API key section for installed view */}
                    {!skill.isSystem && requiredVars.length > 0 && keyExpanded && (
                      <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
                        <div className="text-[10px] font-medium uppercase tracking-wider wf-muted mb-2">
                          API Keys — stored encrypted
                        </div>
                        {requiredVars.map((varName) => {
                          const status = envStatusFor(varName);
                          const isSet = status?.isSet ?? false;
                          const isManaged = status?.isManaged ?? false;
                          return (
                            <div key={varName} className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSet ? "bg-emerald-400" : "bg-amber-400"}`} />
                                <span className="text-xs font-mono font-medium">{varName}</span>
                                {isManaged && <span className="text-[10px] wf-muted">(server-managed)</span>}
                                {isSet && !isManaged && status?.keyLast4 && (
                                  <span className="text-[10px] wf-muted">···{status.keyLast4}</span>
                                )}
                                {isSet && !isManaged && (
                                  <button
                                    type="button"
                                    disabled={envBusy === varName}
                                    onClick={() => handleDeleteEnvVar(varName)}
                                    className="ml-auto rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/20 disabled:opacity-50"
                                  >
                                    {envBusy === varName ? "..." : "Remove"}
                                  </button>
                                )}
                              </div>
                              {!isSet && (
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    placeholder={`Enter ${varName}...`}
                                    value={envInputs[varName] ?? ""}
                                    onChange={(e) =>
                                      setEnvInputs((prev) => ({ ...prev, [varName]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void handleSetEnvVar(varName);
                                    }}
                                    className="flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-2 py-1.5 text-xs font-mono placeholder:wf-muted focus:outline-none focus:border-teal-500/50"
                                  />
                                  <button
                                    type="button"
                                    disabled={envBusy === varName || !envInputs[varName]?.trim()}
                                    onClick={() => handleSetEnvVar(varName)}
                                    className="shrink-0 rounded-lg border border-teal-700 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20 disabled:opacity-40"
                                  >
                                    {envBusy === varName ? "..." : "Save"}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {catEntry?.requirements.notes && (
                          <p className="text-[10px] wf-muted mt-1">{catEntry.requirements.notes}</p>
                        )}
                      </div>
                    )}

                    {!keyExpanded && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs wf-muted hover:text-[var(--foreground)]">
                          Show path
                        </summary>
                        <div className="mt-1 rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-mono wf-muted break-all">
                          {skill.path}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
