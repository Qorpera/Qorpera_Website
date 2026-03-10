"use client";

import { useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────
   Scroll-triggered fade-up animation helper
   ──────────────────────────────────────────── */

function FadeUp({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Scene animation fade (show/hide driven)
   ──────────────────────────────────────────── */

function Fade({
  show,
  delay = 0,
  duration = 500,
  direction = "up",
  distance = 16,
  children,
  className = "",
  style,
}: {
  show: boolean;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t: Record<string, string> = {
    up: `translateY(${distance}px)`,
    down: `translateY(-${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
    none: "none",
  };
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: show ? 1 : 0,
        transform: show ? "none" : t[direction],
        transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   Interactive scenario demo
   ──────────────────────────────────────────── */

const DEMO_SCENES = [
  { id: "streams", label: "Your tools connect", ms: 5500, title: "Layer 1 \u2014 Event stream" },
  { id: "graph", label: "Context connects", ms: 6500, title: "Layer 2 \u2014 Knowledge graph" },
  { id: "situations", label: "Situations surface", ms: 8500, title: "Layer 3 \u2014 Situation engine" },
  { id: "governance", label: "You stay in control", ms: 8000, title: "Layer 4 \u2014 Reasoning & governance" },
  { id: "learning", label: "It gets smarter", ms: 7500, title: "Layer 5 \u2014 Learning loop" },
];
const DEMO_TOTAL = DEMO_SCENES.reduce((s, sc) => s + sc.ms, 0);
const DEMO_PAUSE = 3000;

const STREAMS = [
  { color: "#3b82f6", label: "Gmail" },
  { color: "#a855f7", label: "Slack" },
  { color: "#f59e0b", label: "HubSpot" },
  { color: "#22c55e", label: "Stripe" },
  { color: "#ef4444", label: "Calendar" },
  { color: "#6366f1", label: "Support" },
];

const GN = [
  { x: 250, y: 135, r: 28, l: "Your Company" },
  { x: 250, y: 42, r: 16, l: "Sales" }, { x: 348, y: 82, r: 14, l: "Marketing" }, { x: 348, y: 188, r: 16, l: "Finance" },
  { x: 250, y: 232, r: 14, l: "Operations" }, { x: 152, y: 188, r: 14, l: "HR" }, { x: 152, y: 82, r: 14, l: "Support" },
  { x: 432, y: 48, r: 8, l: "Customers" }, { x: 442, y: 168, r: 9, l: "Vendors" }, { x: 68, y: 48, r: 8, l: "Products" }, { x: 58, y: 188, r: 9, l: "Contracts" },
];
const GE: [number, number][] = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,2],[2,3],[3,4],[4,5],[5,6],[6,1],
  [2,7],[3,8],[6,9],[5,10],
];

/* scene 2 — situation signals */
const SIGS = [
  { x: 55, y: 48, label: "Logins: 0 sessions", sub: "Last 14 days" },
  { x: 195, y: 28, label: "Sentiment: −42%", sub: "Email thread" },
  { x: 125, y: 118, label: "3 open tickets", sub: "Unresolved 9+ days" },
  { x: 275, y: 108, label: "Invoice #4071", sub: "14 days overdue" },
  { x: 70, y: 188, label: "NPS dropped to 4", sub: "Was 8 last quarter" },
];
const SLINKS: [number, number][] = [[0,1],[0,2],[1,3],[2,3],[2,4],[0,4],[1,2]];

/* scene 3 — reasoning trace steps */
const RSTEPS = [
  { icon: "⚡", label: "Situation received", detail: "Churn risk — Acme Corp" },
  { icon: "📊", label: "Account value", detail: "€45K ARR → High priority" },
  { icon: "📋", label: "Policy lookup", detail: "\"Auto-escalate if ARR > €20K\"" },
  { icon: "🔍", label: "Context check", detail: "Last contact: 21 days ago" },
  { icon: "✦", label: "Action generated", detail: "Personal check-in call" },
];

/* scene 4 — learning chart + side table */
const CP = [[40,218],[95,215],[150,208],[205,195],[260,172],[315,135],[370,95],[425,68],[470,52]] as const;
const CPATH = CP.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
// Precompute segment cumulative lengths for accurate dot placement
const CSEG: number[] = [0];
for (let i = 1; i < CP.length; i++) {
  const dx = CP[i][0] - CP[i - 1][0], dy = CP[i][1] - CP[i - 1][1];
  CSEG.push(CSEG[i - 1] + Math.sqrt(dx * dx + dy * dy));
}
const CTOTAL = CSEG[CSEG.length - 1]; // actual path length ~486
function cpAt(t: number): [number, number] {
  const d = t * CTOTAL;
  for (let i = 1; i < CP.length; i++) {
    if (d <= CSEG[i]) {
      const st = (d - CSEG[i - 1]) / (CSEG[i] - CSEG[i - 1]);
      return [CP[i - 1][0] + (CP[i][0] - CP[i - 1][0]) * st, CP[i - 1][1] + (CP[i][1] - CP[i - 1][1]) * st];
    }
  }
  return [CP[CP.length - 1][0], CP[CP.length - 1][1]];
}
const TBL = [
  { metric: "Detection accuracy", w1: "62%", now: "94%" },
  { metric: "False positives", w1: "34%", now: "3%" },
  { metric: "Response time", w1: "4.2h", now: "6min" },
  { metric: "Auto-resolved", w1: "0", now: "7" },
];

function ScenarioDemo() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const raw = now - startRef.current;
      if (raw >= DEMO_TOTAL + DEMO_PAUSE) {
        startRef.current = now;
        setElapsed(0);
      } else if (raw >= DEMO_TOTAL) {
        setElapsed(DEMO_TOTAL);
      } else {
        setElapsed(raw);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const sceneStarts: number[] = [];
  let off = 0;
  for (const sc of DEMO_SCENES) {
    sceneStarts.push(off);
    off += sc.ms;
  }

  let cur = 0;
  for (let i = DEMO_SCENES.length - 1; i >= 0; i--) {
    if (elapsed >= sceneStarts[i]) {
      cur = i;
      break;
    }
  }
  const se = elapsed - sceneStarts[cur];
  const show = (ms: number) => se >= ms;
  const pct = (startMs: number, durMs: number) =>
    Math.min(1, Math.max(0, (se - startMs) / durMs));
  const isPause = elapsed >= DEMO_TOTAL;
  const fadeOut = isPause
    ? 0
    : se < DEMO_SCENES[cur].ms - 300
      ? 1
      : Math.max(0, (DEMO_SCENES[cur].ms - se) / 300);

  const goTo = (idx: number) => {
    startRef.current = performance.now() - sceneStarts[idx];
    setElapsed(sceneStarts[idx]);
  };

  return (
    <div
      className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]"
      style={{ height: 440 }}
    >
      <style>{`@keyframes stFlow{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes sceneIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes pipeDot{0%{cx:45}100%{cx:475}}`}</style>

      {/* grid bg */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* header nav */}
      <div className="relative z-10 flex items-center border-b border-white/5 px-6 py-2.5 lg:px-8">
        <div className="flex items-center gap-1">
          {DEMO_SCENES.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => goTo(i)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all ${
                i === cur
                  ? "bg-white/5"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`block h-1.5 shrink-0 rounded-full transition-all ${
                  i === cur
                    ? "w-4 bg-[var(--accent)]"
                    : "w-1.5 bg-white/20"
                }`}
              />
              <span
                className="whitespace-nowrap font-mono text-[10px]"
                style={{ color: i === cur ? "var(--accent)" : "rgba(255,255,255,0.3)" }}
              >
                Layer {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* scenes */}
      <div className="relative h-[380px] p-6 lg:p-10">
        {/* global layer title — fixed position across all scenes */}
        {!isPause && (
          <Fade show={show(0)} duration={250}>
            <div className="font-mono text-[13px] font-bold uppercase tracking-[1.5px] text-[#3b82f6]">
              {DEMO_SCENES[cur].title}
            </div>
          </Fade>
        )}
        <div
          key={cur}
          style={{
            animation: "sceneIn 200ms cubic-bezier(.22,1,.36,1)",
            opacity: fadeOut,
          }}
          className="flex h-[calc(100%-28px)] w-full items-center justify-center"
        >
          {/* 0 — streams */}
          {cur === 0 && (
            <div className="mx-auto w-full max-w-[540px]">
              <div className="space-y-2.5">
                {STREAMS.map((s, i) => (
                  <Fade
                    key={s.label}
                    show={show(200 + i * 250)}
                    duration={300}
                    direction="left"
                    distance={20}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <div
                        className="relative h-[3px] flex-1 overflow-hidden rounded-full"
                        style={{ background: `${s.color}22` }}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `linear-gradient(90deg,transparent,${s.color},transparent)`,
                            animation: `stFlow 2s linear infinite ${i * 200}ms`,
                          }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-xs text-white/50">
                        {s.label}
                      </span>
                    </div>
                  </Fade>
                ))}
              </div>
              <Fade show={show(2000)} duration={400}>
                <p className="mt-6 text-center text-[14px] text-white/30">
                  Your tools are already talking. Qorpera is listening.
                </p>
              </Fade>
            </div>
          )}

          {/* 1 — knowledge graph (zoom from core, data pulses) */}
          {cur === 1 && (() => {
            const zoom = Math.max(1, 2.4 - pct(200, 4500) * 1.4);
            const cx = GN[0].x, cy = GN[0].y;
            return (
              <div className="mx-auto w-full max-w-[540px]">
                <div className="overflow-hidden rounded-lg" style={{ height: 270 }}>
                  <svg
                    viewBox="0 0 500 270"
                    className="mx-auto w-full"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: `${(cx / 500) * 100}% ${(cy / 270) * 100}%`,
                      transition: "transform 80ms linear",
                    }}
                  >
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* edges */}
                    {GE.map(([a, b], i) => {
                      const na = GN[a], nb = GN[b];
                      const edgeId = `ge${a}-${b}`;
                      const isInner = a === 0 || (a <= 6 && b <= 6);
                      return (
                        <g key={`e${i}`} style={{ opacity: show(400 + i * 80) ? 1 : 0, transition: "opacity 300ms ease" }}>
                          <line
                            x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                            stroke={isInner ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.08)"}
                            strokeWidth={isInner ? "1" : "0.5"}
                          />
                          {/* data pulse traveling along edge */}
                          {show(1800 + i * 200) && (
                            <circle r="2" fill="rgba(59,130,246,0.6)">
                              <animateMotion
                                dur={`${2 + (i % 3)}s`}
                                repeatCount="indefinite"
                                path={`M${na.x},${na.y} L${nb.x},${nb.y}`}
                              />
                            </circle>
                          )}
                        </g>
                      );
                    })}
                    {/* nodes */}
                    {GN.map((n, i) => {
                      const isCore = i === 0;
                      const isDept = i >= 1 && i <= 6;
                      const isOuter = i >= 7;
                      return (
                        <g key={`n${i}`}>
                          {/* glow ring */}
                          <circle
                            cx={n.x} cy={n.y} r={n.r * (isCore ? 2.2 : 1.6)}
                            fill={isCore ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)"}
                            style={{
                              opacity: show(200 + i * 120) ? 1 : 0,
                              transition: "opacity 400ms ease",
                            }}
                          />
                          {/* outer ring */}
                          <circle
                            cx={n.x} cy={n.y} r={n.r}
                            fill={isCore ? "rgba(59,130,246,0.15)" : isDept ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.06)"}
                            stroke={isCore ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.15)"}
                            strokeWidth={isCore ? "1.5" : "0.5"}
                            style={{
                              opacity: show(200 + i * 120) ? 1 : 0,
                              transform: show(200 + i * 120) ? "scale(1)" : "scale(0)",
                              transformOrigin: `${n.x}px ${n.y}px`,
                              transition: "opacity 300ms ease, transform 300ms cubic-bezier(.22,1,.36,1)",
                            }}
                          />
                          {/* core dot */}
                          <circle
                            cx={n.x} cy={n.y} r={n.r * (isCore ? 0.45 : 0.4)}
                            fill={isCore ? "#3b82f6" : isDept ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.35)"}
                            style={{
                              opacity: show(200 + i * 120) ? 1 : 0,
                              transform: show(200 + i * 120) ? "scale(1)" : "scale(0)",
                              transformOrigin: `${n.x}px ${n.y}px`,
                              transition: "opacity 300ms ease, transform 300ms cubic-bezier(.22,1,.36,1)",
                              ...(isCore ? { filter: "url(#glow)" } : {}),
                            }}
                          />
                          {/* core pulse ring */}
                          {isCore && show(300) && (
                            <circle
                              cx={n.x} cy={n.y} r={n.r * 1.1}
                              fill="none"
                              stroke="rgba(59,130,246,0.2)"
                              strokeWidth="1"
                              style={{ animation: "pulse 3s ease infinite" }}
                            />
                          )}
                          {/* label */}
                          <text
                            x={n.x} y={n.y + n.r + (isOuter ? 12 : 14)}
                            textAnchor="middle"
                            fill={isCore ? "rgba(255,255,255,0.8)" : isDept ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)"}
                            fontSize={isCore ? "11" : isDept ? "9" : "7"}
                            fontFamily="ui-monospace,monospace"
                            fontWeight={isCore ? "600" : "400"}
                            style={{
                              opacity: show(300 + i * 120) ? 1 : 0,
                              transition: "opacity 300ms ease",
                            }}
                          >
                            {n.l}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <Fade show={show(4800)} duration={400}>
                  <p className="mt-2 text-center text-[14px] text-white/30">
                    Every entity linked across every tool. One graph.
                  </p>
                </Fade>
              </div>
            );
          })()}

          {/* 2 — situation engine (zoom in on signals, detect pattern) */}
          {cur === 2 && (() => {
            const zoom = Math.max(1, 1.9 - pct(200, 3800) * 0.9);
            return (
              <div className="w-full">
                <div className="flex gap-5">
                  {/* left: signal graph */}
                  <div className="flex-1 overflow-hidden rounded-lg" style={{ height: 280 }}>
                    <svg
                      viewBox="0 0 380 240"
                      className="h-full w-full"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "40% 35%",
                        transition: "transform 80ms linear",
                      }}
                    >
                      {/* connection lines */}
                      {SLINKS.map(([a, b], i) => {
                        const sa = SIGS[a], sb = SIGS[b];
                        return (
                          <line
                            key={`sl${i}`}
                            x1={sa.x + 75} y1={sa.y + 18}
                            x2={sb.x + 75} y2={sb.y + 18}
                            stroke="rgba(59,130,246,0.2)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            style={{
                              opacity: show(1200 + i * 200) ? 1 : 0,
                              transition: "opacity 300ms ease",
                            }}
                          />
                        );
                      })}
                      {/* signal nodes */}
                      {SIGS.map((s, i) => (
                        <g key={`sig${i}`}>
                          <rect
                            x={s.x} y={s.y} width={150} height={36} rx={7}
                            fill="rgba(59,130,246,0.12)"
                            stroke="rgba(59,130,246,0.3)"
                            strokeWidth="0.5"
                            style={{
                              opacity: show(300 + i * 400) ? 1 : 0,
                              transition: "opacity 250ms ease",
                            }}
                          />
                          <text
                            x={s.x + 10} y={s.y + 15}
                            fill="rgba(255,255,255,0.9)"
                            fontSize="10" fontFamily="ui-monospace,monospace"
                            style={{
                              opacity: show(300 + i * 400) ? 1 : 0,
                              transition: "opacity 250ms ease",
                            }}
                          >
                            {s.label}
                          </text>
                          <text
                            x={s.x + 10} y={s.y + 28}
                            fill="rgba(255,255,255,0.45)"
                            fontSize="8" fontFamily="ui-monospace,monospace"
                            style={{
                              opacity: show(400 + i * 400) ? 1 : 0,
                              transition: "opacity 250ms ease",
                            }}
                          >
                            {s.sub}
                          </text>
                        </g>
                      ))}
                      {/* detection pulse around connected signals */}
                      {show(3200) && (
                        <rect
                          x={25} y={10} width={330} height={228} rx={12}
                          fill="none"
                          stroke="rgba(239,68,68,0.2)"
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                          style={{ animation: "pulse 2s ease infinite" }}
                        />
                      )}
                    </svg>
                  </div>
                  {/* right: situation detected card */}
                  <div
                    className="w-[220px] shrink-0"
                    style={{
                      opacity: show(3600) ? 1 : 0,
                      transform: show(3600) ? "none" : "translateX(12px)",
                      transition: "opacity 400ms ease, transform 400ms cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    <div className="rounded-lg border border-red-500/30 bg-red-500/8 p-4">
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-400" style={{ animation: "pulse 2s ease infinite" }} />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Situation detected
                        </span>
                      </div>
                      <div className="font-sans text-[15px] font-semibold text-white">
                        Churn risk — Acme Corp
                      </div>
                      <div className="mt-3 space-y-2">
                        {[
                          "Zero logins + open tickets",
                          "Negative sentiment trend",
                          "Overdue invoice stacking",
                          "NPS collapse (8 → 4)",
                        ].map((r, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 text-[9px] text-red-400">●</span>
                            <span className="font-mono text-[11px] leading-[1.4] text-white/70">{r}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-white/10 pt-2.5 font-mono text-[10px] text-white/40">
                        5 signals from 4 tools
                      </div>
                    </div>
                  </div>
                </div>
                <Fade show={show(4500)} duration={400}>
                  <p className="mt-3 text-[14px] text-white/30">
                    Patterns form across tools. Situations surface before they become problems.
                  </p>
                </Fade>
              </div>
            );
          })()}

          {/* 3 — reasoning & governance (animated SVG flow) */}
          {cur === 3 && (() => {
            // Reasoning flow: situation → evaluate → policy gate → action → approval
            // Nodes along a horizontal pipeline
            const RNODES = [
              { x: 30, y: 130, label: "Situation", sub: "Churn risk", color: "#ef4444" },
              { x: 160, y: 130, label: "Evaluate", sub: "€45K ARR", color: "#3b82f6" },
              { x: 290, y: 130, label: "Policy gate", sub: "ARR > €20K", color: "#8b5cf6" },
              { x: 420, y: 130, label: "Action", sub: "Check-in call", color: "#f59e0b" },
              { x: 540, y: 130, label: "Approval", sub: "Owner review", color: "#22c55e" },
            ];
            // Data pulse position along the pipeline (0→4 = which segment)
            const flowT = pct(300, 3200);
            const flowPos = flowT * 4; // 0..4 maps to which edge we're traveling
            const activeNode = Math.min(4, Math.floor(flowPos + 0.5));
            // Pulse dot position
            const fromIdx = Math.min(3, Math.floor(flowPos));
            const segT = flowPos - fromIdx;
            const pulseX = RNODES[fromIdx].x + (RNODES[Math.min(4, fromIdx + 1)].x - RNODES[fromIdx].x) * segT;

            return (
              <div className="mx-auto w-full" style={{ maxWidth: 640 }}>
                  <svg viewBox="0 0 600 260" className="w-full">
                    <defs>
                      <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="pulseGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* connecting lines */}
                    {RNODES.slice(0, -1).map((n, i) => {
                      const next = RNODES[i + 1];
                      const lit = flowPos >= i;
                      return (
                        <line
                          key={`edge${i}`}
                          x1={n.x + 40} y1={n.y}
                          x2={next.x - 40} y2={next.y}
                          stroke={lit ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.06)"}
                          strokeWidth={lit ? "2" : "1"}
                          strokeDasharray={lit ? "none" : "4 4"}
                          style={{ transition: "stroke 400ms ease, stroke-width 400ms ease" }}
                        />
                      );
                    })}
                    {/* traveling pulse dot — glows at final node */}
                    {show(400) && (
                      <circle
                        cx={flowT >= 1 ? RNODES[4].x : pulseX} cy={130}
                        r={flowT >= 1 ? 7 : 5}
                        fill={flowT >= 1 ? "#22c55e" : "#3b82f6"}
                        style={{ filter: flowT >= 1 ? "url(#nodeGlow)" : "url(#pulseGlow)" }}
                      />
                    )}
                    {/* nodes */}
                    {RNODES.map((n, i) => {
                      const reached = i === 0 ? show(200) : flowPos >= i - 0.3;
                      const active = i === activeNode || (flowT >= 1 && i === 4);
                      return (
                        <g
                          key={`rn${i}`}
                          style={{
                            opacity: reached ? 1 : 0,
                            transform: reached ? "none" : "translateY(8px)",
                            transition: "opacity 350ms ease, transform 350ms cubic-bezier(.22,1,.36,1)",
                          }}
                        >
                          {/* outer ring when active */}
                          {active && (
                            <circle
                              cx={n.x} cy={n.y} r={36}
                              fill="none"
                              stroke={n.color}
                              strokeWidth="1"
                              opacity={0.25}
                              style={{ animation: "pulse 2s ease infinite" }}
                            />
                          )}
                          {/* node circle */}
                          <circle
                            cx={n.x} cy={n.y} r={28}
                            fill={`${n.color}15`}
                            stroke={active ? n.color : `${n.color}40`}
                            strokeWidth={active ? "2" : "1"}
                            style={{
                              filter: active ? "url(#nodeGlow)" : "none",
                              transition: "stroke 300ms ease, stroke-width 300ms ease",
                            }}
                          />
                          {/* inner dot */}
                          <circle
                            cx={n.x} cy={n.y} r={8}
                            fill={reached ? n.color : `${n.color}40`}
                            style={{ transition: "fill 300ms ease" }}
                          />
                          {/* label */}
                          <text
                            x={n.x} y={n.y - 42}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.85)"
                            fontSize="11" fontFamily="ui-monospace,monospace"
                            fontWeight="600"
                          >
                            {n.label}
                          </text>
                          {/* sub label */}
                          <text
                            x={n.x} y={n.y + 50}
                            textAnchor="middle"
                            fill={reached ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                            fontSize="9" fontFamily="ui-monospace,monospace"
                            style={{ transition: "fill 300ms ease" }}
                          >
                            {n.sub}
                          </text>
                          {/* step number */}
                          <text
                            x={n.x} y={n.y + 4}
                            textAnchor="middle"
                            fill={reached ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)"}
                            fontSize="10" fontFamily="ui-monospace,monospace"
                            fontWeight="bold"
                            style={{ transition: "fill 300ms ease" }}
                          >
                            {i + 1}
                          </text>
                        </g>
                      );
                    })}
                    {/* final approval badge */}
                    {flowT >= 1 && (
                      <g style={{ animation: "sceneIn 400ms cubic-bezier(.22,1,.36,1)" }}>
                        <rect
                          x={470} y={195} width={130} height={36} rx={8}
                          fill="rgba(245,158,11,0.1)"
                          stroke="rgba(245,158,11,0.3)"
                          strokeWidth="1"
                        />
                        <circle
                          cx={486} cy={213} r={4}
                          fill="#f59e0b"
                          style={{ animation: "pulse 2s ease infinite" }}
                        />
                        <text
                          x={498} y={217}
                          fill="#f59e0b"
                          fontSize="10" fontFamily="ui-monospace,monospace"
                          fontWeight="600"
                        >
                          Awaiting approval
                        </text>
                      </g>
                    )}
                  </svg>
                <Fade show={show(6200)} duration={400}>
                  <p className="mt-2 text-center text-[14px] text-white/30">
                    Every action traced. Every policy enforced. Full transparency.
                  </p>
                </Fade>
              </div>
            );
          })()}

          {/* 4 — learning loop (zooming chart + side table) */}
          {cur === 4 && (() => {
            const rawT = pct(400, 5000);
            // Easing: slow start that fades into a steady faster pace (ease-in, not continuous acceleration)
            // Uses cubic ease-in: progress = t^3. Starts very slow, settles into a brisk pace.
            const draw = Math.min(1, rawT * rawT * rawT);
            // Tip of drawn line — accurate to path length
            const [tipX, tipY] = cpAt(draw);
            // RGB interpolation: grey #6b7280 → green #22c55e
            const gm = Math.min(1, draw * 1.3);
            const cr = Math.round(107 + (34 - 107) * gm);
            const cg = Math.round(114 + (197 - 114) * gm);
            const cb = Math.round(128 + (94 - 128) * gm);
            const lineRgb = `rgb(${cr},${cg},${cb})`;
            // Animated viewBox: anchor at bottom-left, expand outward as line draws
            // Start: tight crop around first point. End: full chart (0 0 500 240).
            const startW = 100, startH = 55;
            const endW = 500, endH = 240;
            const vbW = startW + (endW - startW) * draw;
            const vbH = startH + (endH - startH) * draw;
            // Anchor bottom-left: x starts near first point, y keeps bottom edge at 240
            const vbX = Math.max(0, 10 * (1 - draw));
            const vbY = endH - vbH;
            // Particles floating along the drawn portion of the line
            const pts: { x: number; y: number; op: number; sz: number }[] = [];
            for (let i = 0; i < 14; i++) {
              const pathPos = ((i + 0.5) / 14) * draw;
              if (pathPos < 0.005) continue;
              const [px, py] = cpAt(pathPos);
              const wobX = Math.sin(se / 500 + i * 2.3) * (5 + draw * 8);
              const wobY = Math.cos(se / 420 + i * 1.9) * (4 + draw * 6);
              const shimmer = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(se / 350 + i * 1.5));
              pts.push({
                x: px + wobX,
                y: py + wobY,
                op: (0.1 + draw * 0.4) * shimmer,
                sz: 1 + draw * 1.5,
              });
            }
            return (
              <div className="w-full">
              <div className="relative flex w-full items-center gap-4">
                  {/* left: animated chart (main) */}
                  <div className="flex-1 min-w-0">
                    <svg
                      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                      className="w-full"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="bigGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="8" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lineRgb} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={lineRgb} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* grid */}
                      {[50, 100, 150, 200].map((y) => (
                        <line
                          key={y}
                          x1={35} y1={y} x2={475} y2={y}
                          stroke="rgba(255,255,255,0.08)"
                          strokeWidth="1"
                        />
                      ))}
                      {/* y labels */}
                      {[
                        { y: 50, label: "100%" },
                        { y: 100, label: "75%" },
                        { y: 150, label: "50%" },
                        { y: 200, label: "25%" },
                      ].map((a) => (
                        <text
                          key={a.y}
                          x={30} y={a.y + 4}
                          textAnchor="end"
                          fill="rgba(255,255,255,0.3)"
                          fontSize="9" fontFamily="ui-monospace,monospace"
                        >
                          {a.label}
                        </text>
                      ))}
                      {/* x axis line */}
                      <line x1={35} y1={220} x2={475} y2={220} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                      {/* x labels + tick marks */}
                      {[
                        { x: 40, label: "Wk 1" },
                        { x: 148, label: "Wk 2" },
                        { x: 255, label: "Wk 3" },
                        { x: 363, label: "Wk 4" },
                        { x: 470, label: "Now" },
                      ].map((a) => (
                        <g key={a.x}>
                          <line x1={a.x} y1={220} x2={a.x} y2={224} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                          <text
                            x={a.x} y={235}
                            textAnchor="middle"
                            fill={a.label === "Now" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)"}
                            fontSize="8" fontFamily="ui-monospace,monospace"
                          >
                            {a.label}
                          </text>
                        </g>
                      ))}
                      {/* area fill */}
                      <path
                        d={CPATH + " L470,220 L40,220 Z"}
                        fill="url(#areaGrad)"
                        style={{ opacity: draw > 0.02 ? Math.min(1, draw * 2.5) : 0 }}
                      />
                      {/* line — whole line shifts grey→green */}
                      <path
                        d={CPATH}
                        fill="none"
                        stroke={lineRgb}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: CTOTAL,
                          strokeDashoffset: CTOTAL * (1 - draw),
                        }}
                      />
                      {/* particles hovering along the drawn line */}
                      {pts.map((p, i) => (
                        <circle
                          key={`pt${i}`}
                          cx={p.x} cy={p.y} r={p.sz}
                          fill={lineRgb}
                          opacity={p.op}
                        />
                      ))}
                      {/* main dot at tip of drawn line */}
                      {draw > 0.01 && (
                        <circle
                          cx={tipX} cy={tipY} r={6}
                          fill={lineRgb}
                          style={{ filter: draw > 0.5 ? "url(#bigGlow)" : "url(#greenGlow)" }}
                        />
                      )}
                    </svg>
                  </div>
                  {/* right: side table */}
                  <div className="w-[220px] shrink-0 self-center">
                    <table className="w-full border-collapse font-mono text-[13px]">
                      <thead>
                        <tr>
                          <th className="border-b border-white/15 pb-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-white/60" />
                          <th className="border-b border-white/15 pb-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-white/50">
                            Start
                          </th>
                          <th className="border-b border-white/15 pb-2.5 text-right text-[10px] font-medium uppercase tracking-wider text-[#22c55e]" style={{ textShadow: "0 0 10px rgba(34,197,94,0.5)" }}>
                            Now
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {TBL.map((row) => (
                          <tr key={row.metric}>
                            <td className="border-b border-white/5 py-2.5 text-white/70">
                              {row.metric}
                            </td>
                            <td className="border-b border-white/5 py-2.5 text-right text-white/40">
                              {row.w1}
                            </td>
                            <td
                              className="border-b border-white/5 py-2.5 text-right font-semibold"
                              style={{ color: "#22c55e", textShadow: "0 0 10px rgba(34,197,94,0.4)" }}
                            >
                              {row.now}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Fade show={show(4200)} duration={400}>
                  <p className="mt-3 text-center text-[14px] text-white/30">
                    Every decision makes it smarter. Performance compounds.
                  </p>
                </Fade>
              </div>
            );
          })()}

          {/* pause screen — brand name between loops */}
          {isPause && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: "sceneIn 400ms cubic-bezier(.22,1,.36,1)" }}
            >
              <span className="font-sans text-[32px] font-bold tracking-[-0.5px] text-white/60">
                Qorpera
              </span>
            </div>
          )}
        </div>
      </div>

      {/* progress */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"
          style={{
            width: `${Math.min((elapsed / DEMO_TOTAL) * 100, 100)}%`,
            transition: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Main landing page
   ──────────────────────────────────────────── */

export function LandingClient() {
  return (
    <div>
      {/* ═══════════════════════════════════════
          HERO — dark
          ═══════════════════════════════════════ */}
      <section className="px-6 pb-[100px] pt-[116px] text-center lg:px-10">
        <FadeUp>
          <div className="mb-6 inline-flex items-center gap-2 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
            <span className="inline-block h-px w-6 bg-[var(--accent)]" />
            AI workforce integration for growing businesses
          </div>
        </FadeUp>

        <FadeUp delay={100}>
          <h1 className="mx-auto max-w-[820px] font-sans text-[clamp(40px,5.5vw,64px)] font-bold leading-[1.1] tracking-[-1.5px] text-[var(--ink)]">
            AI can run your operations.
            <br />
            <span className="text-[var(--accent)]">
              It just doesn&apos;t know your business yet.
            </span>
          </h1>
        </FadeUp>

        <FadeUp delay={250}>
          <p className="mx-auto mt-7 max-w-[620px] font-serif text-[20px] leading-[1.6] text-[var(--ink-soft)]">
            Qorpera teaches AI how your company works — your departments, your
            customers, your tools, your policies — then gradually lets it take
            over the tasks your team shouldn&apos;t be doing manually.
          </p>
        </FadeUp>

        <FadeUp delay={400}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/contact"
              className="rounded-[10px] bg-[var(--accent)] px-8 py-3.5 font-sans text-base font-semibold text-white no-underline shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition hover:-translate-y-px hover:bg-[var(--accent-dim)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)]"
            >
              Get in contact
            </a>
            <a
              href="#how"
              className="rounded-[10px] border-[1.5px] border-[var(--border)] bg-transparent px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:border-[var(--ink-muted)] hover:bg-white"
            >
              See how it works
            </a>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════
          THE GAP — dark
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--ink)] px-6 py-[100px] text-white lg:px-10">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="mb-10 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-white/40">
            The integration gap
          </div>

          <div className="mb-12 flex flex-wrap items-end justify-center gap-16 max-sm:gap-8">
            <div className="text-center">
              <div className="font-sans text-[88px] font-bold leading-none tracking-[-3px] max-sm:text-[56px]">
                85%
              </div>
              <div className="mt-2 font-sans text-sm font-medium text-white/50">
                of business operations tasks
                <br />
                AI can already perform
              </div>
            </div>
            <div className="mb-9 text-[40px] text-[var(--accent)] max-sm:hidden">
              &rarr;
            </div>
            <div className="text-center">
              <div className="font-sans text-[88px] font-bold leading-none tracking-[-3px] text-white/25 max-sm:text-[56px]">
                20%
              </div>
              <div className="mt-2 font-sans text-sm font-medium text-white/50">
                of those tasks businesses
                <br />
                are actually using AI for
              </div>
            </div>
          </div>

          <p className="mx-auto mb-3 max-w-[640px] font-serif text-[22px] leading-[1.5] text-white/70 max-sm:text-lg">
            The gap isn&apos;t intelligence. AI is smart enough.{" "}
            <strong className="text-white">
              The gap is that AI doesn&apos;t know your business
            </strong>{" "}
            — your customers, your team, your processes, your tools. Without that
            context, it can&apos;t do real work.
          </p>
          <p className="mb-12 font-sans text-xs text-white/30">
            Source:{" "}
            <a
              href="https://www.anthropic.com/research/labor-market-impacts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 no-underline hover:text-white/60"
            >
              Anthropic, &ldquo;Labor market impacts of AI,&rdquo; March 2026
            </a>
          </p>

          {/* Three barriers */}
          <div className="grid gap-4 text-left sm:grid-cols-3">
            {[
              {
                tag: "Solved by others",
                tagColor: "text-[var(--green-soft)]",
                title: "Model limitations",
                desc: "Being solved by the labs every quarter.",
              },
              {
                tag: "Qorpera",
                tagColor: "text-[var(--accent)]",
                title: "Additional software tools",
                desc: "The infrastructure that connects AI to a specific business.",
              },
              {
                tag: "Qorpera",
                tagColor: "text-[var(--accent)]",
                title: "Human review of AI work",
                desc: "The trust mechanism that lets humans hand off responsibility safely.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-[var(--radius)] border border-white/10 bg-white/5 p-5"
              >
                <span className={`font-sans text-[11px] font-bold uppercase tracking-[1.5px] ${b.tagColor}`}>
                  {b.tag}
                </span>
                <h3 className="mt-2 font-sans text-base font-semibold text-white">
                  {b.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-white/50">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-sans text-sm font-medium text-white/50">
            Qorpera solves barriers 2 and 3: the infrastructure layer and the trust layer.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SEE IT WORK — interactive demo
          ═══════════════════════════════════════ */}
      <section className="border-t border-white/5 bg-[var(--ink)] px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              See it work
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px] text-white">
              Five layers. One intelligence.
            </h2>
            <p className="mt-5 max-w-[620px] font-serif text-lg leading-[1.6] text-white/50">
              Qorpera turns disconnected business tools into a single
              operational intelligence that watches, reasons, acts, and learns.
            </p>
          </FadeUp>

          <FadeUp delay={200}>
            <ScenarioDemo />
          </FadeUp>

          <FadeUp delay={100}>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <p className="text-[15px] leading-[1.6] text-white/30">
                Every layer runs continuously, across every department.
              </p>
              <a
                href="/how-it-works"
                className="shrink-0 font-sans text-[13px] font-semibold text-[var(--accent)] no-underline transition hover:text-white"
              >
                See the full architecture &rarr;
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          TRUST GRADIENT — visual
          ═══════════════════════════════════════ */}
      <section id="how" className="bg-white px-6 py-[120px] lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              The trust gradient
            </div>
            <h2 className="max-w-[820px] font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              AI autonomy isn&apos;t a switch you flip.
              <br className="hidden sm:block" />
              It&apos;s something the system earns.
            </h2>
          </FadeUp>

          <div className="relative mt-16">
            {/* connecting line — desktop only */}
            <div className="absolute left-[16.67%] right-[16.67%] top-[19px] hidden h-px bg-[var(--border)] sm:block" />

            <div className="grid gap-10 sm:grid-cols-3">
              {[
                {
                  n: 1,
                  time: "Week 1+",
                  title: "Observe",
                  desc: "The AI monitors your operations across every connected tool. It surfaces situations with the full cross-system context to understand them.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Situation detected
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Invoice #4071 — 14 days overdue
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/30">
                        Sentiment ↓ &middot; Renewal in 60 days
                      </p>
                    </div>
                  ),
                },
                {
                  n: 2,
                  time: "Weeks 2–4+",
                  title: "Propose",
                  desc: "The AI recommends specific actions. You see exactly what it wants to do and why. Approve, edit, or reject — every response teaches it.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Recommended action
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Personal check-in before reminder
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <span className="rounded bg-[#22c55e]/20 px-2 py-0.5 font-mono text-[10px] text-[#22c55e]">
                          Approve
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/30">
                          Edit
                        </span>
                        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/30">
                          Reject
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  n: 3,
                  time: "Month 2+",
                  title: "Act",
                  desc: "As proposal accuracy increases, the AI is gradually given more autonomous privileges — one task type at a time. Full visibility. Instant revoke.",
                  card: (
                    <div className="mt-5 rounded-lg bg-[#0f1117] p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Handled automatically
                        </span>
                      </div>
                      <p className="font-sans text-[13px] font-medium text-white/80">
                        Follow-up sent &middot; CRM updated
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-white/30">
                        Accuracy: 94% &middot; 47 decisions
                      </p>
                    </div>
                  ),
                },
              ].map((phase, i) => (
                <FadeUp key={phase.title} delay={i * 100}>
                  <div className="text-center">
                    <div className="relative mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white font-sans text-sm font-bold text-[var(--accent)]">
                      {phase.n}
                    </div>
                    <div className="mb-1 font-mono text-[11px] font-medium text-[var(--ink-muted)]">
                      {phase.time}
                    </div>
                    <h3 className="mb-2 font-sans text-[22px] font-bold text-[var(--ink)]">
                      {phase.title}
                    </h3>
                    <p className="mx-auto max-w-[300px] text-[15px] leading-[1.6] text-[var(--ink-soft)]">
                      {phase.desc}
                    </p>
                    {phase.card}
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>

          <FadeUp>
            <p className="mt-12 max-w-[800px] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
              Every other AI tool either has permission or it doesn&apos;t.
              Automations just run. Copilots wait to be asked. Qorpera is the
              only system where AI earns autonomy through demonstrated
              competence — one task type at a time.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          USE CASES — redirect
          ═══════════════════════════════════════ */}
      <section className="bg-[var(--surface-warm)] px-6 py-[100px] text-center lg:px-10">
        <div className="mx-auto max-w-[700px]">
          <FadeUp>
            <div className="mb-4 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-[var(--accent)]">
              Use cases
            </div>
            <h2 className="font-sans text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] tracking-[-0.5px]">
              See how it works across your business.
            </h2>
            <p className="mt-5 text-lg leading-[1.6] text-[var(--ink-soft)]">
              Animated walkthroughs across sales, finance, operations, HR, IT,
              and more — showing how Qorpera detects real situations and how it
              could respond.
            </p>
            <div className="mt-8">
              <a
                href="/use-cases"
                className="inline-block rounded-[10px] border-[1.5px] border-[var(--border)] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:border-[var(--ink-muted)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                Discover use cases &rarr;
              </a>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA
          ═══════════════════════════════════════ */}
      <section
        id="cta"
        className="border-t border-white/10 bg-[var(--ink)] px-6 py-[100px] text-center text-white lg:px-10"
      >
        <div className="mx-auto max-w-[520px]">
          <FadeUp>
            <h2 className="font-sans text-[clamp(28px,3.5vw,44px)] font-bold tracking-[-0.5px]">
              With Qorpera, getting in front of the curve is permanent.
            </h2>
            <p className="mt-4 text-lg leading-[1.6] text-white/40">
              The future of work is data driven. When our system collects and
              learns from your data, late adopters won&apos;t be able to catch
              up.
            </p>
          </FadeUp>
          <FadeUp delay={100}>
            <div className="mt-10">
              <a
                href="/contact"
                className="inline-block rounded-[10px] bg-white px-8 py-3.5 font-sans text-base font-semibold text-[var(--ink)] no-underline transition hover:-translate-y-px hover:bg-[#f0f0f0]"
              >
                Get in contact
              </a>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
