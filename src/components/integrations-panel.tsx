"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { IntegrationConnectionView } from "@/lib/integrations/token-store";

type ProviderConfig = {
  key: string;
  label: string;
  description: string;
  icon: string;
  metadataLabel?: (m: Record<string, string>) => string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    key: "hubspot",
    label: "HubSpot CRM",
    description: "Full CRM: contacts, deals, companies, pipelines, engagements, and custom properties.",
    icon: "H",
    metadataLabel: (m) =>
      m.hub_domain ? m.hub_domain : m.hub_id ? `Portal ${m.hub_id}` : "",
  },
  {
    key: "slack",
    label: "Slack",
    description: "Channels, messages, threads, reactions, users, and scheduled messages.",
    icon: "S",
    metadataLabel: (m) => m.workspace_name ?? "",
  },
  {
    key: "google",
    label: "Google Workspace",
    description: "Access Gmail, Google Calendar, and Google Drive.",
    icon: "G",
    metadataLabel: () => "Gmail · Calendar · Drive",
  },
  {
    key: "linear",
    label: "Linear",
    description: "Issues, projects, labels, cycles, roadmaps, and comments across teams.",
    icon: "L",
    metadataLabel: (m) => m.workspace_name ?? "",
  },
  {
    key: "calendly",
    label: "Calendly",
    description: "View upcoming bookings, get client details before consults, and share one-time booking links.",
    icon: "C",
    metadataLabel: (m) => m.user_name ?? "",
  },
  {
    key: "quickbooks",
    label: "QuickBooks Online",
    description: "Pull Profit & Loss, Balance Sheet, Cash Flow reports, and invoice lists directly from QuickBooks.",
    icon: "Q",
    metadataLabel: (m) => m.company_name ?? (m.realm_id ? `Company ${m.realm_id}` : ""),
  },
  {
    key: "xero",
    label: "Xero",
    description: "Access Profit & Loss, Balance Sheet, Trial Balance, and invoice data from Xero.",
    icon: "X",
    metadataLabel: (m) => m.tenant_name ?? "",
  },
  {
    key: "github",
    label: "GitHub",
    description: "Repos, issues, pull requests, branches, workflows, and code comparisons.",
    icon: "GH",
    metadataLabel: (m) => m.login ? `@${m.login}` : "",
  },
  {
    key: "notion",
    label: "Notion",
    description: "Search pages, query databases, create entries, and manage your workspace.",
    icon: "N",
    metadataLabel: (m) => m.workspace_name ?? "",
  },
  {
    key: "jira",
    label: "Jira",
    description: "List projects, manage issues and sprints, track transitions, and collaborate across boards.",
    icon: "J",
    metadataLabel: (m) => m.site_name ?? "",
  },
];

type Props = {
  initialConnections?: IntegrationConnectionView[];
};

export function IntegrationsPanel({ initialConnections = [] }: Props) {
  const [connections, setConnections] = useState<IntegrationConnectionView[]>(initialConnections);
  const [highlightedProvider, setHighlightedProvider] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = (await res.json()) as { connections: IntegrationConnectionView[] };
        setConnections(data.connections);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      setHighlightedProvider(connected);
      const t = setTimeout(() => setHighlightedProvider(null), 4000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const connectionMap = new Map(connections.map((c) => [c.provider, c]));

  async function handleDisconnect(provider: string) {
    setDisconnecting(provider);
    try {
      await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      await fetchConnections();
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white/90 mb-1">Integrations</h2>
        <p className="text-sm text-white/40">
          Connect your business tools. Once connected, agents can use these integrations
          automatically during tasks — no API key configuration required.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const conn = connectionMap.get(provider.key);
          const isConnected = !!conn;
          const isHighlighted = highlightedProvider === provider.key;
          const isDisconnecting = disconnecting === provider.key;
          const metaLabel = conn?.metadata
            ? provider.metadataLabel?.(conn.metadata) ?? ""
            : "";

          return (
            <div
              key={provider.key}
              className={[
                "rounded-xl border p-5 flex flex-col gap-3 transition-all",
                isHighlighted
                  ? "border-emerald-500/60 bg-emerald-500/[0.06] shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
                  : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-sm font-semibold text-white/70 shrink-0">
                    {provider.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">{provider.label}</p>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span className="text-xs text-emerald-400 font-medium">Connected</span>
                        {metaLabel && (
                          <span className="text-xs text-white/30">· {metaLabel}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-white/35 mt-0.5">Not connected</p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/40 leading-relaxed">{provider.description}</p>

              <div className="mt-auto pt-1">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(provider.key)}
                    disabled={isDisconnecting}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                  >
                    {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : (
                  <a
                    href={`/api/integrations/${provider.key}/connect`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs font-medium text-teal-300 hover:bg-teal-500/20 hover:border-teal-500/30 transition-colors"
                  >
                    Connect
                    <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {connections.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">
          No integrations connected yet. Click Connect to authorize an integration.
        </p>
      )}
    </div>
  );
}
