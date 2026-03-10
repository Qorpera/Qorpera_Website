"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-surplus", duration: 9625 },
  { id: "the-signals", duration: 10500 },
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

export default function InventoryBlindspot() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Stockroom Surprise</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>&euro;80K in dead stock gathering dust. Meanwhile, the bestseller is on backorder. The data is in two systems that don&apos;t talk.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The warehouse is full.<br/>Just not with the right things.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Surplus */}
        {show("the-surplus") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Inventory Snapshot</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Dead Stock</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'" }}>Model X-200</span>
                    <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Discontinued</span>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div><span style={{ fontSize: 28, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'" }}>4,200</span><span style={{ fontSize: 15, color: "#64748b" }}> units</span></div>
                    <div><span style={{ fontSize: 28, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'" }}>&euro;80K</span><span style={{ fontSize: 15, color: "#64748b" }}> tied up</span></div>
                  </div>
                </div>
              </Fade>
              <Fade show delay={1200} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  <div style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Backordered</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", fontFamily: "'Space Grotesk'" }}>Model Z-500</span>
                    <span style={{ fontSize: 15, color: "#22c55e", fontFamily: "'JetBrains Mono'" }}>Bestseller</span>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div><span style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Grotesk'" }}>340</span><span style={{ fontSize: 15, color: "#64748b" }}> backordered</span></div>
                    <div><span style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Grotesk'" }}>6 wk</span><span style={{ fontSize: 15, color: "#64748b" }}> wait</span></div>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Two problems.<br/><span style={{ color: "#06b6d4" }}>Same warehouse.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Nobody connected them. The dead stock sits in aisles 4-7. The backorders pile up in customer service. Two systems, two teams, zero overlap.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Signals */}
        {show("the-signals") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Scattered Data Sources</div></Fade>
              {[
                { source: "ERP System", text: "X-200 stock: 4,200 units. Status: Active.", accent: "#3b82f6" },
                { source: "Sales Report — Q3", text: "Z-500 demand up 180% QoQ. Fastest-growing SKU.", accent: "#22c55e" },
                { source: "Email from Supplier", text: "Z-500 lead time extended to 8 weeks due to component shortage.", accent: "#f59e0b" },
                { source: "Customer Service Inbox", text: "14 messages this month asking about Z-500 availability.", accent: "#ef4444" },
              ].map((signal, i) => (
                <Fade key={i} show delay={400 + i * 550} duration={500}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: `${signal.accent}06`, border: `1px solid ${signal.accent}18`, borderRadius: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, color: signal.accent, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>{signal.source}</div>
                      <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.5 }}>{signal.text}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The forecast was wrong.<br/><span style={{ color: "#f59e0b" }}>The signals were right.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Four data sources, four departments, one clear conclusion. But nobody had visibility across all four — so the dead stock stayed and the backorders grew.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#06b6d4", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the imbalance</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#06b6d4", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4" }}>INVENTORY IMBALANCE: &euro;80K in dead stock, bestseller backordered</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Model X-200 — 4,200 units (&euro;80K), zero sales in 90 days. Model Z-500 — 340 units backordered, demand trend +180%. Recommendation: liquidate X-200, redirect capital to Z-500 safety stock.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "&euro;80K", label: "Capital trapped", color: "#ef4444" },
                  { value: "0", label: "X-200 sales (90d)", color: "#ef4444" },
                  { value: "340", label: "Z-500 backordered", color: "#f59e0b" },
                  { value: "+180%", label: "Z-500 demand QoQ", color: "#22c55e" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'", marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: stat.value }} />
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Redirect capital where it <span style={{ color: "#06b6d4" }}>actually matters.</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Flag X-200 for clearance pricing — recoup capital from 4,200 dead units", color: "#ef4444" },
                    { n: "2", text: "Redirect \u20ac40K to expedite Z-500 production — cover 6-week backorder gap", color: "#06b6d4" },
                    { n: "3", text: "Set reorder point alert for Z-500 at 200 units — prevent future stockouts", color: "#22c55e" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Inventory systems track quantities.<br/><span style={{ color: "#06b6d4" }}>Qorpera tracks what you actually need.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>The warehouse was full — just not with the right things. Activity intelligence connects sales trends, supplier signals, and customer demand to surface imbalances before they cost you.</div></Fade>
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
