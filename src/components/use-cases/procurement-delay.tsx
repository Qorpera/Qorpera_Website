"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-request", duration: 9625 },
  { id: "the-cost", duration: 10500 },
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

export default function ProcurementDelay() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#06b6d4 1px,transparent 1px),linear-gradient(90deg,#06b6d4 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Supply Chain</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Approval That<br/>Took 3 Weeks</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Urgent material order needs 4 signatures. Two approvers are traveling. Production line waits. &euro;12K per day in idle capacity.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The bottleneck isn&apos;t in the supply chain.<br/>It&apos;s in the approval chain.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Request */}
        {show("the-request") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Approval Chain — PO #4421</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { day: "Day 1", step: "Purchase request submitted", status: "Submitted", color: "#22c55e" },
                    { day: "Day 2", step: "Manager approval", status: "Approved", color: "#22c55e" },
                    { day: "Day 5", step: "Finance review", status: "Reviewer on leave", color: "#f59e0b" },
                    { day: "Day 12", step: "VP approval", status: "Missed in inbox", color: "#ef4444" },
                    { day: "Day 16", step: "Final sign-off", status: "Waiting...", color: "#64748b" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 400} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ minWidth: 50, fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{row.day}</div>
                        <div style={{ flex: 1, fontSize: 16, color: "#cbd5e1" }}>{row.step}</div>
                        <div style={{ padding: "3px 10px", background: `${row.color}10`, border: `1px solid ${row.color}25`, borderRadius: 6, fontSize: 13, color: row.color, fontFamily: "'JetBrains Mono'", whiteSpace: "nowrap" }}>{row.status}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>&euro;48K order.<br/>4 approvers.<br/><span style={{ color: "#f59e0b" }}>16 days and counting.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>The finance reviewer has been on leave since Day 3 with no delegate assigned. The VP&apos;s approval email sits unread in an inbox with 2,400 messages.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Cost */}
        {show("the-cost") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Cost Mounting Daily</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { period: "Day 1-3", impact: "Production running on reserve stock", color: "#22c55e" },
                    { period: "Day 4-8", impact: "Stock depleted, line slowed to 60% capacity", color: "#f59e0b" },
                    { period: "Day 9-16", impact: "Line idle, 12 workers reassigned to other tasks", color: "#ef4444" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 500} duration={400}>
                      <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < 2 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ minWidth: 70, fontSize: 14, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{row.period}</div>
                        <div style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.4 }}>{row.impact}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
              <Fade show delay={2400} duration={400}>
                <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "12px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'" }}>&euro;192K</div>
                    <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Lost capacity</div>
                  </div>
                  <div style={{ flex: 1, padding: "12px 16px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Grotesk'" }}>&euro;28K</div>
                    <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Expedited shipping</div>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The materials cost &euro;48K.<br/><span style={{ color: "#ef4444" }}>The delay cost &euro;220K.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>16 days of idle capacity at &euro;12K per day. Plus &euro;28K in expedited shipping when the order finally went through. An approval bottleneck that cost 4.5x the purchase order itself.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the bottleneck</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 700, margin: "0 auto 24px", padding: "20px 28px", background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>APPROVAL BOTTLENECK: Purchase order #4421 pending 8 days</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  2 of 4 approvals complete. Finance reviewer: on leave since Day 3 (no delegate assigned). VP: email unopened. Production impact: line idle since Day 9. Daily cost: &euro;12K.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "8 days", label: "Stuck in approval", color: "#f59e0b" },
                  { value: "2 of 4", label: "Approvals done", color: "#64748b" },
                  { value: "\u20ac12K/day", label: "Idle line cost", color: "#ef4444" },
                  { value: "\u20ac48K", label: "Order value", color: "#06b6d4" },
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Actions</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Unblock the order.<br/><span style={{ color: "#06b6d4" }}>Fix the process.</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Route finance approval to designated delegate — reviewer on leave with no backup", color: "#ef4444" },
                    { n: "2", text: "Escalate VP approval with idle-line cost context — \u20ac12K/day is accumulating", color: "#f59e0b" },
                    { n: "3", text: "Flag approval policy: add auto-escalation at 48-hour delay for production-critical POs", color: "#06b6d4" },
                    { n: "4", text: "Alert production planning to expect 3-day lead time after approval clears", color: "#22c55e" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>ERP tracks purchase orders.<br/><span style={{ color: "#06b6d4" }}>Qorpera tracks what&apos;s stuck and why.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>The purchase order wasn&apos;t lost — it was stuck between two absent approvers. Activity intelligence spots approval bottlenecks and their production impact before idle days become idle weeks.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#06b6d4,#0891b2)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
