"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-contract", duration: 9625 },
  { id: "the-evidence", duration: 10500 },
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

export default function VendorOvercharge() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Procurement</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Contract Nobody Renegotiated</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Your cleaning contract auto-renewed at last year&apos;s rate. Market prices dropped 20%. You&apos;re overpaying &euro;18K a year — and nobody knows.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive contract isn&apos;t the biggest one.<br/>It&apos;s the one nobody looked at.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Contract */}
        {show("the-contract") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Active Contract</div></Fade>
              <Fade show delay={500} duration={700}>
                <div style={{ padding: "24px 28px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { label: "Vendor", value: "ProClean Services" },
                    { label: "Service", value: "Office cleaning, 5 locations" },
                    { label: "Rate", value: "€4,200/month" },
                    { label: "Term", value: "Auto-renews annually" },
                    { label: "Last reviewed", value: "14 months ago" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 300} duration={400}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{row.label}</span>
                        <span style={{ fontSize: 18, color: i === 2 ? "#f59e0b" : "#e2e8f0", fontWeight: i === 2 ? 600 : 500 }}>{row.value}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Auto-renewal:<br/><span style={{ color: "#f59e0b" }}>convenient or costly?</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Nobody flagged it. Nobody reviewed it. The contract renewed silently — at a rate the market no longer supports.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Evidence */}
        {show("the-evidence") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Scattered Signals</div></Fade>
              {[
                { icon: "📧", source: "Email — Colleague, 4 months ago", text: "\"Got a quote from CleanCorp — €3,400/month for similar scope.\"", accent: "#3b82f6" },
                { icon: "📧", source: "Email — ProClean, 2 months ago", text: "Updated price list showing lower rates for new clients.", accent: "#f59e0b" },
                { icon: "📁", source: "Drive — Industry report, last quarter", text: "\"Commercial cleaning rates down 15-20% year-over-year.\"", accent: "#22c55e" },
              ].map((signal, i) => (
                <Fade key={i} show delay={400 + i * 600} duration={500}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: `${signal.accent}06`, border: `1px solid ${signal.accent}18`, borderRadius: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22 }}>{signal.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, color: signal.accent, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>{signal.source}</div>
                      <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500, lineHeight: 1.5 }}>{signal.text}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The data was there.<br/><span style={{ color: "#f59e0b" }}>In emails, docs, and invoices.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Three separate signals — a competitor quote, the vendor&apos;s own new pricing, and an industry report — all pointing to the same thing. Nobody connected them.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the overspend</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>COST RISK: Cleaning contract &euro;18K/year above market rate</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  ProClean contract auto-renewed at &euro;4,200/month. Competitor quote in email: &euro;3,400/month (-19%). ProClean&apos;s own new-client rate: &euro;3,600/month (-14%). Industry benchmark: rates down 15-20% YoY. Annual overspend: ~&euro;7,200-&euro;9,600. Across 5 locations: up to &euro;18K/year.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "€4,200", label: "Current rate", color: "#ef4444" },
                  { value: "€3,400", label: "Market rate", color: "#22c55e" },
                  { value: "€18K", label: "Annual overspend", color: "#f59e0b" },
                  { value: "14mo", label: "Since last review", color: "#64748b" },
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
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#475569", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Silent renewal.<br/>Compounding cost.</div>
                  <div style={{ fontSize: 21, color: "#64748b", lineHeight: 1.7 }}>Contract renews again next year at the same rate. Over 3 years, &euro;54K+ in unnecessary spending. The information existed — in an email nobody thought to connect to procurement.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>-€54K over 3 years</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ padding: "28px 24px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>One conversation.<br/><span style={{ color: "#f59e0b" }}>&euro;18K saved per year.</span></div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Procurement gets a renegotiation brief before renewal. Armed with market data, competitor quotes, and the vendor&apos;s own pricing. Saves &euro;18K/year with one conversation.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>+€18K saved/year</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Procurement tracks invoices.<br/><span style={{ color: "#f59e0b" }}>Qorpera tracks value.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every company has contracts that auto-renew without scrutiny. Activity intelligence connects market data, competitor quotes, and vendor communications to surface overspend before it compounds.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera →</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#f59e0b,#d97706)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
