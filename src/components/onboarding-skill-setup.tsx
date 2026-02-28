"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CatalogSkill } from "@/lib/skills-store";
import type { SkillRecommendation } from "@/lib/onboarding-skill-recommender";

type EnvVarStatus = {
  key: string;
  isSet: boolean;
  keyLast4: string | null;
  isManaged: boolean;
};

const PROVIDER_KEY_LINKS: Record<string, string> = {
  OPENAI_API_KEY: "https://platform.openai.com/api-keys",
  SENTRY_AUTH_TOKEN: "https://sentry.io/settings/auth-tokens/",
  FIGMA_ACCESS_TOKEN: "https://www.figma.com/developers/api#access-tokens",
};

export function OnboardingSkillSetup({
  recommendations,
  catalog,
  initialEnvVars,
}: {
  recommendations: SkillRecommendation[];
  catalog: CatalogSkill[];
  initialEnvVars: EnvVarStatus[];
}) {
  const router = useRouter();
  const [envVars, setEnvVars] = useState<EnvVarStatus[]>(initialEnvVars);
  const [localCatalog, setLocalCatalog] = useState<CatalogSkill[]>(catalog);
  const [busy, setBusy] = useState<string | null>(null);
  const [envInputs, setEnvInputs] = useState<Record<string, string>>({});
  const [envBusy, setEnvBusy] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function envStatusFor(key: string): EnvVarStatus | undefined {
    return envVars.find((e) => e.key === key);
  }

  function skillKeysReady(skill: CatalogSkill): boolean {
    const vars = skill.requirements.envVars ?? [];
    if (vars.length === 0) return true;
    return vars.every((v) => envStatusFor(v)?.isSet);
  }

  function getSkillStatus(skill: CatalogSkill): "ready" | "key-needed" | "not-installed" {
    const current = localCatalog.find((c) => c.name === skill.name);
    if (!current?.installed) return "not-installed";
    if (!skillKeysReady(current)) return "key-needed";
    return "ready";
  }

  async function handleInstall(skillName: string) {
    setBusy(skillName);
    setError(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", name: skillName }),
      });
      const data = (await res.json()) as { catalog?: CatalogSkill[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Install failed");
      if (data.catalog) setLocalCatalog(data.catalog);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Install failed");
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

  async function handleFinish() {
    setFinishing(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/pricing?welcome=1");
    } catch {
      setFinishing(false);
    }
  }

  // Merge recommendations with current catalog state
  const cards = recommendations.map((rec) => ({
    ...rec,
    skill: localCatalog.find((c) => c.name === rec.skill.name) ?? rec.skill,
  }));

  // Also show any unrecommended catalog skills the user might want
  const recommendedNames = new Set(recommendations.map((r) => r.skill.name));
  const otherInstalled = localCatalog.filter((c) => c.installed && !recommendedNames.has(c.name));

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-teal-400/80">Skills</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Recommended skills for your setup</h1>
        <p className="mt-1 text-sm text-white/45">
          Based on your company profile, these skills will help your agents work with the tools you already use.
        </p>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* Recommended skill cards */}
      {cards.length > 0 ? (
        <div className="space-y-3">
          {cards.map(({ skill, reason, matchedTerms }) => {
            const status = getSkillStatus(skill);
            const requiredVars = skill.requirements.envVars ?? [];
            const needsKeys = requiredVars.length > 0 && status === "key-needed";

            return (
              <div
                key={skill.name}
                className={`rounded-2xl border p-4 ${
                  status === "ready"
                    ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                    : needsKeys
                    ? "border-amber-500/20 bg-amber-500/[0.03]"
                    : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{skill.displayName}</span>
                      {status === "ready" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Ready
                        </span>
                      )}
                      {needsKeys && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          Key needed
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-white/50">{skill.shortDescription}</div>
                    <div className="mt-1.5 text-xs text-teal-400/70">
                      {reason}
                      {matchedTerms.length > 0 && (
                        <span className="text-white/30"> ({matchedTerms.join(", ")})</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {status === "not-installed" ? (
                      <button
                        type="button"
                        disabled={busy === skill.name}
                        onClick={() => handleInstall(skill.name)}
                        className={`rounded-lg border border-teal-700 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 hover:bg-teal-500/20 ${busy === skill.name ? "opacity-50" : ""}`}
                      >
                        {busy === skill.name ? "Installing..." : "Install"}
                      </button>
                    ) : status === "ready" ? (
                      <span className="text-xs text-emerald-400/70">Installed</span>
                    ) : null}
                  </div>
                </div>

                {/* Inline API key entry */}
                {(status === "key-needed" || (status === "not-installed" && requiredVars.length > 0)) && requiredVars.length > 0 && (
                  <div className="mt-3 border-t border-white/[0.06] pt-3 space-y-2">
                    {requiredVars.map((varName) => {
                      const envStatus = envStatusFor(varName);
                      const isSet = envStatus?.isSet ?? false;
                      const providerLink = PROVIDER_KEY_LINKS[varName];

                      return (
                        <div key={varName} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSet ? "bg-emerald-400" : "bg-amber-400"}`} />
                            <span className="text-xs font-mono font-medium">{varName}</span>
                            {isSet && envStatus?.keyLast4 && (
                              <span className="text-[10px] text-white/30">...{envStatus.keyLast4}</span>
                            )}
                            {providerLink && !isSet && (
                              <a
                                href={providerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-[10px] text-teal-400/70 hover:text-teal-300 transition"
                              >
                                Get key &rarr;
                              </a>
                            )}
                          </div>
                          {!isSet && status !== "not-installed" && (
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder={`Enter ${varName}...`}
                                value={envInputs[varName] ?? ""}
                                onChange={(e) => setEnvInputs((prev) => ({ ...prev, [varName]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void handleSetEnvVar(varName);
                                }}
                                className="flex-1 min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-teal-500/50"
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center text-sm text-white/40">
          No specific skill recommendations based on your profile. You can browse all skills in Settings after setup.
        </div>
      )}

      {/* Already installed */}
      {otherInstalled.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-white/30 mb-2">Already installed</div>
          <div className="flex flex-wrap gap-2">
            {otherInstalled.map((s) => (
              <span key={s.name} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/50">
                {s.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboarding/files")}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06]"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFinish}
            className="text-sm text-white/35 transition hover:text-white/55"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={finishing}
            onClick={handleFinish}
            className="wf-btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {finishing ? "Finishing..." : "Finish setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
