"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-delay", duration: 9625 },
  { id: "the-blame", duration: 10500 },
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

export default function DeliveryDelay() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Late Delivery Chain</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>One supplier started shipping 3 days late. It cascades through 4 production steps. Final product ships a week late. Each team blames the next.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The delay didn&apos;t start in your warehouse.<br/>It started in someone else&apos;s.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Delay */}
        {show("the-delay") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Cascade Timeline</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { step: "Supplier XY ships", expected: "Day 0", actual: "Day 3", delay: "+3 days", color: "#f59e0b" },
                    { step: "Receiving & inspection", expected: "Day 1", actual: "Day 5", delay: "+4 days", color: "#f59e0b" },
                    { step: "Assembly line start", expected: "Day 2", actual: "Day 7", delay: "+5 days", color: "#ef4444" },
                    { step: "QA & testing", expected: "Day 4", actual: "Day 9", delay: "+5 days", color: "#ef4444" },
                    { step: "Customer delivery", expected: "Day 6", actual: "Day 13", delay: "+7 days", color: "#ef4444" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 400} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize: 15, color: "#cbd5e1", flex: 1 }}>{row.step}</span>
                        <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'", minWidth: 60, textAlign: "center" }}>{row.expected}</span>
                        <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'", padding: "0 8px" }}>&rarr;</span>
                        <span style={{ fontSize: 14, color: row.color, fontFamily: "'JetBrains Mono'", minWidth: 60, textAlign: "center" }}>{row.actual}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: row.color, fontFamily: "'JetBrains Mono'", minWidth: 70, textAlign: "right" }}>{row.delay}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>A 3-day supplier delay becomes a <span style={{ color: "#ef4444" }}>7-day customer delay.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Each production step absorbs the delay and adds to it. By the time it reaches the customer, the original 3 days have more than doubled.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Blame */}
        {show("the-blame") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Each Department&apos;s Story</div></Fade>
              {[
                { dept: "Warehouse", quote: "We shipped as soon as we got it.", color: "#3b82f6" },
                { dept: "Assembly", quote: "Materials came late. Not our fault.", color: "#a855f7" },
                { dept: "Purchasing", quote: "Supplier said it was on time.", color: "#f59e0b" },
                { dept: "Customer", quote: "You promised Friday. It&apos;s the following Thursday.", color: "#ef4444" },
              ].map((row, i) => (
                <Fade key={i} show delay={400 + i * 550} duration={500}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: `${row.color}06`, border: `1px solid ${row.color}18`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 15, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{row.dept}</div>
                    </div>
                    <div style={{ fontSize: 18, color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.5 }}>&quot;{row.quote}&quot;</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Everyone&apos;s telling the truth.<br/><span style={{ color: "#f59e0b" }}>Nobody has the full picture.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Four departments, four correct statements, zero visibility into the root cause. The supplier delay is invisible once it enters your building.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the chain reaction</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#06b6d4", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4" }}>SUPPLY CHAIN DELAY: Supplier XY shipping 3 days late consistently</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Pattern detected over last 6 deliveries. Cascade impact: 7-day average delay to customer. 4 departments affected. Root cause: single-point supplier dependency — no backup qualified for these components.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "3 days", label: "Supplier delay", color: "#f59e0b" },
                  { value: "7 days", label: "Customer delay", color: "#ef4444" },
                  { value: "6 of 6", label: "Deliveries late", color: "#ef4444" },
                  { value: "4", label: "Depts affected", color: "#06b6d4" },
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
          <div style={{ display: "flex", alignItems: "stretch", gap: 32, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ padding: "28px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Without Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#475569", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Cascading delays.<br/>Finger-pointing.</div>
                  <div style={{ fontSize: 21, color: "#64748b", lineHeight: 1.7 }}>12 late deliveries this quarter. 3 customer complaints escalated to management. &euro;28K in expedited shipping to recover missed windows.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>&euro;28K expedited shipping</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ padding: "28px 24px", background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Delay pattern detected.<br/><span style={{ color: "#06b6d4" }}>At the source.</span></div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Alternative supplier engaged after third late delivery. Buffer stock established for critical items. Cascade broken before it reaches the customer.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>0 late customer deliveries</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Logistics tracks shipments.<br/><span style={{ color: "#06b6d4" }}>Qorpera tracks the chain reaction.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>A 3-day supplier delay doesn&apos;t stay 3 days. Activity intelligence traces the cascade from origin to customer impact — before anyone starts pointing fingers.</div></Fade>
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
