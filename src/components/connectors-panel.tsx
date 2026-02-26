"use client";

import { useState } from "react";
import type { ExternalConnectorView, ConnectorKind } from "@/lib/external-connector-store";

const CONNECTOR_META: Record<ConnectorKind, {
  label: string;
  description: string;
  docsUrl: string;
  keyLabel: string;
  keyPlaceholder: string;
  hasFrom: boolean;
}> = {
  resend: {
    label: "Resend",
    description: "Send transactional emails via Resend. Free tier available — no domain setup required for testing.",
    docsUrl: "https://resend.com/docs/api-reference/api-keys",
    keyLabel: "API Key",
    keyPlaceholder: "re_...",
    hasFrom: true,
  },
  sendgrid: {
    label: "SendGrid",
    description: "Send emails via Twilio SendGrid.",
    docsUrl: "https://docs.sendgrid.com/ui/account-and-settings/api-keys",
    keyLabel: "API Key",
    keyPlaceholder: "SG...",
    hasFrom: true,
  },
  postmark: {
    label: "Postmark",
    description: "High-deliverability transactional email via Postmark.",
    docsUrl: "https://postmarkapp.com/developer/api/overview",
    keyLabel: "Server Token",
    keyPlaceholder: "xxxxxxxx-xxxx-xxxx-...",
    hasFrom: true,
  },
  webhook: {
    label: "Outbound Webhooks",
    description: "Agents can fire HTTP webhooks to any URL — connect to Zapier, Make, n8n, or your own endpoint. No API key required; webhooks are approved per-request.",
    docsUrl: "https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks",
    keyLabel: "",
    keyPlaceholder: "",
    hasFrom: false,
  },
  slack: {
    label: "Slack",
    description: "Post agent task completions and runner job updates to a Slack channel via an incoming webhook. Paste your Webhook URL in the API Key field.",
    docsUrl: "https://api.slack.com/messaging/webhooks",
    keyLabel: "Webhook URL",
    keyPlaceholder: "https://hooks.slack.com/services/...",
    hasFrom: false,
  },
};

export function ConnectorsPanel({ initial }: { initial: ExternalConnectorView[] }) {
  const [connectors, setConnectors] = useState(initial);
  const [editing, setEditing] = useState<ConnectorKind | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(connector: ConnectorKind) {
    const existing = connectors.find((c) => c.connector === connector);
    setApiKey("");
    setFromAddress(existing?.fromAddress ?? "");
    setEditing(connector);
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setApiKey("");
    setFromAddress("");
    setError(null);
  }

  async function saveConnector(connector: ConnectorKind) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector, apiKey: apiKey || undefined, fromAddress: fromAddress || undefined, enabled: true }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; connector?: ExternalConnectorView; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save");
      if (data.connector) {
        setConnectors((prev) => prev.map((c) => c.connector === connector ? data.connector! : c));
      }
      setEditing(null);
      setApiKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeConnector(connector: ConnectorKind) {
    setSaving(true);
    try {
      await fetch("/api/settings/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector, action: "delete" }),
      });
      setConnectors((prev) => prev.map((c) => c.connector === connector ? { ...c, configured: false, keyLast4: null, fromAddress: null } : c));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="pb-5 border-b border-white/[0.07]">
        <h1 className="text-xl font-semibold tracking-tight">Connectors</h1>
        <p className="mt-1 text-sm text-white/50">
          Configure external services agents can use to send emails and trigger webhooks.
          Credentials are encrypted and stored per workspace.
        </p>
      </header>

      <div className="space-y-3">
        {(["resend", "sendgrid", "postmark", "webhook"] as ConnectorKind[]).map((kind) => {
          const meta = CONNECTOR_META[kind];
          const state = connectors.find((c) => c.connector === kind);
          const isEditing = editing === kind;

          return (
            <div key={kind} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{meta.label}</span>
                    {state?.configured ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                        Connected{state.keyLast4 ? ` ···${state.keyLast4}` : ""}
                      </span>
                    ) : kind === "webhook" ? (
                      <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                        Ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/40">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-white/40">{meta.description}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {kind !== "webhook" && (
                    <>
                      {state?.configured && !isEditing && (
                        <button
                          type="button"
                          onClick={() => removeConnector(kind)}
                          disabled={saving}
                          className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.07]"
                        >
                          Remove
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(kind)}
                          className="rounded-lg border border-white/[0.07] bg-white/[0.05] px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.1]"
                        >
                          {state?.configured ? "Update" : "Configure"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/60">{meta.keyLabel}</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={state?.configured ? `Current: ···${state.keyLast4} (leave blank to keep)` : meta.keyPlaceholder}
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
                    />
                  </div>
                  {meta.hasFrom && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-white/60">From address</label>
                      <input
                        type="text"
                        value={fromAddress}
                        onChange={(e) => setFromAddress(e.target.value)}
                        placeholder='Agent <agent@yourdomain.com>'
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
                      />
                    </div>
                  )}
                  {error && <p className="text-xs text-rose-400">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveConnector(kind)}
                      className="rounded-lg bg-white/[0.08] px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.13] disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg px-4 py-1.5 text-xs text-white/40 transition hover:text-white/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/30">
        API keys are encrypted with AES-256-GCM before storage. Agents use these credentials only when you approve an action from the inbox.
      </p>
    </div>
  );
}
