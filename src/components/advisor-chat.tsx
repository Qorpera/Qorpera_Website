"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AdvisorMode = "home" | "new_project";

type StructuredReply = {
  answer: string;
  priority: "low" | "medium" | "high";
  suggestedAgents: string[];
  onboardingSteps: string[];
  recommendedTemplate?: string;
  ownerFocus?: string[];
};

type TaskCard = {
  id: string;
  title: string;
  toAgent: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "REVIEW" | "FAILED";
  completionDigest?: string | null;
  error?: string;
};

type HiredAgent = {
  agentKind: string;
  title: string;
  created: boolean;
  error?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: StructuredReply;
  source?: "openai" | "fallback";
  model?: string;
  warning?: string | null;
  tasks?: TaskCard[];
  hiredAgents?: HiredAgent[];
  isAutoAnalysis?: boolean;
};

const AGENT_LABELS: Record<string, string> = {
  ASSISTANT: "Assistant",
  PROJECT_MANAGER: "Project Manager",
  CHIEF_ADVISOR: "Chief Advisor",
};

function agentLabel(kind: string) {
  return AGENT_LABELS[kind] ?? kind.replaceAll("_", " ").toLowerCase();
}

function TaskCardView({ task }: { task: TaskCard }) {
  const isPending = task.status === "QUEUED" || task.status === "RUNNING";
  const isDone = task.status === "DONE" || task.status === "REVIEW";
  const isFailed = task.status === "FAILED";

  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-white/80">{agentLabel(task.toAgent)}</span>
        <span className="text-white/40">—</span>
        <span className="text-white/60">{task.title}</span>
        {isPending ? (
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 animate-[wf-think_1s_ease-in-out_infinite] rounded-full bg-teal-400/80" />
            <span className="text-teal-300/80">{task.status === "QUEUED" ? "Queued" : "Working"}</span>
          </span>
        ) : isDone ? (
          <span className="ml-auto text-emerald-400/80">Done</span>
        ) : isFailed ? (
          <span className="ml-auto text-rose-400/80">Failed</span>
        ) : null}
      </div>
      {task.error ? (
        <p className="mt-2 text-xs text-rose-300/80">{task.error}</p>
      ) : null}
      {isDone && task.completionDigest ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/80">{task.completionDigest}</p>
      ) : null}
    </div>
  );
}

