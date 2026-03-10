"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-spend", duration: 9625 },
  { id: "the-gap", duration: 10500 },
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

export default function AttributionBlind() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#8b5cf6 1px,transparent 1px),linear-gradient(90deg,#8b5cf6 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Marketing</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Invisible ROI</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>&euro;120K per quarter across 6 channels. &ldquo;Which one works?&rdquo; Nobody knows. The data is in 4 different systems that don&apos;t talk to each other.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>You can&apos;t optimize what you can&apos;t see.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Spend */}
        {show("the-spend") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Quarterly Marketing Spend</div></Fade>
              <Fade show delay={500} duration={700}>
                <div style={{ padding: "24px 28px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { channel: "Google Ads", spend: "\u20AC35,000", pct: "29%", color: "#3b82f6" },
                    { channel: "LinkedIn", spend: "\u20AC28,000", pct: "23%", color: "#8b5cf6" },
                    { channel: "Trade Shows", spend: "\u20AC25,000", pct: "21%", color: "#f59e0b" },
                    { channel: "Content / SEO", spend: "\u20AC15,000", pct: "13%", color: "#22c55e" },
                    { channel: "Email Campaigns", spend: "\u20AC12,000", pct: "10%", color: "#06b6d4" },
                    { channel: "Referral Program", spend: "\u20AC5,000", pct: "4%", color: "#64748b" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 250} duration={350}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 16, color: "#e2e8f0" }}>{row.channel}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 16, color: "#94a3b8", fontFamily: "'JetBrains Mono'" }}>{row.pct}</span>
                          <span style={{ fontSize: 17, color: row.color, fontWeight: 600, fontFamily: "'JetBrains Mono'", minWidth: 80, textAlign: "right" }}>{row.spend}</span>
                        </div>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2400} duration={400}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 4, borderTop: "2px solid #2a2a4a" }}>
                      <span style={{ fontSize: 17, color: "#f1f5f9", fontWeight: 700 }}>Total</span>
                      <span style={{ fontSize: 22, color: "#f1f5f9", fontWeight: 700, fontFamily: "'Space Grotesk'" }}>&euro;120,000/quarter</span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>&euro;120K spent.<br/><span style={{ color: "#8b5cf6" }}>Zero clarity on what works.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Six channels. Six dashboards. Six stories. But which channels are actually driving revenue — and which are burning budget?</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Gap */}
        {show("the-gap") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Data Silos</div></Fade>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { system: "Google Analytics", tracks: "Traffic", color: "#3b82f6" },
                  { system: "HubSpot", tracks: "Leads", color: "#f59e0b" },
                  { system: "CRM", tracks: "Deals", color: "#8b5cf6" },
                  { system: "Finance", tracks: "Revenue", color: "#22c55e" },
                ].map((silo, i) => (
                  <Fade key={i} show delay={400 + i * 350} duration={350}>
                    <div style={{ padding: "14px 16px", background: "#12122a", border: `1px solid ${silo.color}20`, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 15, color: silo.color, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>{silo.system}</div>
                      <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 500 }}>{silo.tracks}</div>
                    </div>
                  </Fade>
                ))}
              </div>
              <Fade show delay={2000} duration={500}>
                <div style={{ padding: "14px 18px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10 }}>
                  <div style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'", textAlign: "center", marginBottom: 6 }}>4 systems &middot; 4 owners &middot; 0 connection</div>
                  <div style={{ fontSize: 16, color: "#94a3b8", textAlign: "center", lineHeight: 1.5 }}>A deal that started from a LinkedIn ad, nurtured by email, closed at a trade show gets attributed to... &ldquo;last touch&rdquo; trade show only.</div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The customer journey crosses <span style={{ color: "#8b5cf6" }}>3 channels.</span><br/>Your attribution sees <span style={{ color: "#ef4444" }}>1.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Last-touch attribution gives all the credit to the final interaction. The channels that built awareness and nurtured interest get nothing — so you cut them.</div></Fade>
              <Fade show delay={3200} duration={400}>
                <div style={{ marginTop: 20, padding: "12px 18px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#f59e0b", fontFamily: "'JetBrains Mono'" }}>67% of deals touch 3+ channels before close</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the full picture</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>ATTRIBUTION GAP: 67% of closed deals interacted with 3+ channels before converting.</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Current attribution: 100% last-touch. Estimated misattribution: &euro;45K/quarter allocated to wrong channels. LinkedIn ads appear underperforming but influence 40% of enterprise deals as a mid-funnel touchpoint.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "67%", label: "Multi-touch deals", color: "#8b5cf6" },
                  { value: "\u20AC45K", label: "Misattributed/qtr", color: "#ef4444" },
                  { value: "40%", label: "LinkedIn influence", color: "#3b82f6" },
                  { value: "100%", label: "Last-touch bias", color: "#f59e0b" },
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
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Current Attribution</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 16 }}>
                  {[
                    { channel: "Trade Shows", credit: "60%", reality: "Closes deals", color: "#f59e0b" },
                    { channel: "Google Ads", credit: "25%", reality: "Drives traffic", color: "#3b82f6" },
                    { channel: "LinkedIn", credit: "8%", reality: "Hidden influencer", color: "#8b5cf6" },
                    { channel: "Other", credit: "7%", reality: "Unmeasured", color: "#64748b" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 300} duration={350}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize: 16, color: "#e2e8f0" }}>{row.channel}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 14, color: "#64748b" }}>{row.reality}</span>
                          <span style={{ fontSize: 17, color: row.color, fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>{row.credit}</span>
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Reallocation<br/><span style={{ color: "#8b5cf6" }}>insight.</span></div></Fade>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { n: "1", text: "Shift \u20AC8K from underperforming Google campaigns to LinkedIn enterprise targeting", color: "#8b5cf6" },
                  { n: "2", text: "Flag trade show ROI for proper multi-touch analysis — true influence likely lower than 60%", color: "#f59e0b" },
                  { n: "3", text: "LinkedIn influences 40% of enterprise pipeline — current spend doesn\u2019t reflect its role", color: "#3b82f6" },
                ].map((a, i) => (
                  <Fade key={i} show delay={1000 + i * 450} duration={400} direction="left" distance={15}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, textAlign: "left" }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.n}</div>
                      <div style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.4 }}>{a.text}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Dashboards track clicks.<br/><span style={{ color: "#8b5cf6" }}>Qorpera tracks the journey.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every marketing dollar deserves proper attribution. Activity intelligence connects traffic, leads, deals, and revenue across every system — so you can see which channels actually drive growth.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#8b5cf6,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
