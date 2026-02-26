"use client";

import { useEffect, useRef, useState } from "react";
import type { AgenticStreamEvent } from "@/lib/agentic-loop";

type LogLine = {
  id: number;
  type: AgenticStreamEvent["type"];
  text: string;
  status?: string;
};

export function AgentRunStream({
  taskId,
  onDone,
}: {
  taskId: string;
  onDone: (status: string) => void;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [finalText, setFinalText] = useState<string | null>(null);
  const [phase, setPhase] = useState<"connecting" | "running" | "done" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const counterRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function addLine(type: AgenticStreamEvent["type"], text: string, status?: string) {
    const id = ++counterRef.current;
    setLines((prev) => [...prev, { id, type, text, status }]);
  }

  useEffect(() => {
    const es = new EventSource(`/api/agents/delegated-tasks/stream?taskId=${taskId}`);

    es.onopen = () => setPhase("running");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as AgenticStreamEvent;
        switch (event.type) {
          case "llm_call":
            addLine("llm_call", `turn ${event.turn} · thinking…`);
            break;
          case "llm_result":
            addLine("llm_result", `turn ${event.turn} · ${event.model} → ${event.toolNames.join(", ")}`);
            break;
          case "tool_call":
            addLine("tool_call", `  ↳ ${event.toolName}  ${event.argsSummary}`);
            break;
          case "tool_result": {
            const icon = event.status === "ok" ? "✓" : event.status === "blocked" ? "⏸" : "✗";
            addLine("tool_result", `  ${icon} ${event.toolName} · ${event.latencyMs}ms — ${event.summary}`, event.status);
            break;
          }
          case "final_answer":
            setFinalText(event.text);
            addLine("final_answer", `done · ${event.turns} turn${event.turns !== 1 ? "s" : ""} · ${event.totalToolCalls} tool call${event.totalToolCalls !== 1 ? "s" : ""}`);
            break;
          case "task_done":
            setPhase("done");
            onDone(event.status);
            es.close();
            break;
          case "error":
            setErrorMsg(event.message);
            setPhase("error");
            addLine("error", `error: ${event.message}`);
            es.close();
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      if (phase !== "done") {
        setErrorMsg("Connection lost");
        setPhase("error");
      }
      es.close();
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const statusDot =
    phase === "running" ? "bg-teal-400 animate-pulse" :
    phase === "error"   ? "bg-rose-400" :
    phase === "done"    ? "bg-emerald-400" :
    "bg-white/20 animate-pulse";

  const statusLabel =
    phase === "connecting" ? "connecting…" :
    phase === "running"    ? "running" :
    phase === "error"      ? (errorMsg ?? "error") :
    "done";

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-black/40">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />
        <span className="font-mono text-[10px] text-white/35 uppercase tracking-wider">{statusLabel}</span>
      </div>

      {/* Log lines */}
      <div ref={scrollRef} className="max-h-56 overflow-y-auto p-3 space-y-px font-mono">
        {lines.length === 0 && phase === "connecting" ? (
          <div className="text-[11px] text-white/25">Connecting…</div>
        ) : null}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`text-[11px] leading-relaxed ${
              line.type === "llm_call"    ? "text-white/35" :
              line.type === "llm_result"  ? "text-teal-300/75" :
              line.type === "tool_call"   ? "text-white/50" :
              line.type === "tool_result" && line.status === "error"   ? "text-rose-300/80" :
              line.type === "tool_result" && line.status === "blocked"  ? "text-amber-300/80" :
              line.type === "tool_result" ? "text-emerald-300/70" :
              line.type === "final_answer" ? "text-white/60" :
              line.type === "error"       ? "text-rose-300" :
              "text-white/40"
            }`}
          >
            {line.text}
          </div>
        ))}
      </div>

      {/* Final output */}
      {finalText ? (
        <div className="border-t border-white/[0.07] px-3 py-2.5">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/25">Output</div>
          <div className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">{finalText}</div>
        </div>
      ) : null}
    </div>
  );
}
