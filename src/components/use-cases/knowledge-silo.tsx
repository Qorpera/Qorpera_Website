"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "signal-slack", duration: 10500 },
  { id: "signal-calendar", duration: 9625 },
  { id: "signal-docs", duration: 9625 },
  { id: "signal-pto", duration: 7875 },
  { id: "detection", duration: 10500 },
  { id: "action", duration: 9625 },
  { id: "close", duration: 7875 },
];
const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

interface FadeProps {
  show: boolean;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const Fade = ({ show, delay = 0, duration = 600, direction = "up", distance = 24, children, style = {} }: FadeProps) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { if (show) { const t = setTimeout(() => setVis(true), delay * .5); return () => clearTimeout(t); } setVis(false); }, [show, delay]);
  const d = { up:[0,distance], down:[0,-distance], left:[distance,0], right:[-distance,0], none:[0,0] }[direction]||[0,0];
  return <div style={{ opacity:vis?1:0, transform:vis?"translate(0,0)":`translate(${d[0]}px,${d[1]}px)`, transition:`opacity ${duration * .5}ms cubic-bezier(.22,1,.36,1), transform ${duration * .5}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

interface ToolBadgeProps {
  name: string;
  icon: string;
  color: string;
  show: boolean;
  delay: number;
}

const ToolBadge = ({ name, icon, color, show, delay }: ToolBadgeProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10 }}>
      <span style={{ fontSize: 24 }}>{icon}</span><span style={{ fontSize: 18, color, fontWeight: 500 }}>{name}</span>
    </div>
  </Fade>
);

interface PersonBarProps {
  name: string;
  pct: number;
  color: string;
  label: string;
  show: boolean;
  delay: number;
}

const PersonBar = ({ name, pct, color, label, show, delay }: PersonBarProps) => (
  <Fade show={show} delay={delay} duration={500} style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 90, fontSize: 18, color: "#e2e8f0", textAlign: "right", fontWeight: 500 }}>{name}</div>
      <div style={{ flex: 1, height: 30, borderRadius: 6, background: "#1e1e3a", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 6, background: `linear-gradient(90deg, ${color}, ${color}80)`, transition: "width 1s ease" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{pct}%{label ? ` — ${label}` : ""}</div>
      </div>
    </div>
  </Fade>
);

export default function KnowledgeSilo() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
  }, []);

  const start = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    stop();
    setElapsed(fromElapsed);
    startRef.current = Date.now() - fromElapsed;
    const tick = () => {
      if (!startRef.current) return;
      const now = Date.now() - startRef.current;
      setElapsed(now);
      if (now < TOTAL) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        startRef.current = null;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  // Auto-start on mount
  useEffect(() => {
    start();
    return () => {
      stop();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-restart after 3s when animation finishes
  useEffect(() => {
    if (elapsed >= TOTAL && !startRef.current) {
      restartTimerRef.current = setTimeout(() => {
        start();
      }, 3000);
      return () => {
        if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
      };
    }
  }, [elapsed, start]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { const s = SCENES[i]; if (elapsed < acc + s.duration) { currentScene = s.id; currentSceneIndex = i; break; } acc += s.duration; }
  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    start(target);
  }, [start]);

  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Engineering</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Knowledge Silo</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>One person holds all the context on a critical system.<br/>The bus factor is 1. And the bus is about to leave.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Knowledge concentration is invisible<br/>until the person is gone.</div></Fade>
          </div>
        )}

        {show("signal-slack") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Slack" icon="💬" color="#e879a0" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>80% of questions go to<br/><span style={{ color: "#e879a0" }}>the same person</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>In the #payments-system channel, nearly every technical question gets directed to or answered by Daniel. Other engineers defer to him or tag him directly.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>Who answers technical questions in #payments-system</div></Fade>
              <PersonBar name="Daniel" pct={81} color="#e879a0" label="148 answers" show delay={700} />
              <PersonBar name="Ava" pct={9} color="#4a5568" label="16 answers" show delay={1000} />
              <PersonBar name="Chris" pct={6} color="#4a5568" label="11 answers" show delay={1300} />
              <PersonBar name="Others" pct={4} color="#2a2a4a" label="8 answers" show delay={1600} />
              <Fade show delay={2400} duration={400}>
                <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                  {[
                    { q: '"Is this the right retry logic?"', tag: "@daniel" },
                    { q: '"Daniel, can you review this migration?"', tag: "@daniel" },
                  ].map((m, i) => (
                    <div key={i} style={{ flex: 1, padding: "8px 10px", background: "#e879a008", border: "1px solid #e879a018", borderRadius: 8 }}>
                      <div style={{ fontSize: 14, color: "#94a3b8", fontStyle: "italic" }}>{m.q}</div>
                      <div style={{ fontSize: 14, color: "#e879a0", fontFamily: "'JetBrains Mono'", marginTop: 2 }}>{m.tag}</div>
                    </div>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("signal-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>Daniel&apos;s calendar this week</div>
                  {[
                    { time: "Mon 9-10", title: "Payments architecture review", type: "meeting" },
                    { time: "Mon 2-3", title: "Incident postmortem (payments)", type: "meeting" },
                    { time: "Tue 10-11", title: "1:1 with 3 different engineers", type: "meeting" },
                    { time: "Wed 9-12", title: "Payments system deep-dive", type: "meeting" },
                    { time: "Thu 2-4", title: "Migration planning", type: "meeting" },
                    { time: "Fri all day", title: "Blocked: 'Documentation catch-up'", type: "blocked" },
                  ].map((m, i) => (
                    <Fade key={i} show delay={600 + i * 300} duration={300}>
                      <div style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #1e1e3a" }}>
                        <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'", minWidth: 70 }}>{m.time}</span>
                        <span style={{ fontSize: 17, color: m.type === "blocked" ? "#f59e0b" : "#e2e8f0" }}>{m.title}</span>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2600} duration={400}><div style={{ fontSize: 17, color: "#ef4444", marginTop: 10, fontWeight: 600 }}>95% utilization — zero slack time</div></Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Calendar" icon="📅" color="#f59e0b" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Calendar is 95% full.<br/><span style={{ color: "#f59e0b" }}>All payments-related.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Every meeting is about the payments system. He&apos;s in architecture reviews, incident postmortems, 1:1s with other engineers who need his context. He blocked Friday for &quot;documentation&quot; — the only sign he knows this is a problem.</div></Fade>
            </div>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Google Drive" icon="📁" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>No documentation<br/><span style={{ color: "#ef4444" }}>written in 4 months</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The payments system has 3 docs — all written by Daniel, all last edited 4+ months ago. The system has changed significantly since then. The documentation is effectively outdated.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { name: "Payments Architecture Overview", author: "Daniel", edited: "4 months ago", status: "outdated" },
                { name: "Stripe Integration Guide", author: "Daniel", edited: "5 months ago", status: "outdated" },
                { name: "Payment Retry Logic", author: "Daniel", edited: "4 months ago", status: "outdated" },
              ].map((d, i) => (
                <Fade key={i} show delay={600 + i * 450} duration={400}>
                  <div style={{ padding: "12px 16px", background: "#12122a", border: "1px solid #ef444418", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{d.name}</span>
                      <span style={{ padding: "2px 6px", background: "#ef444418", borderRadius: 4, fontSize: 14, color: "#ef4444" }}>{d.status}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>Author: {d.author} • Last edit: {d.edited}</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2200} duration={400}>
                <div style={{ fontSize: 17, color: "#64748b", textAlign: "center", marginTop: 8 }}>
                  14 commits to payment code since last doc update<br/>
                  <span style={{ color: "#ef4444" }}>All by Daniel. None documented.</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("signal-pto") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><ToolBadge name="Calendar" icon="🏖️" color="#ef4444" show delay={200} /></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 24, marginBottom: 12, lineHeight: 1.2 }}>Daniel just booked<br/><span style={{ color: "#ef4444" }}>3 weeks off</span></div></Fade>
            <Fade show delay={1400} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>Starting in 12 days. The only person who understands the payments system will be unreachable for 21 days. Documentation is 4 months stale.</div></Fade>
            <Fade show delay={2600} duration={500}><div style={{ fontSize: 20, color: "#ef4444", marginTop: 20, fontWeight: 600 }}>Bus factor: 1. The bus leaves in 12 days.</div></Fade>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera connects the risk</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 46, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Critical knowledge silo detected.<br/><span style={{ color: "#ef4444" }}>12 days to transfer or lose it.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>CRITICAL: Payments system — single point of failure</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Daniel answers 81% of payments questions. Calendar 95% utilized on payments work. Documentation 4 months stale (14 undocumented commits). PTO starts in 12 days (3 weeks). No other engineer has contributed to this system in 6 months.
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>No manager noticed. The AI saw the pattern across Slack, Calendar, and Drive.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Knowledge transfer<br/>before it&apos;s too late</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>12 days is enough for a structured knowledge transfer. 0 days is not. The AI proposes a plan that uses the remaining time wisely.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Alert Eng lead to knowledge concentration risk", tool: "Slack" },
                { step: "2", action: "Schedule daily pairing sessions: Daniel + Ava", tool: "Calendar" },
                { step: "3", action: "Block Daniel's calendar for doc updates", tool: "Calendar" },
                { step: "4", action: "Create runbook template for payments ops", tool: "Drive" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>via {s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Org charts show teams.<br/><span style={{ color: "#a855f7" }}>Qorpera shows dependencies.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>Knowledge concentration is invisible until someone leaves. Activity intelligence measures who actually holds the context — before the risk becomes a crisis.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{"\u2190 Back"}</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>{"Get Qorpera \u2192"}</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{"Next \u2192"}</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} • {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
