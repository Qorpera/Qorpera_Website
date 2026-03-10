"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-promise", duration: 9625 },
  { id: "the-trigger", duration: 10500 },
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

export default function ContractRisk() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Clause That<br/>Bit Back</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Standard client contract has a 60-day termination clause. Sales promised 30 days verbally. 14 contracts signed with the wrong terms. Legal finds out when a client exercises it.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most dangerous clause is the one<br/>you forgot you changed.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Promise */}
        {show("the-promise") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Email Trail</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 20 }}>
                  {[
                    { sender: "Sales Rep → Client", text: "Of course — we can do 30-day termination. I&apos;ll have the contract updated.", color: "#3b82f6", icon: "→" },
                    { sender: "Client → Sales Rep", text: "Great, let&apos;s proceed.", color: "#22c55e", icon: "←" },
                    { sender: "Contract sent", text: "Standard template (still says 60 days in clause 14.2)", color: "#f59e0b", icon: "📄" },
                    { sender: "Client signs", text: "Doesn&apos;t read clause 14.2. Trusts the conversation.", color: "#64748b", icon: "✓" },
                  ].map((e, i) => (
                    <Fade key={i} show delay={600 + i * 500} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a2e" : "none" }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: e.color, background: `${e.color}10`, border: `1px solid ${e.color}20`, flexShrink: 0, marginTop: 2 }}>{e.icon}</div>
                        <div>
                          <div style={{ fontSize: 14, color: e.color, fontFamily: "'JetBrains Mono'", marginBottom: 2 }}>{e.sender}</div>
                          <div style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.5 }}>{e.text}</div>
                        </div>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2800} duration={400}>
                    <div style={{ marginTop: 10, padding: "8px 14px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                      <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>14 contracts later: same verbal promise, same standard template</span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Sales promised 30 days.<br/><span style={{ color: "#ef4444" }}>The contract says 60.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The client trusted the conversation. Legal trusts the paper. Nobody checked if they match.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Trigger */}
        {show("the-trigger") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Month 8 — The Incident</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 20 }}>
                  {[
                    { label: "Client A invokes", value: "30-day termination (per verbal agreement)", color: "#3b82f6" },
                    { label: "Legal responds", value: "\"Contract says 60 days.\"", color: "#f59e0b" },
                    { label: "Client produces", value: "Email from sales: \"30-day termination, no problem.\"", color: "#ef4444" },
                    { label: "Legal exposure", value: "14 contracts with same discrepancy", color: "#ef4444" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={600 + i * 500} duration={400}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a2e" : "none" }}>
                        <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", minWidth: 140, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: 17, color: row.color, fontWeight: 500, textAlign: "right" }}>{row.value}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
              <Fade show delay={3000} duration={400}>
                <div style={{ marginTop: 12, display: "flex", gap: 12, justifyContent: "center" }}>
                  {[
                    { value: "&euro;840K", label: "early termination impact", color: "#ef4444" },
                    { value: "14", label: "affected contracts", color: "#f59e0b" },
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: "12px 20px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'" }} dangerouslySetInnerHTML={{ __html: stat.value }} />
                      <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>One client caught it.<br/><span style={{ color: "#ef4444" }}>13 more could follow.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The email trail proves sales made the promise. If all clients exercise the verbal terms: &euro;840K in early termination impact. Plus reputational damage.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the risk</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>CONTRACT RISK: 14 client contracts contain mismatched termination terms</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  14 client contracts contain 60-day termination clause, but sales communications promise 30 days. Email evidence exists for all 14. Legal exposure if challenged: &euro;840K. Source: verbal commitments in sales emails diverge from standard contract template.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "14", label: "Contracts affected", color: "#ef4444" },
                  { value: "30 vs 60", label: "Day mismatch", color: "#f59e0b" },
                  { value: "&euro;840K", label: "Legal exposure", color: "#ef4444" },
                  { value: "100%", label: "Email evidence", color: "#3b82f6" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'" }} dangerouslySetInnerHTML={{ __html: stat.value }} />
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Before the next client<br/><span style={{ color: "#ef4444" }}>reads the fine print</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Audit all 14 affected contracts immediately", color: "#ef4444" },
                    { n: "2", text: "Alert sales team: stop promising non-standard terms without legal review", color: "#f59e0b" },
                    { n: "3", text: "Update contract template to match actual business practice (30 or 60 — decide and align)", color: "#3b82f6" },
                    { n: "4", text: "Implement sales-legal review checkpoint for term modifications", color: "#22c55e" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Contract management tracks documents.<br/><span style={{ color: "#ef4444" }}>Qorpera tracks what was actually promised.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>The gap between what sales promises and what legal signs is where risk lives. Activity intelligence connects conversations to contracts before the discrepancy becomes a lawsuit.</div></Fade>
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
