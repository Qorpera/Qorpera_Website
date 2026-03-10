"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-finding", duration: 9625 },
  { id: "the-pattern", duration: 10500 },
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

export default function AuditSurprise() {
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
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#ef4444 1px,transparent 1px),linear-gradient(90deg,#ef4444 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Finance</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Audit Finding</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Annual audit reveals 340 expense reports missing receipts. Each one is a compliance risk. Same 5 employees. Same category. Same issue every quarter.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Audit findings aren&apos;t surprises.<br/>They&apos;re patterns nobody tracked.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Finding */}
        {show("the-finding") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Audit Report Summary</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 22px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>340 EXPENSE REPORTS FLAGGED — MISSING RECEIPTS</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>Category: Travel &amp; Entertainment</div>
                  {[
                    { name: "Employee A", count: 82, pct: 24 },
                    { name: "Employee B", count: 67, pct: 20 },
                    { name: "Employee C", count: 58, pct: 17 },
                    { name: "Employee D", count: 72, pct: 21 },
                    { name: "Employee E", count: 61, pct: 18 },
                  ].map((emp, i) => (
                    <Fade key={i} show delay={700 + i * 300} duration={350} direction="left" distance={10}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 4 ? "1px solid #1a1a2e" : "none" }}>
                        <span style={{ fontSize: 14, color: "#e2e8f0", minWidth: 90 }}>{emp.name}</span>
                        <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${emp.pct * 3}%`, height: "100%", background: "#ef4444", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 600, minWidth: 30, textAlign: "right" }}>{emp.count}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>340 flagged reports.</div></Fade>
              <Fade show delay={1800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Not random — concentrated in 5 people.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Pattern */}
        {show("the-pattern") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Quarterly Pattern</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 22px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  {[
                    { quarter: "Q1", count: 78, bar: 57, note: "Flagged at audit" },
                    { quarter: "Q2", count: 84, bar: 62, note: "" },
                    { quarter: "Q3", count: 91, bar: 67, note: "Growing" },
                    { quarter: "Q4", count: 87, bar: 64, note: "" },
                  ].map((q, i) => (
                    <Fade key={i} show delay={600 + i * 450} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a2e" : "none" }}>
                        <span style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600, fontFamily: "'JetBrains Mono'", minWidth: 32 }}>{q.quarter}</span>
                        <div style={{ flex: 1, height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${q.bar}%`, height: "100%", background: `linear-gradient(90deg, #ef4444, #f59e0b)`, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 16, color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 600, minWidth: 30, textAlign: "right" }}>{q.count}</span>
                        {q.note && <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono'", minWidth: 70 }}>{q.note}</span>}
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
              <Fade show delay={2600} duration={400}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "12px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>Same employees</div>
                    <div style={{ fontSize: 20, color: "#ef4444", fontWeight: 700, fontFamily: "'Space Grotesk'" }}>Every quarter</div>
                  </div>
                  <div style={{ flex: 1, padding: "12px 16px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>Unverified spend</div>
                    <div style={{ fontSize: 20, color: "#f59e0b", fontWeight: 700, fontFamily: "'Space Grotesk'" }}>&euro;124K total</div>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1000} duration={700}><div style={{ fontSize: 36, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>This isn&apos;t a one-time finding.</div></Fade>
              <Fade show delay={1800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>It&apos;s a structural gap that nobody addressed between audits.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the pattern</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>EXPENSE COMPLIANCE: 5 employees consistently filing T&amp;E without receipts</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Pattern spans 4 quarters, 340 total reports, &euro;124K unverified. Same employees flagged in last audit — no corrective action taken. Next audit: 3 months.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "340", label: "Reports flagged", color: "#ef4444" },
                  { value: "5", label: "Repeat offenders", color: "#f59e0b" },
                  { value: "€124K", label: "Unverified spend", color: "#ef4444" },
                  { value: "4", label: "Quarters running", color: "#64748b" },
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Actions</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Stop finding the same problem<br/><span style={{ color: "#ef4444" }}>every 12 months.</span></div></Fade>
            <Fade show delay={1400} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Implement receipt-required validation in expense system for all T&E submissions", color: "#ef4444" },
                    { n: "2", text: "Schedule manager review for 5 flagged employees — recurring non-compliance", color: "#f59e0b" },
                    { n: "3", text: "Create monthly receipt compliance report (not annual)", color: "#3b82f6" },
                    { n: "4", text: "Set automatic hold on submissions over €200 without receipt attachment", color: "#22c55e" },
                  ].map((a, i) => (
                    <Fade key={i} show delay={1600 + i * 400} duration={350} direction="left" distance={15}>
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Auditors find problems once a year.<br/><span style={{ color: "#ef4444" }}>Qorpera finds them as they happen.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every company has compliance gaps that only surface at audit time. Activity intelligence monitors expense patterns continuously — flagging repeat offenders, missing documentation, and growing risks before they become findings.</div></Fade>
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
