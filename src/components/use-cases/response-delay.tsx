"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-numbers", duration: 9625 },
  { id: "the-bottleneck", duration: 10500 },
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

export default function ResponseDelay() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current); if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
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
        restartTimerRef.current = setTimeout(() => {
          startAnimation();
        }, 3000);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    startAnimation(target);
  }, [startAnimation]);

  useEffect(() => {
    startAnimation();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [startAnimation]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { if (elapsed < acc + SCENES[i].duration) { currentScene = SCENES[i].id; currentSceneIndex = i; break; } acc += SCENES[i].duration; }
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#ef4444 1px,transparent 1px),linear-gradient(90deg,#ef4444 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Customer Support</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The SLA<br/>Nobody Hit</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Average response time: 4 hours. SLA target: 2 hours.<br/>40% of tickets breach. The bottleneck: Tier 2 queue<br/>has 3 agents handling 200 tickets.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>SLA breaches aren&apos;t a people problem.<br/>They&apos;re a visibility problem.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Numbers */}
        {show("the-numbers") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>SLA Performance</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e3a", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Target</span>
                    <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600 }}>2-hour first response</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e3a", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Actual</span>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600 }}>4.2 hours average</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e1e3a", marginBottom: 12 }}>
                    <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Breach rate</span>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600 }}>40% of tickets</span>
                  </div>
                </div>
              </Fade>
              <Fade show delay={1200} duration={500}>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { tier: "Tier 1", desc: "Simple questions", avg: "45 min", status: "Within SLA", color: "#22c55e" },
                    { tier: "Tier 2", desc: "Technical issues", avg: "8.5 hours", status: "4x over SLA", color: "#ef4444" },
                    { tier: "Tier 3", desc: "Escalations", avg: "2.1 hours", status: "Within SLA", color: "#22c55e" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={1400 + i * 300} duration={400}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: `${row.color}06`, border: `1px solid ${row.color}15`, borderRadius: 8 }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{row.tier}</span>
                          <span style={{ fontSize: 14, color: "#64748b", marginLeft: 8 }}>{row.desc}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: row.color }}>{row.avg}</span>
                          <span style={{ fontSize: 13, color: "#4a5568", marginLeft: 8 }}>{row.status}</span>
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The average<br/><span style={{ color: "#ef4444" }}>hides the problem.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Tier 1 and Tier 3 are fine. Tier 2 is drowning. But the dashboard shows one number: &quot;4.2 hours average.&quot; That average masks a crisis hiding in plain sight.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Bottleneck */}
        {show("the-bottleneck") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Workload Distribution</div></Fade>
              {[
                { tier: "Tier 1", agents: 8, tickets: 120, perAgent: 15, color: "#22c55e" },
                { tier: "Tier 2", agents: 3, tickets: 200, perAgent: 67, color: "#ef4444" },
                { tier: "Tier 3", agents: 2, tickets: 30, perAgent: 15, color: "#22c55e" },
              ].map((row, i) => (
                <Fade key={i} show delay={400 + i * 500} duration={500}>
                  <div style={{ padding: "16px 20px", background: "#0f0f24", border: `1px solid ${row.color}20`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0" }}>{row.tier}</span>
                      <span style={{ fontSize: 15, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{row.perAgent} tickets/agent/week</span>
                    </div>
                    <div style={{ display: "flex", gap: 16 }}>
                      <span style={{ fontSize: 14, color: "#64748b" }}>{row.agents} agents</span>
                      <span style={{ fontSize: 14, color: "#64748b" }}>{row.tickets} tickets/week</span>
                    </div>
                    <div style={{ marginTop: 8, height: 4, background: "#1a1a2e", borderRadius: 2 }}>
                      <div style={{ height: "100%", background: row.color, borderRadius: 2, width: `${Math.min((row.perAgent / 67) * 100, 100)}%` }} />
                    </div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2000} duration={500}>
                <div style={{ marginTop: 12, padding: "10px 16px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 8 }}>
                  <div style={{ fontSize: 15, color: "#f59e0b", fontFamily: "'JetBrains Mono'" }}>60 of 200 Tier 2 tickets don&apos;t require Tier 2 skills</div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The queue isn&apos;t too big.<br/><span style={{ color: "#f59e0b" }}>The routing is wrong.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Tier 2 agents handle 4.5x the load of other tiers. But 30% of their tickets are misrouted Tier 1 issues that shouldn&apos;t be there. The bottleneck isn&apos;t capacity — it&apos;s classification.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the bottleneck</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>SLA BOTTLENECK: Tier 2 queue at 4.5x agent capacity</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  30% of Tier 2 tickets are misrouted Tier 1 issues. If correctly routed: Tier 2 load drops from 67 to 47 tickets/agent/week. Projected SLA improvement: from 40% breach to under 10%.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "67", label: "Tickets/agent (T2)", color: "#ef4444" },
                  { value: "30%", label: "Misrouted", color: "#f59e0b" },
                  { value: "47", label: "After fix", color: "#22c55e" },
                  { value: "<10%", label: "Projected breach", color: "#22c55e" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'", marginBottom: 4 }}>{stat.value}</div>
                      <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{stat.label}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {/* Scene 5: Action */}
        {show("action") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Actions</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Fix the routing,<br/><span style={{ color: "#22c55e" }}>fix the SLA.</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Reclassify 60 misrouted tickets and move them to the Tier 1 queue", color: "#22c55e" },
                    { n: "2", text: "Update routing rules to prevent future misclassification of simple issues", color: "#3b82f6" },
                    { n: "3", text: "Move 1 Tier 1 agent to Tier 2 temporarily to clear the backlog", color: "#a855f7" },
                    { n: "4", text: "Implement weekly queue balance review to catch imbalances early", color: "#f59e0b" },
                  ].map((a, i) => (
                    <Fade key={i} show delay={1400 + i * 350} duration={350} direction="left" distance={15}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, textAlign: "left" }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.n}</div>
                        <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.4 }}>{a.text}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </Fade>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Help desks track response times.<br/><span style={{ color: "#ef4444" }}>Qorpera tracks why they&apos;re slow.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>SLA dashboards show you the breach rate. Activity intelligence shows you the misrouted tickets, the overloaded queues, and the one change that fixes 30% of the problem overnight.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#ef4444,#dc2626)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
