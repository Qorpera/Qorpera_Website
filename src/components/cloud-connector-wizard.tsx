"use client";

import type { CloudConnectorView, SupportedProvider } from "@/lib/connectors-store";

function providerLabel(provider: SupportedProvider) {
  if (provider === "OPENAI") return "OpenAI";
  if (provider === "ANTHROPIC") return "Anthropic";
  return "Google (Gemini)";
}

export function CloudConnectorWizard({ initial }: { initial: CloudConnectorView[] | CloudConnectorView }) {
  const connectors: CloudConnectorView[] = Array.isArray(initial) ? initial : [initial];

  return (
    <section className="wf-panel rounded-3xl p-5">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] wf-muted">Model setup</div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Managed cloud models</h2>
        <p className="mt-1 text-sm wf-muted">
          All inference runs through Qorpera&apos;s managed API keys. No configuration needed.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {connectors.map((c) => (
          <div key={c.provider} className="wf-soft rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{providerLabel(c.provider)}</div>
              <div className="mt-0.5 text-sm wf-muted">Managed by Qorpera</div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                c.managedAvailable
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-orange-500/15 text-orange-300"
              }`}
            >
              {c.managedAvailable ? "Ready" : "Unavailable"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-teal-500/20 bg-teal-500/8 px-4 py-3 text-sm text-teal-200">
        All inference is billed through Qorpera. Monthly limits and usage are managed per workspace.
      </div>
    </section>
  );
}