export function AdvisorChat({
  mode,
  title,
  subtitle,
  seedQuestion,
  showProjectBrief = false,
  initialDraft,
  autoFocusInput = false,
  autoSendInitialDraft = false,
  hideHeader = false,
  frameless = false,
  chatgptHome = false,
  firstTime = false,
  analyzeMode: analyzeModeInit = false,
  sessionId,
  initialMessages,
}: {
  mode: AdvisorMode;
  title: string;
  subtitle: string;
  seedQuestion: string;
  showProjectBrief?: boolean;
  initialDraft?: string;
  autoFocusInput?: boolean;
  autoSendInitialDraft?: boolean;
  hideHeader?: boolean;
  frameless?: boolean;
  chatgptHome?: boolean;
  firstTime?: boolean;
  analyzeMode?: boolean;
  sessionId?: string | null;
  initialMessages?: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(
    initialMessages?.length
      ? initialMessages
      : chatgptHome && mode === "home"
      ? []
      : [
          {
            id: "m-seed",
            role: "assistant",
            content:
              mode === "home"
                ? "I can help prioritize what matters most, flag bottlenecks, and recommend which agents to deploy next."
                : "Describe the project goal and constraints. I'll suggest the right agent mix, workflow shape, and a safe onboarding path.",
          },
        ],
  );
  const [input, setInput] = useState(
    chatgptHome && mode === "home" ? "" : initialDraft?.trim() ? initialDraft : seedQuestion,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId ?? null);
  const [projectBrief, setProjectBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorHelp, setErrorHelp] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSentInitialRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [analyzePreChat, setAnalyzePreChat] = useState(analyzeModeInit);
  const hasUserMessages = messages.some((m) => m.role === "user");
  const manualUserMessageCount = messages.filter((m) => m.role === "user" && !m.isAutoAnalysis).length;
  const freeMessagesUsed = analyzeModeInit ? manualUserMessageCount : 0;
  const freeMessageLimit = 3;
  const freeLimitReached = analyzeModeInit && freeMessagesUsed >= freeMessageLimit;
  const showCenteredComposer = (chatgptHome && !hasUserMessages && !loading && !analyzePreChat) || analyzePreChat;

  // Collect all pending task IDs across messages for polling
  const pendingTaskIds = messages.flatMap(
    (m) => (m.tasks ?? []).filter((t) => t.id && (t.status === "QUEUED" || t.status === "RUNNING")).map((t) => t.id),
  );

  // Poll for task completion
  useEffect(() => {
    if (!pendingTaskIds.length) return;

    async function poll() {
      try {
        const res = await fetch(`/api/advisor/task-status?ids=${pendingTaskIds.join(",")}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          tasks: Array<{ id: string; status: string; completionDigest?: string | null }>;
        };
        if (!data.tasks?.length) return;

        const updates = new Map(data.tasks.map((t) => [t.id, t]));
        setMessages((curr) =>
          curr.map((msg) => {
            if (!msg.tasks?.length) return msg;
            const changed = msg.tasks.some((t) => {
              const u = updates.get(t.id);
              return u && u.status !== t.status;
            });
            if (!changed) return msg;
            return {
              ...msg,
              tasks: msg.tasks.map((t) => {
                const u = updates.get(t.id);
                if (!u) return t;
                return { ...t, status: u.status as TaskCard["status"], completionDigest: u.completionDigest };
              }),
            };
          }),
        );
      } catch {
        // polling failure is non-fatal
      }

      // Schedule next poll if still mounted
      pollTimerRef.current = setTimeout(poll, 5000);
    }

    pollTimerRef.current = setTimeout(poll, 3000);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTaskIds.join(",")]);

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    void sendMessage();
  }

  useEffect(() => {
    if (!initialDraft?.trim()) return;
    setInput(initialDraft);
    if (autoFocusInput) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(initialDraft.length, initialDraft.length);
      });
    }
  }, [initialDraft, autoFocusInput]);

  const sendAdvisorText = useCallback(async (textInput: string, opts?: { isAutoAnalysis?: boolean }) => {
    const text = textInput.trim();
    if (!text || loading) return;

    setError(null);
    setErrorHelp([]);
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, isAutoAnalysis: opts?.isAutoAnalysis };
    const historyForApi = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    setMessages((curr) => [...curr, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sessionId: activeSessionId,
          message: text,
          history: historyForApi,
          projectDescription: showProjectBrief ? projectBrief : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        help?: string[];
        reply?: StructuredReply;
        source?: "openai" | "fallback";
        sessionId?: string;
        runtime?: {
          selectedProvider?: "OPENAI" | "ANTHROPIC" | "GOOGLE";
          selectedModel?: string;
          warning?: string | null;
        };
        delegatedTasks?: Array<{ id: string; title: string; toAgent: string; error?: string }>;
        hiredAgents?: Array<{ agentKind: string; title: string; created: boolean; error?: string }>;
      };
      if (!res.ok || !payload.reply) {
        if (Array.isArray(payload.help)) setErrorHelp(payload.help.filter((v): v is string => typeof v === "string"));
        if (payload.sessionId) setActiveSessionId(payload.sessionId);
        throw new Error(payload.error || "Advisor request failed");
      }
      if (payload.sessionId) {
        const isNewSession = !activeSessionId;
        setActiveSessionId(payload.sessionId);
        if (mode === "home") {
          router.replace(`/?session=${payload.sessionId}`, { scroll: false });
          if (isNewSession) router.refresh();
        }
      }

      // Build task cards from delegated tasks
      const tasks: TaskCard[] | undefined = payload.delegatedTasks?.length
        ? payload.delegatedTasks.map((dt) => ({
            id: dt.id,
            title: dt.title,
            toAgent: dt.toAgent,
            status: dt.error ? ("FAILED" as const) : ("QUEUED" as const),
            error: dt.error,
          }))
        : undefined;

      const hiredAgents = payload.hiredAgents?.length ? payload.hiredAgents : undefined;

      setMessages((curr) => [
        ...curr,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: payload.reply?.answer ?? "",
          structured: payload.reply,
          source: payload.source,
          model: payload.runtime?.selectedModel,
          warning: payload.runtime?.warning ?? null,
          tasks,
          hiredAgents,
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Advisor request failed");
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, loading, messages, mode, projectBrief, router, showProjectBrief]);

  async function sendMessage() {
    await sendAdvisorText(input);
  }

  useEffect(() => {
    if (!autoSendInitialDraft) return;
    if (!initialDraft?.trim()) return;
    if (autoSentInitialRef.current) return;
    autoSentInitialRef.current = true;
    void sendAdvisorText(initialDraft);
  }, [autoSendInitialDraft, initialDraft, sendAdvisorText]);

  return (
    <section className={frameless ? "h-full" : "wf-panel rounded-3xl p-5"}>
      {hideHeader ? null : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] wf-muted">Business Advisor</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm wf-muted">{subtitle}</p>
          </div>
        </div>
      )}

      {showProjectBrief ? (
        <div className={`${hideHeader ? "" : "mt-4 "}wf-soft rounded-2xl p-4`}>
          <div className="text-xs uppercase tracking-[0.16em] wf-muted">Project brief</div>
          <textarea
            value={projectBrief}
            onChange={(e) => setProjectBrief(e.target.value)}
            placeholder="Describe the project goal, constraints, timeline, tools, and what success looks like..."
            className="mt-2 h-24 w-full rounded-2xl border border-[var(--border)] bg-white/90 p-3 text-sm outline-none"
          />
        </div>
      ) : null}

      <div className={`${hideHeader ? "" : "mt-4 "}space-y-3 ${frameless ? "h-full flex flex-col" : ""}`}>
        {showCenteredComposer ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-3xl">
              {analyzePreChat ? (
                <>
                  <div className="mb-3 text-center text-2xl font-medium tracking-tight text-[var(--foreground)]/95">
                    Your business is mapped. Let&apos;s see what we can do.
                  </div>
                  <p className="mb-8 text-center text-sm text-white/40">
                    We&apos;ll analyze your company data and show you exactly where Qorpera fits in.
                  </p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setAnalyzePreChat(false);
                        void sendAdvisorText(
                          "Analyze my business. Review everything I've shared — my company profile, files, and setup — and give me a short rundown of my operation. Then tell me specifically how Qorpera could add value: which agents would help, what work they could handle, and what types of decisions they could assist with.",
                          { isAutoAnalysis: true },
                        );
                      }}
                      className="rounded-xl bg-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500 disabled:opacity-50"
                    >
                      {loading ? "Analyzing..." : "Analyze my Business"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-8 text-center text-2xl font-medium tracking-tight text-[var(--foreground)]/95">
                    {firstTime ? "Welcome. I'm your Chief Advisor." : "Let\u2019s put some agents to work"}
                  </div>
                  {firstTime && (
                    <p className="mb-6 text-center text-sm text-white/40">
                      I have full context of your workspace — ask me anything to get started.
                    </p>
                  )}
                  <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={onComposerKeyDown}
                      placeholder="Ask the advisor about priorities, bottlenecks, agent hiring, or rollout planning..."
                      className="h-20 w-full resize-none bg-transparent p-2 text-[1.3rem] leading-8 outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2 px-2 pb-1">
                      <div className="text-xs wf-muted">Advisor uses your company setup, inbox, projects, and runs.</div>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={sendMessage}
                        className="wf-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
                      >
                        {loading ? "Thinking..." : "Send"}
                      </button>
                    </div>
                  </div>
                  {firstTime && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {[
                        "Which agents should I hire first?",
                        "What should I work on this week?",
                        "How does Qorpera work?",
                        "Review my company setup and suggest improvements",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setInput(prompt)}
                          className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 hover:border-teal-500/40 hover:text-white/90 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}

        <div className={`${showCenteredComposer ? "hidden" : ""} ${frameless ? "min-h-0 flex-1" : "max-h-72"} space-y-10 overflow-y-auto px-1`}>
          {messages.map((msg) => (
            <div key={msg.id} className="mx-auto w-full max-w-4xl">
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[46rem] rounded-2xl bg-white/8 px-4 py-2.5 text-[1.02rem] leading-7 text-white/95">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="max-w-[46rem]">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-white/85">
                      AI
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-white/60">Advisor</span>
                    {msg.source ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          msg.source === "openai"
                            ? "bg-blue-100 text-blue-900"
                            : "bg-rose-100 text-rose-900"
                        }`}
                        title={msg.model ? `Model: ${msg.model}` : undefined}
                      >
                        {msg.source}
                        {msg.model ? ` · ${msg.model}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[1.02rem] leading-7 text-white/92">{msg.content}</p>
                  {msg.warning ? (
                    <div className="mt-3 rounded-xl border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-100">
                      {msg.warning}
                    </div>
                  ) : null}
                  {msg.structured ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {msg.structured.recommendedTemplate ? (
                        <a href={`/projects/new?template=${msg.structured.recommendedTemplate}`} className="wf-btn-primary px-2.5 py-1 text-xs">
                          Use template
                        </a>
                      ) : null}
                      {(msg.structured.suggestedAgents ?? []).slice(0, 4).map((agent) => (
                        <span key={`${msg.id}-${agent}`} className="wf-chip rounded-full">
                          {agent}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {msg.tasks?.map((task) => (
                    <TaskCardView key={task.id || task.title} task={task} />
                  ))}
                  {msg.hiredAgents?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.hiredAgents.map((h) =>
                        h.error ? (
                          <span key={h.agentKind} className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300/80">
                            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none"><path d="M10 6v4m0 3h.01M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            {h.title} — {h.error}
                          </span>
                        ) : (
                          <span key={h.agentKind} className="flex items-center gap-1.5 rounded-lg border border-teal-400/25 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300/80">
                            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="none"><path d="m5 10 3.5 3.5L15 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {h.created ? "Hired" : "Already active"}: {h.title}
                          </span>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          {loading ? (
            <div className="mx-auto w-full max-w-4xl">
              <div className="max-w-[46rem]">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold text-white/85">
                  AI
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-white/60">Advisor</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-[wf-think_1s_ease-in-out_infinite] rounded-full bg-teal-300/80 [animation-delay:0ms]" />
                  <span className="h-2.5 w-2.5 animate-[wf-think_1s_ease-in-out_infinite] rounded-full bg-teal-300/70 [animation-delay:150ms]" />
                  <span className="h-2.5 w-2.5 animate-[wf-think_1s_ease-in-out_infinite] rounded-full bg-teal-300/60 [animation-delay:300ms]" />
                  <span className="ml-1 text-sm text-white/70">Thinking…</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-800">
            <div className="font-medium">{error}</div>
            {errorHelp.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {errorHelp.map((line, idx) => (
                  <li key={`${idx}:${line}`}>• {line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {freeLimitReached ? (
          <div className={`${showCenteredComposer ? "hidden" : ""} ${frameless ? "sticky bottom-0 bg-[linear-gradient(180deg,rgba(6,10,14,0)_0%,rgba(6,10,14,0.92)_22%,rgba(6,10,14,0.97)_100%)] pt-6" : ""}`}>
            <div className="mx-auto w-full max-w-4xl text-center py-8">
              <a
                href="/pricing"
                className="inline-block rounded-xl bg-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500"
              >
                Hire Agents
              </a>
              <p className="mt-3 text-sm text-white/45">
                Your business is now integrated with our AI. Let&apos;s build your agentic workforce.
              </p>
            </div>
          </div>
        ) : (
          <div data-tour="chat-input" className={`${showCenteredComposer ? "hidden" : ""} ${frameless ? "sticky bottom-0 bg-[linear-gradient(180deg,rgba(6,10,14,0)_0%,rgba(6,10,14,0.92)_22%,rgba(6,10,14,0.97)_100%)] pt-6" : "wf-soft rounded-2xl p-3"}`}>
            <div className="mx-auto w-full max-w-4xl">
              <div className={`${frameless ? "rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-3" : ""}`}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder={mode === "home" ? "Ask what the business should focus on this week..." : "Ask how to orchestrate this project and which agents to hire..."}
                  className={`h-20 w-full resize-none bg-transparent ${frameless ? "" : "rounded-2xl border border-[var(--border)]"} p-2 text-[1.02rem] leading-7 outline-none`}
                />
                <div className="mt-1 flex items-center justify-between gap-2 px-2 pb-1">
                  {analyzeModeInit && freeMessagesUsed > 0 ? (
                    <div className="text-xs text-white/35">
                      {freeMessageLimit - freeMessagesUsed} of {freeMessageLimit} free messages remaining
                    </div>
                  ) : <div />}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={sendMessage}
                    className="wf-btn-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {loading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
