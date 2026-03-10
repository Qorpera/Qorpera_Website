"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-data", duration: 9625 },
  { id: "the-disconnect", duration: 10500 },
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

export default function FeedbackBlackhole() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Feedback<br/>Nobody Read</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>2,000 survey responses per quarter. NPS declining.<br/>Three recurring complaints. Product team hasn&apos;t seen them —<br/>the report goes to a shared inbox nobody checks.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>You asked customers what they think.<br/>Then you didn&apos;t listen.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Data */}
        {show("the-data") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Survey Overview</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "16px 20px", background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 8 }}>Responses collected: 2,000/quarter</div>
                  <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>NPS Trend (4 quarters)</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { q: "Q1", score: 42, color: "#22c55e" },
                      { q: "Q2", score: 38, color: "#f59e0b" },
                      { q: "Q3", score: 34, color: "#f59e0b" },
                      { q: "Q4", score: 29, color: "#ef4444" },
                    ].map((nps, i) => (
                      <Fade key={i} show delay={700 + i * 250} duration={400}>
                        <div style={{ flex: 1, padding: "12px 8px", background: `${nps.color}08`, border: `1px solid ${nps.color}20`, borderRadius: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{nps.q}</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: nps.color, fontFamily: "'Space Grotesk'" }}>{nps.score}</div>
                        </div>
                      </Fade>
                    ))}
                  </div>
                </div>
              </Fade>
              <Fade show delay={1800} duration={500}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 8, fontFamily: "'JetBrains Mono'" }}>Top 3 Recurring Complaints</div>
              </Fade>
              {[
                { text: "Mobile app crashes on Android", mentions: 340, color: "#ef4444" },
                { text: "Can\u2019t export reports to PDF", mentions: 220, color: "#f59e0b" },
                { text: "Billing page confusing", mentions: 180, color: "#f59e0b" },
              ].map((c, i) => (
                <Fade key={i} show delay={2000 + i * 350} duration={400}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: `${c.color}06`, border: `1px solid ${c.color}15`, borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, color: "#e2e8f0" }}>{c.text}</span>
                    <span style={{ fontSize: 14, color: c.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{c.mentions}x</span>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>2,000 customers<br/>told you what&apos;s wrong.</div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The data went into a shared inbox that nobody checks. NPS dropped 31% over four quarters. The complaints are specific, actionable, and completely ignored.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Disconnect */}
        {show("the-disconnect") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Feedback Chain</div></Fade>
              {[
                { step: "1", text: "Customer fills out survey", icon: "~", color: "#22c55e" },
                { step: "2", text: "Goes to surveys@company.com", icon: "~", color: "#22c55e" },
                { step: "3", text: "Monthly report auto-generated", icon: "~", color: "#3b82f6" },
                { step: "4", text: "Sent to \"Customer Insights\" distribution list", icon: "~", color: "#3b82f6" },
                { step: "5", text: "List has 4 people: 1 left the company, 1 filters it to a folder, 2 don\u2019t open it", icon: "\u2717", color: "#ef4444" },
                { step: "6", text: "Product team: never subscribed", icon: "\u2717", color: "#ef4444" },
                { step: "7", text: "Engineering: never sees it", icon: "\u2717", color: "#ef4444" },
              ].map((s, i) => (
                <Fade key={i} show delay={400 + i * 400} duration={400} direction="left" distance={12}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 14px", borderBottom: i < 6 ? "1px solid #1a1a2e" : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${s.color}10`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: s.color, fontWeight: 600, flexShrink: 0 }}>{s.step}</div>
                    <div style={{ fontSize: 16, color: i >= 4 ? "#ef4444" : "#cbd5e1", lineHeight: 1.4 }}>{s.text}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The feedback loop<br/>has a <span style={{ color: "#ef4444" }}>broken link.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Customers talk. Nobody on the product team hears. The report exists, the data is clear, but the distribution list is a dead end. Zero percent open rate by the people who need it most.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the gap</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>FEEDBACK GAP: NPS declined 31% over 4 quarters (42&rarr;29)</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  3 recurring complaints account for 37% of negative feedback. &quot;Mobile app crashes&quot; mentioned 340 times — no matching engineering ticket. Survey report distribution: 0% open rate by product/engineering teams.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "31%", label: "NPS decline", color: "#ef4444" },
                  { value: "340", label: "Crash mentions", color: "#ef4444" },
                  { value: "0%", label: "Report open rate", color: "#f59e0b" },
                  { value: "0", label: "Eng tickets filed", color: "#64748b" },
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Close the loop.<br/><span style={{ color: "#22c55e" }}>Connect feedback to action.</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Route top 3 complaints to product lead immediately with full context", color: "#ef4444" },
                    { n: "2", text: "Create engineering ticket for Android app crashes (340 customer mentions)", color: "#22c55e" },
                    { n: "3", text: "Fix survey distribution — add product and engineering leads to the list", color: "#3b82f6" },
                    { n: "4", text: "Implement monthly complaint-trend briefing for product team", color: "#f59e0b" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>NPS tracks sentiment.<br/><span style={{ color: "#ef4444" }}>Qorpera tracks whether anyone acts on it.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Collecting feedback is easy. The hard part is making sure it reaches the people who can act on it. Activity intelligence closes the gap between what customers say and what your teams see.</div></Fade>
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
