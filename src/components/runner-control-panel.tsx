"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Runner = {
  id: string;
  name: string;
  environment: string;
  status: string;
  label?: string | null;
  hostName?: string | null;
  osName?: string | null;
  runnerVersion?: string | null;
  capabilities?: Record<string, unknown> | null;
  lastSeenAt?: string | null;
  createdAt: string;
};

type RunnerJob = {
  id: string;
  title: string;
  jobType: string;
  status: string;
  riskLevel: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  approvalRequired: boolean;
  approvedAt?: string | null;
  policyDecision?: {
    requiresApproval?: boolean;
    decision?: string;
    reasonCode?: string;
    source?: string;
    message?: string;
    policy?: {
      id?: string;
      templateKey?: string;
      templateName?: string;
      version?: number;
    } | null;
  } | null;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
};

type RunnerEvent = {
  id: string;
  eventType: string;
  level: string;
  message: string;
  data?: Record<string, unknown> | null;
  createdAt: string;
};

type DiffSummary = {
  changed: boolean;
  added: number;
  removed: number;
  preview: string[];
};

type RunnerPolicyRule = {
  riskLevel?: string;
  approvalRequired?: boolean;
};

type RunnerPolicy = {
  id: string;
  templateKey: string;
  templateName: string;
  version: number;
  rules?: {
    execution?: {
      allowedRoots?: string[];
      allowedCommands?: string[];
      network?: {
        mode?: "allow_all" | "deny_all" | "allowlist";
        allowDomains?: string[];
      };
    };
    defaultRule?: RunnerPolicyRule;
    jobTypeRules?: Record<string, RunnerPolicyRule>;
  } | null;
};

