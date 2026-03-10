"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-drift", duration: 9625 },
  { id: "the-conflict", duration: 10500 },
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

export default function PolicyDrift() {
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Legal</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Policy Nobody<br/>Updated</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Handbook says 3 remote days. Team leads allow 4. One department is fully remote. When HR enforces the written policy, 12 people file complaints.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The real policy isn&apos;t what&apos;s written.<br/>It&apos;s what&apos;s practiced.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Drift */}
        {show("the-drift") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Policy vs Practice</div></Fade>
              <Fade show delay={400} duration={500}>
                <div style={{ padding: "12px 16px", background: "#3b82f608", border: "1px solid #3b82f620", borderRadius: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 14, color: "#3b82f6", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>Written Policy</div>
                  <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 600 }}>&ldquo;3 remote days per week.&rdquo;</div>
                </div>
              </Fade>
              <Fade show delay={800} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 16 }}>
                  {[
                    { dept: "Engineering (14 people)", practice: "5 remote days — fully remote since 2024", color: "#ef4444", match: "Drifted" },
                    { dept: "Sales (8 people)", practice: "4 remote days — manager approved", color: "#f59e0b", match: "Drifted" },
                    { dept: "Marketing", practice: "3 remote days — following policy", color: "#22c55e", match: "Aligned" },
                    { dept: "Operations", practice: "3 remote days — following policy", color: "#22c55e", match: "Aligned" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={1000 + i * 400} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a2e" : "none" }}>
                        <div>
                          <div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600 }}>{row.dept}</div>
                          <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>{row.practice}</div>
                        </div>
                        <span style={{ fontSize: 13, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{row.match}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Half the company follows the policy.<br/><span style={{ color: "#ef4444" }}>Half doesn&apos;t.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>HR thinks everyone follows the 3-day policy. They don&apos;t know about the VP-approved exception or the manager-level override.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Conflict */}
        {show("the-conflict") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Enforcement</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "12px 16px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 15, color: "#f59e0b", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>HR Announcement</div>
                  <div style={{ fontSize: 17, color: "#e2e8f0", lineHeight: 1.5 }}>&ldquo;Policy reminder: 3 remote days maximum.&rdquo;</div>
                </div>
              </Fade>
              <Fade show delay={900} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 16 }}>
                  {[
                    { from: "Engineering (14 people)", text: "\"We&apos;ve been fully remote for 2 years. Our VP approved it.\"", color: "#ef4444" },
                    { from: "Sales (8 people)", text: "\"Our manager said 4 days is fine.\"", color: "#f59e0b" },
                    { from: "Result", text: "12 formal complaints. 3 threat-to-resign emails.", color: "#ef4444" },
                    { from: "VP Engineering → CEO", text: "\"I never agreed to this.\"", color: "#a855f7" },
                    { from: "HR → CEO", text: "\"We&apos;re just enforcing our own policy.\"", color: "#3b82f6" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={1100 + i * 450} duration={400} direction="left" distance={12}>
                      <div style={{ padding: "8px 0", borderBottom: i < 4 ? "1px solid #1a1a2e" : "none" }}>
                        <div style={{ fontSize: 14, color: row.color, fontFamily: "'JetBrains Mono'", marginBottom: 2 }}>{row.from}</div>
                        <div style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.5 }}>{row.text}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The policy was clear.<br/>The practice had drifted.<br/><span style={{ color: "#ef4444" }}>Nobody tracked the gap.</span></div></Fade>
              <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Now 22 people are upset and leadership is in conflict. The policy was never wrong — it just stopped being true.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the drift</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>POLICY DRIFT: Remote work policy (3 days) — 2 of 4 departments practicing different terms</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Engineering: fully remote (VP-approved, 14 employees). Sales: 4 days (manager-approved, 8 employees). Drift duration: Engineering 24 months, Sales 8 months. Risk: enforcement would affect 22 employees.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "22", label: "Employees affected", color: "#ef4444" },
                  { value: "2", label: "Depts drifted", color: "#f59e0b" },
                  { value: "24mo", label: "Longest drift", color: "#3b82f6" },
                  { value: "3 vs 5", label: "Day gap", color: "#ef4444" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'" }}>{stat.value}</div>
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Before enforcement<br/><span style={{ color: "#ef4444" }}>becomes a crisis</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Flag policy-practice gap to HR and leadership", color: "#ef4444" },
                    { n: "2", text: "Document current actual practices by department", color: "#f59e0b" },
                    { n: "3", text: "Recommend: update policy to match practice, or get explicit department exceptions", color: "#3b82f6" },
                    { n: "4", text: "Do NOT enforce outdated policy without leadership alignment", color: "#22c55e" },
                  ].map((a, i) => (
                    <Fade key={i} show delay={1400 + i * 400} duration={350} direction="left" distance={15}>
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Handbooks track policies.<br/><span style={{ color: "#ef4444" }}>Qorpera tracks what people actually do.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Policies drift silently. By the time enforcement catches up, the gap between paper and practice has created its own expectations. Activity intelligence surfaces the drift before it becomes a conflict.</div></Fade>
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