export function RunnerControlPanel() {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [jobs, setJobs] = useState<RunnerJob[]>([]);
  const [eventsByJob, setEventsByJob] = useState<Record<string, RunnerEvent[]>>({});
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [approvalJobId, setApprovalJobId] = useState<string | null>(null);
  const [approvingJobId, setApprovingJobId] = useState<string | null>(null);
  const [cancelingJobId, setCancelingJobId] = useState<string | null>(null);
  const [streamingJobId, setStreamingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [runnerPolicy, setRunnerPolicy] = useState<RunnerPolicy | null>(null);
  const [policyDraft, setPolicyDraft] = useState<RunnerPolicy | null>(null);
  const [policyDirty, setPolicyDirty] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [runnerName, setRunnerName] = useState("Local Runner");
  const [runnerEnv, setRunnerEnv] = useState("desktop");
  const [runnerLabel, setRunnerLabel] = useState("");
  const [jobCwd, setJobCwd] = useState("");
  const [jobCommand, setJobCommand] = useState("ls -la");
  const [interactiveCommand, setInteractiveCommand] = useState("bash");
  const [ptyCommandCols, setPtyCommandCols] = useState("100");
  const [ptyCommandRows, setPtyCommandRows] = useState("30");
  const [interactiveInputByJob, setInteractiveInputByJob] = useState<Record<string, string>>({});
  const [ptyColsByJob, setPtyColsByJob] = useState<Record<string, string>>({});
  const [ptyRowsByJob, setPtyRowsByJob] = useState<Record<string, string>>({});
  const [filePath, setFilePath] = useState("");
  const [fileWriteContent, setFileWriteContent] = useState("Hello from Zygenic runner\n");
  const pollRef = useRef<number | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const terminalViewportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeDebounceRef = useRef<number | null>(null);
  const lastSentPtySizeRef = useRef<Record<string, string>>({});

  async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  const refresh = useCallback(async () => {
    const [r, j, p] = await Promise.all([
      fetchJson<{ runners: Runner[] }>("/api/runners"),
      fetchJson<{ jobs: RunnerJob[] }>("/api/runners/jobs?limit=100"),
      fetchJson<{ policy: RunnerPolicy }>("/api/runners/policy"),
    ]);
    setRunners(Array.isArray(r.runners) ? r.runners : []);
    setJobs(Array.isArray(j.jobs) ? j.jobs : []);
    if (p.policy) {
      setRunnerPolicy(p.policy);
      setPolicyDraft((current) => (policyDirty && current ? current : normalizePolicyForForm(p.policy)));
    }
  }, [policyDirty]);

  const loadEvents = useCallback(async (jobId: string) => {
    const data = await fetchJson<{ events: RunnerEvent[] }>(`/api/runners/jobs/${jobId}/events`);
    setEventsByJob((curr) => ({ ...curr, [jobId]: Array.isArray(data.events) ? data.events : [] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialRefreshTimer = window.setTimeout(() => {
      void refresh()
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load runner control plane");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    pollRef.current = window.setInterval(() => {
      void refresh().catch(() => undefined);
      if (expandedJobId) {
        void loadEvents(expandedJobId).catch(() => undefined);
      }
    }, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(initialRefreshTimer);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [expandedJobId, loadEvents, refresh]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.close();
      streamRef.current = null;
    }
    setStreamingJobId(null);
    if (!expandedJobId) return;

    const stream = new EventSource(`/api/runners/jobs/${expandedJobId}/stream`);
    streamRef.current = stream;

    stream.addEventListener("job", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { job?: RunnerJob };
        if (!parsed.job) return;
        setJobs((curr) => curr.map((job) => (job.id === parsed.job?.id ? { ...job, ...parsed.job } : job)));
        setStreamingJobId(parsed.job.id);
      } catch {
        // ignore malformed messages
      }
    });

    stream.addEventListener("events", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as { events?: RunnerEvent[] };
        const incoming = Array.isArray(parsed.events) ? parsed.events : [];
        if (!incoming.length) return;
        setEventsByJob((curr) => {
          const existing = curr[expandedJobId] ?? [];
          const seen = new Set(existing.map((e) => e.id));
          const merged = existing.concat(incoming.filter((e) => !seen.has(e.id)));
          return { ...curr, [expandedJobId]: merged };
        });
      } catch {
        // ignore malformed messages
      }
    });

    stream.addEventListener("error", () => {
      setStreamingJobId((current) => (current === expandedJobId ? null : current));
    });

    return () => {
      stream.close();
      if (streamRef.current === stream) streamRef.current = null;
      setStreamingJobId((current) => (current === expandedJobId ? null : current));
    };
  }, [expandedJobId]);

  useEffect(() => {
    if (!expandedJobId) return;
    const expandedJob = jobs.find((job) => job.id === expandedJobId);
    if (!expandedJob || expandedJob.jobType !== "command.pty") return;
    const viewport = terminalViewportRefs.current[expandedJobId];
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [expandedJobId, eventsByJob, jobs]);

  useEffect(() => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (resizeDebounceRef.current) {
      window.clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = null;
    }
    if (!expandedJobId) return;
    const expandedJob = jobs.find((job) => job.id === expandedJobId);
    if (!expandedJob || expandedJob.jobType !== "command.pty" || !["RUNNING", "LEASED"].includes(expandedJob.status)) return;
    const viewport = terminalViewportRefs.current[expandedJobId];
    if (!viewport) return;

    const sendResize = () => {
      const rect = viewport.getBoundingClientRect();
      const cols = Math.max(20, Math.min(400, Math.floor((rect.width - 16) / 8.4) || 100));
      const rows = Math.max(5, Math.min(200, Math.floor((rect.height - 16) / 18) || 24));
      const key = `${cols}x${rows}`;
      if (lastSentPtySizeRef.current[expandedJobId] === key) return;
      lastSentPtySizeRef.current[expandedJobId] = key;
      void fetch(`/api/runners/jobs/${expandedJobId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "resize", payload: { cols, rows } }),
      }).catch(() => undefined);
    };

    sendResize();
    const observer = new ResizeObserver(() => {
      if (resizeDebounceRef.current) window.clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = window.setTimeout(sendResize, 120);
    });
    observer.observe(viewport);
    resizeObserverRef.current = observer;
    return () => {
      observer.disconnect();
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
        resizeDebounceRef.current = null;
      }
    };
  }, [expandedJobId, jobs]);

  async function registerRunner() {
    setError(null);
    setStatus("Registering runner...");
    try {
      const data = await fetchJson<{ registration: { authToken: string; runner: Runner } }>(
        "/api/runners",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: runnerName, environment: runnerEnv, label: runnerLabel || undefined }),
        },
      );
      setRegistrationToken(data.registration.authToken);
      setStatus(`Runner registered: ${data.registration.runner.name}`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to register runner");
      setStatus(null);
    }
  }

  async function enqueue(payload: {
    title: string;
    jobType: string;
    riskLevel: "low" | "medium" | "high";
    approvalRequired: boolean;
    payload: Record<string, unknown>;
  }) {
    setError(null);
    setStatus(`Queueing: ${payload.title}`);
    try {
      await fetchJson("/api/runners/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(`Queued: ${payload.title}`);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enqueue job");
      setStatus(null);
    }
  }

  async function approveJob(jobId: string) {
    setError(null);
    setApprovingJobId(jobId);
    try {
      await fetchJson("/api/runners/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action: "approve" }),
      });
      setStatus("Job approved");
      setApprovalJobId((current) => (current === jobId ? null : current));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to approve job");
    } finally {
      setApprovingJobId((current) => (current === jobId ? null : current));
    }
  }

  async function cancelJob(jobId: string) {
    setError(null);
    setCancelingJobId(jobId);
    try {
      await fetchJson("/api/runners/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action: "cancel" }),
      });
      setStatus("Job canceled");
      setApprovalJobId((current) => (current === jobId ? null : current));
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel job");
    } finally {
      setCancelingJobId((current) => (current === jobId ? null : current));
    }
  }

  async function sendInteractiveInput(jobId: string, mode: "line" | "write" = "line") {
    const text = interactiveInputByJob[jobId] ?? "";
    if (!text && mode === "write") return;
    setError(null);
    try {
      await fetchJson(`/api/runners/jobs/${jobId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mode === "line" ? "stdin.line" : "stdin.write",
          payload: { text },
        }),
      });
      setStatus(mode === "line" ? "Sent input line" : "Sent input");
      if (mode === "line") {
        setInteractiveInputByJob((curr) => ({ ...curr, [jobId]: "" }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send interactive input");
    }
  }

  async function sendJobControl(jobId: string, kind: "signal" | "resize", payload: Record<string, unknown>) {
    setError(null);
    try {
      await fetchJson(`/api/runners/jobs/${jobId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload }),
      });
      setStatus(kind === "resize" ? "Sent terminal resize" : "Sent signal");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to send ${kind}`);
    }
  }

  async function savePolicy() {
    if (!policyDraft) return;
    setError(null);
    setSavingPolicy(true);
    try {
      const data = await fetchJson<{ policy: RunnerPolicy }>("/api/runners/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: policyDraft.templateKey,
          templateName: policyDraft.templateName,
          rules: policyDraft.rules,
        }),
      });
      setRunnerPolicy(data.policy);
      setPolicyDraft(normalizePolicyForForm(data.policy));
      setPolicyDirty(false);
      setStatus(`Runner policy saved (${data.policy.templateName} v${data.policy.version})`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save runner policy");
    } finally {
      setSavingPolicy(false);
    }
  }

  function parseCommandToArgv(input: string) {
    return input.trim().split(/\s+/).filter(Boolean);
  }

  const pendingApprovals = jobs.filter((j) => j.status === "NEEDS_APPROVAL");
  const approvalJob = approvalJobId ? jobs.find((job) => job.id === approvalJobId) ?? null : null;
  const policyRuleRows = ["health.check", "file.read", "file.write", "command.exec", "command.interactive", "command.pty"] as const;

  const inputCls = "w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40";
  const selectCls = "w-full rounded-md border border-white/[0.1] bg-[#0e1418] px-3 py-2 text-sm outline-none focus:border-teal-500/40";

  return (
    <div className="space-y-0">

      {/* Page header */}
      <header className="pb-5 border-b border-white/[0.07]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/35">Runners</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Runner Control Plane</h1>
            <p className="mt-1 text-sm text-white/45 max-w-2xl">
              Connect a local or on-prem runner to execute jobs on real files and tools while keeping approvals and logs in Zygenic.
            </p>
          </div>
          <div className="flex items-stretch divide-x divide-white/[0.07] shrink-0">
            <div className="pr-6 text-right">
              <div className="text-xs text-white/35">Runners</div>
              <div className="text-xl font-semibold tabular-nums">{runners.length}</div>
            </div>
            <div className="pl-6 text-right">
              <div className="text-xs text-white/35">Awaiting approval</div>
              <div className={`text-xl font-semibold tabular-nums ${pendingApprovals.length > 0 ? "text-amber-300" : ""}`}>{pendingApprovals.length}</div>
            </div>
          </div>
        </div>
        {loading ? <div className="mt-3 text-xs text-white/40">Loading...</div> : null}
        {status ? <div className="mt-3 text-xs text-emerald-300">{status}</div> : null}
        {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}
      </header>

      {/* Register a Runner */}
      <section className="border-b border-white/[0.07] py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-medium">Register a Runner</h2>
            <p className="mt-0.5 text-xs text-white/40">Create a token, then start the daemon with the token and allowed root folders.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={() => void registerRunner()} className="wf-btn-primary px-4 py-2 text-sm">
              Register
            </button>
            <button type="button" onClick={() => void refresh()} className="wf-btn px-4 py-2 text-sm">
              Refresh
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <div className="font-medium mb-1.5">Runner name</div>
            <input value={runnerName} onChange={(e) => setRunnerName(e.target.value)} className={inputCls} />
          </label>
          <label className="block text-sm">
            <div className="font-medium mb-1.5">Environment</div>
            <select value={runnerEnv} onChange={(e) => setRunnerEnv(e.target.value)} className={selectCls}>
              <option value="desktop">desktop</option>
              <option value="server">server</option>
              <option value="laptop">laptop</option>
            </select>
          </label>
          <label className="block text-sm">
            <div className="font-medium mb-1.5">Label <span className="text-white/35 font-normal">(optional)</span></div>
            <input value={runnerLabel} onChange={(e) => setRunnerLabel(e.target.value)} placeholder="HQ rack / Founder MacBook" className={inputCls} />
          </label>
        </div>
        {registrationToken ? (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs font-medium text-amber-200">Runner token — shown once</div>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-amber-100/90">{registrationToken}</pre>
            <div className="mt-3 text-xs text-amber-100/55">
              Set <code>WF_RUNNER_BASE_URL</code>, <code>WF_RUNNER_TOKEN</code>, and <code>WF_RUNNER_ALLOWED_ROOTS</code>, then run <code>npm run runner</code>.
            </div>
          </div>
        ) : null}
      </section>

      {/* Runner Policy */}
      <section className="border-b border-white/[0.07] py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-medium">Runner Policy</h2>
            <p className="mt-0.5 text-xs text-white/40">Control default risk and approval behavior for each job type.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {runnerPolicy ? <div className="text-xs text-white/35">{runnerPolicy.templateName} v{runnerPolicy.version}</div> : null}
            {policyDirty ? <div className="text-xs text-amber-300">Unsaved changes</div> : null}
            <button
              type="button"
              onClick={() => { if (runnerPolicy) { setPolicyDraft(normalizePolicyForForm(runnerPolicy)); setPolicyDirty(false); } }}
              disabled={!runnerPolicy}
              className="wf-btn px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => void savePolicy()}
              disabled={!policyDirty || savingPolicy}
              className="wf-btn-primary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {savingPolicy ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>

        {policyDraft ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <div className="font-medium mb-1.5">Template key</div>
                <input
                  value={policyDraft.templateKey}
                  onChange={(e) => { setPolicyDirty(true); setPolicyDraft((curr) => curr ? { ...curr, templateKey: e.target.value } : curr); }}
                  className={inputCls}
                />
              </label>
              <label className="block text-sm">
                <div className="font-medium mb-1.5">Template name</div>
                <input
                  value={policyDraft.templateName}
                  onChange={(e) => { setPolicyDirty(true); setPolicyDraft((curr) => curr ? { ...curr, templateName: e.target.value } : curr); }}
                  className={inputCls}
                />
              </label>
            </div>

            {/* Execution guardrails */}
            <div className="rounded-lg border border-white/[0.08] p-4">
              <div className="text-xs uppercase tracking-wider text-white/35 mb-4">Execution Guardrails</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <div className="font-medium mb-1.5">Allowed roots <span className="text-white/35 font-normal">(one path per line)</span></div>
                  <textarea
                    rows={4}
                    value={(policyDraft.rules?.execution?.allowedRoots ?? []).join("\n")}
                    onChange={(e) => {
                      setPolicyDirty(true);
                      const values = e.target.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
                      setPolicyDraft((curr) => updatePolicyExecution(curr, { allowedRoots: values }));
                    }}
                    className="h-24 w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40"
                    placeholder={"/work/projects/client-a\n/home/ops/shared"}
                  />
                  <div className="mt-1 text-xs text-white/30">Runner enforces the intersection of these paths and the daemon&#39;s allowed roots.</div>
                </label>
                <label className="block text-sm">
                  <div className="font-medium mb-1.5">Allowed commands <span className="text-white/35 font-normal">(one per line)</span></div>
                  <textarea
                    rows={4}
                    value={(policyDraft.rules?.execution?.allowedCommands ?? []).join("\n")}
                    onChange={(e) => {
                      setPolicyDirty(true);
                      const values = e.target.value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
                      setPolicyDraft((curr) => updatePolicyExecution(curr, { allowedCommands: values }));
                    }}
                    className="h-24 w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40"
                    placeholder={"git\nnpm\nnode\nls"}
                  />
                  <div className="mt-1 text-xs text-white/30">If set, commands must be allowed by both the policy and the local env allowlist.</div>
                </label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[200px_1fr]">
                <label className="block text-sm">
                  <div className="font-medium mb-1.5">Network mode</div>
                  <select
                    value={policyDraft.rules?.execution?.network?.mode ?? "allow_all"}
                    onChange={(e) => {
                      setPolicyDirty(true);
                      setPolicyDraft((curr) => updatePolicyExecution(curr, { network: { ...(curr?.rules?.execution?.network ?? {}), mode: e.target.value as "allow_all" | "deny_all" | "allowlist" } }));
                    }}
                    className={selectCls}
                  >
                    <option value="allow_all">allow_all</option>
                    <option value="deny_all">deny_all</option>
                    <option value="allowlist">allowlist</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <div className="font-medium mb-1.5">Network allowlist <span className="text-white/35 font-normal">(one domain per line)</span></div>
                  <textarea
                    rows={3}
                    value={(policyDraft.rules?.execution?.network?.allowDomains ?? []).join("\n")}
                    onChange={(e) => {
                      setPolicyDirty(true);
                      const values = e.target.value.split(/\r?\n/).map((v) => v.trim().toLowerCase()).filter(Boolean);
                      setPolicyDraft((curr) => updatePolicyExecution(curr, { network: { ...(curr?.rules?.execution?.network ?? {}), allowDomains: values } }));
                    }}
                    className="h-20 w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/20 focus:border-teal-500/40"
                    placeholder={"api.openai.com\napi.anthropic.com"}
                  />
                </label>
              </div>
            </div>

            {/* Job type rules */}
            <div className="rounded-lg border border-white/[0.08] overflow-hidden">
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="text-xs uppercase tracking-wider text-white/35">Job Type Rules</div>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {policyRuleRows.map((jobType) => {
                  const rule = policyDraft.rules?.jobTypeRules?.[jobType] ?? {};
                  return (
                    <div key={jobType} className="flex flex-wrap items-center gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{jobType}</div>
                        <div className="text-xs text-white/40">{jobTypeHelpText(jobType)}</div>
                      </div>
                      <select
                        value={rule.riskLevel ?? "medium"}
                        onChange={(e) => { setPolicyDirty(true); setPolicyDraft((curr) => updatePolicyRule(curr, jobType, { riskLevel: e.target.value })); }}
                        className="rounded-md border border-white/[0.1] bg-[#0e1418] px-2.5 py-1.5 text-xs outline-none focus:border-teal-500/40"
                      >
                        <option value="low">low risk</option>
                        <option value="medium">medium risk</option>
                        <option value="high">high risk</option>
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.approvalRequired !== false}
                          onChange={(e) => { setPolicyDirty(true); setPolicyDraft((curr) => updatePolicyRule(curr, jobType, { approvalRequired: e.target.checked })); }}
                          className="accent-teal-400"
                        />
                        <span className="text-xs text-white/55">Approval required</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/40">Loading runner policy...</div>
        )}
      </section>

      {/* Queue Jobs + Connected Runners */}
      <section className="border-b border-white/[0.07] py-6">
        <div className="grid gap-10 xl:grid-cols-2">

          {/* Queue Jobs */}
          <div>
            <h2 className="text-sm font-medium mb-0.5">
              Queue Jobs <span className="ml-1.5 text-[10px] uppercase tracking-wider text-white/30 font-normal">Prototype</span>
            </h2>
            <p className="text-xs text-white/40 mb-5">Test the runner before building the full task-template UI.</p>

            {/* Shared CWD */}
            <div className="mb-4">
              <label className="block text-sm">
                <div className="font-medium mb-1.5">Working directory</div>
                <input value={jobCwd} onChange={(e) => setJobCwd(e.target.value)} placeholder="/absolute/path/to/project" className={inputCls} />
                <div className="mt-1 text-xs text-white/30">Must be under runner allowlisted roots.</div>
              </label>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {/* Health check */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Health check</div>
                  <div className="text-xs text-white/40">Verify runner connectivity.</div>
                </div>
                <button type="button" className="wf-btn px-3 py-1.5 text-sm shrink-0"
                  onClick={() => void enqueue({ title: "Runner health check", jobType: "health.check", riskLevel: "low", approvalRequired: false, payload: {} })}>
                  Queue
                </button>
              </div>

              {/* Command exec */}
              <div className="py-4">
                <div className="text-sm font-medium mb-2">Command exec</div>
                <label className="block text-sm">
                  <div className="text-xs text-white/40 mb-1">Command</div>
                  <input value={jobCommand} onChange={(e) => setJobCommand(e.target.value)} className={inputCls} />
                </label>
                <button type="button" className="mt-2 wf-btn px-3 py-1.5 text-sm"
                  onClick={() => {
                    const argv = parseCommandToArgv(jobCommand);
                    if (!jobCwd.trim() || argv.length === 0) { setError("Command jobs require cwd and command"); return; }
                    void enqueue({ title: `Command: ${argv.join(" ")}`, jobType: "command.exec", riskLevel: "medium", approvalRequired: true, payload: { cwd: jobCwd.trim(), command: argv, timeoutSeconds: 120 } });
                  }}>
                  Queue (needs approval)
                </button>
              </div>

              {/* Interactive / PTY */}
              <div className="py-4">
                <div className="text-sm font-medium mb-2">Interactive / PTY command</div>
                <label className="block text-sm mb-3">
                  <div className="text-xs text-white/40 mb-1">Command</div>
                  <input value={interactiveCommand} onChange={(e) => setInteractiveCommand(e.target.value)} className={inputCls} />
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="block text-xs">
                    <div className="text-white/40 mb-1">PTY cols</div>
                    <input value={ptyCommandCols} onChange={(e) => setPtyCommandCols(e.target.value)} className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-sm outline-none focus:border-teal-500/40" />
                  </label>
                  <label className="block text-xs">
                    <div className="text-white/40 mb-1">PTY rows</div>
                    <input value={ptyCommandRows} onChange={(e) => setPtyCommandRows(e.target.value)} className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1.5 text-sm outline-none focus:border-teal-500/40" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="wf-btn px-3 py-1.5 text-sm"
                    onClick={() => {
                      const argv = parseCommandToArgv(interactiveCommand);
                      if (!jobCwd.trim() || argv.length === 0) { setError("Interactive jobs require cwd and command"); return; }
                      void enqueue({ title: `Interactive: ${argv.join(" ")}`, jobType: "command.interactive", riskLevel: "high", approvalRequired: true, payload: { cwd: jobCwd.trim(), command: argv, timeoutSeconds: 3600 } });
                    }}>
                    Interactive
                  </button>
                  <button type="button" className="wf-btn px-3 py-1.5 text-sm"
                    onClick={() => {
                      const argv = parseCommandToArgv(interactiveCommand);
                      if (!jobCwd.trim() || argv.length === 0) { setError("PTY jobs require cwd and command"); return; }
                      const cols = Number(ptyCommandCols) || 100;
                      const rows = Number(ptyCommandRows) || 30;
                      void enqueue({ title: `PTY: ${argv.join(" ")}`, jobType: "command.pty", riskLevel: "high", approvalRequired: true, payload: { cwd: jobCwd.trim(), command: argv, timeoutSeconds: 3600, cols, rows } });
                    }}>
                    PTY
                  </button>
                </div>
              </div>

              {/* File jobs */}
              <div className="py-4">
                <div className="text-sm font-medium mb-3">File jobs</div>
                <label className="block text-sm mb-3">
                  <div className="text-xs text-white/40 mb-1">File path</div>
                  <input value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder="/absolute/path/to/file.txt" className={inputCls} />
                </label>
                <label className="block text-sm mb-3">
                  <div className="text-xs text-white/40 mb-1">Write content</div>
                  <textarea value={fileWriteContent} onChange={(e) => setFileWriteContent(e.target.value)} rows={3} className="h-20 w-full resize-none rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-teal-500/40" />
                </label>
                <div className="flex gap-2">
                  <button type="button" className="wf-btn px-3 py-1.5 text-sm"
                    onClick={() => {
                      if (!filePath.trim()) { setError("File path required"); return; }
                      void enqueue({ title: `Read file: ${filePath.trim()}`, jobType: "file.read", riskLevel: "low", approvalRequired: false, payload: { path: filePath.trim(), maxBytes: 65536 } });
                    }}>
                    Read file
                  </button>
                  <button type="button" className="wf-btn px-3 py-1.5 text-sm"
                    onClick={() => {
                      if (!filePath.trim()) { setError("File path required"); return; }
                      void enqueue({ title: `Write file: ${filePath.trim()}`, jobType: "file.write", riskLevel: "medium", approvalRequired: true, payload: { path: filePath.trim(), content: fileWriteContent, encoding: "utf8", overwrite: true, createDirs: true } });
                    }}>
                    Write file (approval)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Runners */}
          <div>
            <h2 className="text-sm font-medium mb-0.5">Connected Runners</h2>
            <p className="text-xs text-white/40 mb-5">Runners registered to this workspace.</p>
            <div className="space-y-3">
              {runners.length === 0 ? (
                <div className="rounded-lg border border-white/[0.08] p-4 text-sm text-white/40">No runners registered yet.</div>
              ) : (
                runners.map((runner) => (
                  <div key={runner.id} className="rounded-lg border border-white/[0.08] p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-sm font-medium">{runner.name}</div>
                        <div className="text-xs text-white/40 mt-0.5">{runner.environment}{runner.label ? ` · ${runner.label}` : ""}</div>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-xs shrink-0 ${runner.status === "ONLINE" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-white/40"}`}>
                        {runner.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                      {([
                        ["Host", runner.hostName ?? "unknown"],
                        ["OS", runner.osName ?? "unknown"],
                        ["Version", runner.runnerVersion ?? "unknown"],
                        ["Last seen", runner.lastSeenAt ? new Date(runner.lastSeenAt).toLocaleString() : "never"],
                      ] as const).map(([label, val]) => (
                        <div key={label} className="flex gap-1.5">
                          <span className="text-white/35">{label}:</span>
                          <span className="text-white/65 truncate">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Runner Jobs + Approvals */}
      <section className="pt-6">
        <h2 className="text-sm font-medium mb-0.5">Runner Jobs</h2>
        <p className="text-xs text-white/40 mb-5">Recent jobs, results, and approval gates.</p>
        <div className="space-y-2">
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] p-4 text-sm text-white/40">No runner jobs yet.</div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-white/[0.08]">
                {/* Job row */}
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{job.title}</span>
                      <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-xs text-white/45">{job.jobType}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs ${jobStatusClass(job.status)}`}>
                        {job.status.toLowerCase().replaceAll("_", " ")}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs ${riskChipClass(job.riskLevel)}`}>
                        {job.riskLevel}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-white/30">
                      {new Date(job.createdAt).toLocaleString()} · attempt {job.attempts}/{job.maxAttempts}
                    </div>
                    {job.status === "NEEDS_APPROVAL" ? (
                      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="text-xs uppercase tracking-wider text-amber-200/60 mb-2">Approval Preview</div>
                        {renderApprovalPreview(job)}
                      </div>
                    ) : null}
                    {job.errorMessage ? <div className="mt-2 text-xs text-rose-300">{job.errorMessage}</div> : null}
                    {job.result ? (
                      <div className="mt-3 rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
                        <div className="text-xs uppercase tracking-wider text-white/30 mb-2">Result</div>
                        {renderResultSummary(job)}
                      </div>
                    ) : null}
                    {job.result ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">Result JSON</summary>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/[0.07] bg-black/20 p-3 text-xs whitespace-pre-wrap text-white/60">
                          {JSON.stringify(job.result, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {job.status === "NEEDS_APPROVAL" ? (
                      <button type="button" onClick={() => setApprovalJobId(job.id)} className="wf-btn-success px-3 py-1.5 text-sm">
                        Review &amp; Approve
                      </button>
                    ) : null}
                    {["QUEUED", "LEASED", "RUNNING", "NEEDS_APPROVAL"].includes(job.status) ? (
                      <button type="button" onClick={() => void cancelJob(job.id)} disabled={cancelingJobId === job.id} className="wf-btn px-3 py-1.5 text-sm disabled:opacity-50">
                        {cancelingJobId === job.id ? "Canceling..." : "Cancel"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => { const next = expandedJobId === job.id ? null : job.id; setExpandedJobId(next); if (next) void loadEvents(next); }}
                      className="wf-btn px-3 py-1.5 text-sm"
                    >
                      {expandedJobId === job.id ? "Hide logs" : "Logs"}
                    </button>
                  </div>
                </div>

                {/* Expanded logs */}
                {expandedJobId === job.id ? (
                  <div className="border-t border-white/[0.06] p-4">
                    {job.jobType === "command.pty" ? (
                      <div className="mb-4">
                        <div className="mb-2 text-xs uppercase tracking-wider text-white/35">Terminal</div>
                        <div
                          ref={(node) => { terminalViewportRefs.current[job.id] = node; }}
                          className="h-72 overflow-auto rounded-lg border border-white/[0.08] bg-black p-3"
                        >
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-emerald-200">
                            {renderTerminalText(eventsByJob[job.id] ?? []) || "$ "}
                          </pre>
                        </div>
                        <div className="mt-1.5 text-[10px] uppercase tracking-wider text-white/25">
                          Auto-resize {["RUNNING", "LEASED"].includes(job.status) ? "active" : "inactive"} · ANSI escapes stripped
                        </div>
                      </div>
                    ) : null}

                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wider text-white/35">Event log</div>
                      <div className="text-[10px] text-white/25">
                        {streamingJobId === job.id ? "Live (SSE)" : "Polling"}
                      </div>
                    </div>

                    <div className="max-h-72 space-y-px overflow-y-auto">
                      {visibleRunnerEvents(eventsByJob[job.id] ?? []).length === 0 ? (
                        <div className="text-sm text-white/40">No events yet.</div>
                      ) : (
                        visibleRunnerEvents(eventsByJob[job.id] ?? []).map((event) => (
                          <div key={event.id} className="rounded-md border border-white/[0.05] px-3 py-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/45">{event.eventType}</span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${event.level === "error" ? "bg-rose-500/15 text-rose-300" : "bg-white/[0.05] text-white/40"}`}>{event.level}</span>
                              <span className="text-white/25">{new Date(event.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-white/75">{event.message}</div>
                            {event.data ? (
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-black/20 p-2 text-[10px] text-white/55">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>

                    {(job.jobType === "command.interactive" || job.jobType === "command.pty") && ["RUNNING", "LEASED"].includes(job.status) ? (
                      <div className="mt-4 border-t border-white/[0.06] pt-4">
                        <div className="mb-2 text-xs uppercase tracking-wider text-white/35">Interactive Input</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={interactiveInputByJob[job.id] ?? ""}
                            onChange={(e) => setInteractiveInputByJob((curr) => ({ ...curr, [job.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendInteractiveInput(job.id, "line"); } }}
                            className="w-full rounded-md border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-teal-500/40"
                            placeholder="Type input and press Enter"
                          />
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => void sendInteractiveInput(job.id, "line")} className="wf-btn px-3 py-1.5 text-sm">
                              Send
                            </button>
                            <button type="button" onClick={() => void sendJobControl(job.id, "signal", { signal: "SIGINT" })} className="wf-btn px-3 py-1.5 text-sm">
                              Ctrl+C
                            </button>
                          </div>
                        </div>
                        {job.jobType === "command.pty" ? (
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <label className="block text-xs">
                              <div className="text-white/35 mb-1">Cols</div>
                              <input value={ptyColsByJob[job.id] ?? "100"} onChange={(e) => setPtyColsByJob((curr) => ({ ...curr, [job.id]: e.target.value }))} className="w-20 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-sm outline-none focus:border-teal-500/40" />
                            </label>
                            <label className="block text-xs">
                              <div className="text-white/35 mb-1">Rows</div>
                              <input value={ptyRowsByJob[job.id] ?? "30"} onChange={(e) => setPtyRowsByJob((curr) => ({ ...curr, [job.id]: e.target.value }))} className="w-20 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-sm outline-none focus:border-teal-500/40" />
                            </label>
                            <button type="button"
                              onClick={() => void sendJobControl(job.id, "resize", { cols: Number(ptyColsByJob[job.id] ?? "100") || 100, rows: Number(ptyRowsByJob[job.id] ?? "30") || 30 })}
                              className="wf-btn px-3 py-1.5 text-sm">
                              Resize
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Approval modal */}
      {approvalJob ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-3xl rounded-xl border border-white/[0.1] bg-[#0e1418] p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-white/35">Approval Required</div>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{approvalJob.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-white/[0.08] px-2 py-0.5 text-xs text-white/45">{approvalJob.jobType}</span>
                  <span className={`rounded-md px-2 py-0.5 text-xs ${riskChipClass(approvalJob.riskLevel)}`}>risk: {approvalJob.riskLevel}</span>
                  <span className="text-xs text-white/30">{new Date(approvalJob.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <button type="button" onClick={() => setApprovalJobId(null)} className="wf-btn px-3 py-1.5 text-sm">
                Close
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-lg border border-white/[0.08] p-4">
                <div className="text-xs uppercase tracking-wider text-white/35 mb-3">What Will Happen</div>
                {renderApprovalPreview(approvalJob)}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-amber-200/55 mb-2">Why This Needs Approval</div>
                  <p className="text-sm text-white/80">{approvalPolicyMessage(approvalJob) ?? approvalReason(approvalJob)}</p>
                  {approvalPolicyMeta(approvalJob) ? (
                    <div className="mt-2 text-xs text-amber-100/45">{approvalPolicyMeta(approvalJob)}</div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-white/[0.08] p-4">
                  <div className="text-xs uppercase tracking-wider text-white/35 mb-2">Safety Notes</div>
                  <ul className="space-y-1">
                    {approvalSafetyNotes(approvalJob).map((note) => (
                      <li key={note} className="text-xs text-white/60">— {note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setApprovalJobId(null)} className="wf-btn px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void approveJob(approvalJob.id)}
                disabled={approvingJobId === approvalJob.id}
                className="wf-btn-success px-4 py-2 text-sm disabled:opacity-50"
              >
                {approvingJobId === approvalJob.id ? "Approving..." : "Approve Job"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function jobStatusClass(status: string) {
  if (status === "SUCCEEDED") return "bg-emerald-500/15 text-emerald-300";
  if (status === "FAILED") return "bg-rose-500/15 text-rose-300";
  if (status === "NEEDS_APPROVAL") return "bg-amber-500/15 text-amber-300";
  if (status === "RUNNING" || status === "LEASED") return "bg-blue-500/15 text-blue-300";
  return "bg-white/[0.06] text-white/45";
}

function riskChipClass(riskLevel: string) {
  if (riskLevel === "high") return "bg-rose-500/15 text-rose-300";
  if (riskLevel === "medium") return "bg-amber-500/15 text-amber-300";
  return "bg-emerald-500/15 text-emerald-300";
}

function renderApprovalPreview(job: RunnerJob) {
  if (job.jobType === "command.exec" || job.jobType === "command.interactive" || job.jobType === "command.pty") {
    const cwd = asString(job.payload.cwd) ?? "(runner default cwd)";
    const command = asStringArray(job.payload.command);
    const timeoutSeconds = asNumber(job.payload.timeoutSeconds);
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-white/40">Working directory: </span>
          <code className="text-xs">{cwd}</code>
        </div>
        <div>
          <span className="text-white/40">Command: </span>
          <code className="text-xs">{command.length ? command.join(" ") : "(missing)"}</code>
        </div>
        {timeoutSeconds ? (
          <div className="text-xs text-white/35">Timeout: {timeoutSeconds}s</div>
        ) : null}
      </div>
    );
  }

  if (job.jobType === "file.write") {
    const filePath = asString(job.payload.path) ?? "(missing path)";
    const encoding = asString(job.payload.encoding) ?? "utf8";
    const overwrite = Boolean(job.payload.overwrite ?? true);
    const createDirs = Boolean(job.payload.createDirs ?? true);
    const content = asString(job.payload.content) ?? "";
    const preview = encoding === "utf8" ? content : "(base64 content hidden)";
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-white/40">Path: </span>
          <code className="text-xs">{filePath}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">encoding: {encoding}</span>
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">overwrite: {String(overwrite)}</span>
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">createDirs: {String(createDirs)}</span>
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">bytes: {new TextEncoder().encode(content).byteLength}</span>
        </div>
        {encoding === "utf8" ? (
          <pre className="max-h-40 overflow-auto rounded-lg border border-white/[0.07] bg-black/20 p-2 text-xs whitespace-pre-wrap text-white/70">
            {truncateText(preview, 1200)}
          </pre>
        ) : null}
      </div>
    );
  }

  if (job.jobType === "file.read") {
    return (
      <div className="text-sm">
        <span className="text-white/40">Path: </span>
        <code className="text-xs">{asString(job.payload.path) ?? "(missing path)"}</code>
      </div>
    );
  }

  return <div className="text-sm text-white/40">No structured preview for this job type yet.</div>;
}

function renderResultSummary(job: RunnerJob) {
  const result = isRecord(job.result) ? job.result : null;
  if (!result) return <div className="text-sm text-white/40">No result payload.</div>;

  if (job.jobType === "command.exec" || job.jobType === "command.interactive" || job.jobType === "command.pty") {
    const command = asStringArray(result.command);
    const durationMs = asNumber(result.durationMs);
    const exitCode = asNumber(result.exitCode);
    const stdoutTail = asString(result.stdoutTail) ?? "";
    const stderrTail = asString(result.stderrTail) ?? "";
    return (
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          {command.length ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">{command.join(" ")}</span> : null}
          {typeof exitCode === "number" ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">exit {exitCode}</span> : null}
          {typeof durationMs === "number" ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">{Math.round(durationMs)}ms</span> : null}
        </div>
        {stdoutTail ? (
          <details>
            <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">stdout tail</summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-black/20 p-2 text-xs whitespace-pre-wrap text-white/65">{truncateText(stdoutTail, 4000)}</pre>
          </details>
        ) : null}
        {stderrTail ? (
          <details>
            <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">stderr tail</summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-black/20 p-2 text-xs whitespace-pre-wrap text-white/65">{truncateText(stderrTail, 4000)}</pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (job.jobType === "file.read") {
    const filePath = asString(result.path);
    const encoding = asString(result.encoding);
    const content = asString(result.content) ?? "";
    const truncated = Boolean(result.truncated);
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-white/40">Path: </span>
          <code className="text-xs">{filePath ?? "unknown"}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {encoding ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">encoding: {encoding}</span> : null}
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">truncated: {String(truncated)}</span>
          {typeof result.sizeBytes === "number" ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">size: {result.sizeBytes} bytes</span> : null}
        </div>
        {encoding === "utf8" ? (
          <pre className="max-h-40 overflow-auto rounded-lg bg-black/20 p-2 text-xs whitespace-pre-wrap text-white/65">{truncateText(content, 1200)}</pre>
        ) : (
          <div className="text-xs text-white/40">Binary/base64 content hidden in summary.</div>
        )}
      </div>
    );
  }

  if (job.jobType === "file.write") {
    const filePath = asString(result.path);
    const bytesWritten = asNumber(result.bytesWritten);
    const changed = Boolean(result.changed);
    const diff = parseDiffSummary(result.diffSummary);
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-white/40">Path: </span>
          <code className="text-xs">{filePath ?? "unknown"}</code>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {typeof bytesWritten === "number" ? <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">{bytesWritten} bytes</span> : null}
          <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">changed: {String(changed)}</span>
        </div>
        {diff ? (
          <div className="rounded-lg border border-white/[0.07] bg-black/20 p-2">
            <div className="flex flex-wrap gap-2 text-xs mb-2">
              <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-white/45">changed: {String(diff.changed)}</span>
              <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-emerald-300/70">+{diff.added}</span>
              <span className="rounded-md border border-white/[0.07] px-1.5 py-0.5 text-rose-300/70">-{diff.removed}</span>
            </div>
            {diff.preview.length ? (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-white/60">{truncateText(diff.preview.join("\n"), 2000)}</pre>
            ) : (
              <div className="text-xs text-white/35">No line preview available.</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-white/35">No text diff available (likely binary or non-UTF-8).</div>
        )}
      </div>
    );
  }

  if (job.jobType === "health.check") {
    return <div className="text-sm text-white/40">Runner health check completed.</div>;
  }

  return <div className="text-sm text-white/40">No structured result summary for this job type yet.</div>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function parseDiffSummary(value: unknown): DiffSummary | null {
  if (!isRecord(value)) return null;
  const preview = Array.isArray(value.preview) ? value.preview.filter((v): v is string => typeof v === "string") : [];
  const added = asNumber(value.added);
  const removed = asNumber(value.removed);
  const changed = typeof value.changed === "boolean" ? value.changed : null;
  if (added == null || removed == null || changed == null) return null;
  return { changed, added, removed, preview };
}

function truncateText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function approvalReason(job: RunnerJob) {
  if (job.jobType === "command.exec" || job.jobType === "command.interactive" || job.jobType === "command.pty") {
    return "This action runs a local command on a connected machine. Commands can change files, install packages, or trigger tools, so a person should confirm the command and folder first.";
  }
  if (job.jobType === "file.write") {
    return "This action writes or overwrites a file on the connected machine. Approval helps prevent accidental path mistakes and unintended content changes.";
  }
  if (job.jobType === "file.read") {
    return "This action reads local file contents. The policy can require approval when the file path or data sensitivity is above the auto-run threshold.";
  }
  return "This action is policy-gated and needs human confirmation before the runner continues.";
}

function approvalSafetyNotes(job: RunnerJob) {
  if (job.jobType === "command.exec") {
    return [
      "Confirm the command matches the intended task.",
      "Check the working directory is the expected project folder.",
      "Prefer read-only commands unless a change is intended.",
    ];
  }
  if (job.jobType === "file.write") {
    return [
      "Check the destination path carefully.",
      "Review the content preview for mistakes or secrets.",
      "Keep write actions approval-gated until the workflow is trusted.",
    ];
  }
  return [
    "Approve only if the action matches the business task.",
    "If unsure, request a safer read-only step first.",
  ];
}

function approvalPolicyMessage(job: RunnerJob) {
  const policy = isRecord(job.policyDecision) ? job.policyDecision : null;
  const message = policy ? asString(policy.message) : null;
  return message && message.trim() ? message : null;
}

function approvalPolicyMeta(job: RunnerJob) {
  const policy = isRecord(job.policyDecision) ? job.policyDecision : null;
  if (!policy) return null;
  const source = asString(policy.source);
  const reasonCode = asString(policy.reasonCode);
  const resolvedPolicy = isRecord(policy.policy) ? policy.policy : null;
  const templateName = resolvedPolicy ? asString(resolvedPolicy.templateName) : null;
  const version = resolvedPolicy ? asNumber(resolvedPolicy.version) : null;
  const parts = [
    templateName ? `Template: ${templateName}${typeof version === "number" ? ` v${version}` : ""}` : null,
    source ? `Policy source: ${source}` : null,
    reasonCode ? `Reason code: ${reasonCode}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}

function normalizePolicyForForm(policy: RunnerPolicy): RunnerPolicy {
  const base = policy.rules ?? {};
  const jobTypeRules = base.jobTypeRules ?? {};
  return {
    ...policy,
    rules: {
      execution: {
        allowedRoots: Array.isArray(base.execution?.allowedRoots) ? base.execution?.allowedRoots.filter(Boolean) : [],
        allowedCommands: Array.isArray(base.execution?.allowedCommands) ? base.execution?.allowedCommands.filter(Boolean) : [],
        network: {
          mode: base.execution?.network?.mode ?? "allow_all",
          allowDomains: Array.isArray(base.execution?.network?.allowDomains) ? base.execution?.network?.allowDomains.filter(Boolean) : [],
        },
      },
      defaultRule: {
        riskLevel: base.defaultRule?.riskLevel ?? "medium",
        approvalRequired: base.defaultRule?.approvalRequired !== false,
      },
      jobTypeRules: {
        "health.check": {
          riskLevel: jobTypeRules["health.check"]?.riskLevel ?? "low",
          approvalRequired: jobTypeRules["health.check"]?.approvalRequired ?? false,
        },
        "file.read": {
          riskLevel: jobTypeRules["file.read"]?.riskLevel ?? "low",
          approvalRequired: jobTypeRules["file.read"]?.approvalRequired ?? false,
        },
        "file.write": {
          riskLevel: jobTypeRules["file.write"]?.riskLevel ?? "medium",
          approvalRequired: jobTypeRules["file.write"]?.approvalRequired ?? true,
        },
        "command.exec": {
          riskLevel: jobTypeRules["command.exec"]?.riskLevel ?? "medium",
          approvalRequired: jobTypeRules["command.exec"]?.approvalRequired ?? true,
        },
        "command.interactive": {
          riskLevel: jobTypeRules["command.interactive"]?.riskLevel ?? "high",
          approvalRequired: jobTypeRules["command.interactive"]?.approvalRequired ?? true,
        },
        "command.pty": {
          riskLevel: jobTypeRules["command.pty"]?.riskLevel ?? "high",
          approvalRequired: jobTypeRules["command.pty"]?.approvalRequired ?? true,
        },
      },
    },
  };
}

function updatePolicyRule(current: RunnerPolicy | null, jobType: string, patch: RunnerPolicyRule): RunnerPolicy | null {
  if (!current) return current;
  const next = normalizePolicyForForm(current);
  const existing = next.rules?.jobTypeRules?.[jobType] ?? {};
  return {
    ...next,
    rules: {
      ...next.rules,
      jobTypeRules: {
        ...(next.rules?.jobTypeRules ?? {}),
        [jobType]: { ...existing, ...patch },
      },
    },
  };
}

function updatePolicyExecution(
  current: RunnerPolicy | null,
  patch: {
    allowedRoots?: string[];
    allowedCommands?: string[];
    network?: {
      mode?: "allow_all" | "deny_all" | "allowlist";
      allowDomains?: string[];
    };
  },
): RunnerPolicy | null {
  if (!current) return current;
  const next = normalizePolicyForForm(current);
  const existing = next.rules?.execution ?? {};
  return {
    ...next,
    rules: {
      ...next.rules,
      execution: {
        ...existing,
        ...patch,
        network: {
          ...(existing.network ?? {}),
          ...(patch.network ?? {}),
        },
      },
    },
  };
}

function jobTypeHelpText(jobType: string) {
  if (jobType === "health.check") return "Runner connectivity and capability check.";
  if (jobType === "file.read") return "Reads local files from allowed folders.";
  if (jobType === "file.write") return "Creates or updates local files.";
  if (jobType === "command.exec") return "Runs local commands in an allowed working directory.";
  if (jobType === "command.interactive") return "Runs an interactive command with stdin/stdout streaming (CLI beta).";
  if (jobType === "command.pty") return "Runs a pseudo-terminal command (requires node-pty on runner).";
  return "Runner job type policy rule.";
}

function visibleRunnerEvents(events: RunnerEvent[]) {
  return events.filter((event) => event.eventType !== "pty.data");
}

function renderTerminalText(events: RunnerEvent[]) {
  const chunks: string[] = [];
  for (const event of events) {
    if (event.eventType === "pty.data") {
      const chunk = isRecord(event.data) ? asString(event.data.chunk) : null;
      if (chunk) {
        chunks.push(stripAnsi(chunk));
        continue;
      }
    }
    if (event.eventType === "stdout") {
      chunks.push(`${stripAnsi(event.message)}\n`);
      continue;
    }
    if (event.eventType === "stderr") {
      chunks.push(`${stripAnsi(event.message)}\n`);
    }
  }
  return chunks.join("").slice(-120000);
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}
