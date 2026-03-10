"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-campaign", duration: 9625 },
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

export default function CampaignMisfire() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Campaign That<br/>Backfired</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Marketing launches a campaign promoting fast delivery. Operations just extended lead times by 2 weeks. &euro;40K in ad spend driving customers to a promise you can&apos;t keep.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive campaign isn&apos;t the one that fails.<br/>It&apos;s the one that succeeds at the wrong message.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Campaign */}
        {show("the-campaign") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Campaign Brief</div></Fade>
              <Fade show delay={500} duration={700}>
                <div style={{ padding: "24px 28px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { label: "Ad spend", value: "\u20AC40,000" },
                    { label: "Channels", value: "Google + LinkedIn + Email" },
                    { label: "Core message", value: "Order today, delivered in 48 hours" },
                    { label: "Launch date", value: "Monday, 9:00 AM" },
                    { label: "Target audience", value: "Mid-market logistics buyers" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 300} duration={400}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{row.label}</span>
                        <span style={{ fontSize: 18, color: i === 2 ? "#8b5cf6" : "#e2e8f0", fontWeight: i === 2 ? 600 : 500 }}>{row.value}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>&euro;40K behind<br/><span style={{ color: "#8b5cf6" }}>a promise</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Marketing has no visibility into operations changes. The campaign was built on a delivery window that no longer exists. Nobody told them.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Disconnect */}
        {show("the-disconnect") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Timeline</div></Fade>
              <Fade show delay={500} duration={400}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 20 }}>
                  {[
                    { day: "Thursday", event: "Operations extends lead time to 14 days", detail: "Internal Slack announcement", color: "#f59e0b", icon: "!" },
                    { day: "Friday", event: "ERP system updated with new lead times", detail: "No cross-team notification", color: "#64748b", icon: "~" },
                    { day: "Monday", event: "Campaign goes live: \"Delivered in 48 hours\"", detail: "\u20AC40K ad spend activated", color: "#8b5cf6", icon: "\u25B6" },
                    { day: "Tuesday", event: "First customer complaints arrive", detail: "\"Your ad says 48 hours but CS says 14 days?\"", color: "#ef4444", icon: "\u2715" },
                  ].map((e, i) => (
                    <Fade key={i} show delay={600 + i * 500} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid #1a1a2e" : "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: e.color, background: `${e.color}10`, border: `1px solid ${e.color}20`, flexShrink: 0, fontWeight: 700 }}>{e.icon}</div>
                        <div>
                          <div style={{ fontSize: 14, color: e.color, fontFamily: "'JetBrains Mono'", marginBottom: 2 }}>{e.day}</div>
                          <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.4 }}>{e.event}</div>
                          <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{e.detail}</div>
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Two departments.<br/><span style={{ color: "#ef4444" }}>Zero communication.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The operations change was announced internally. It never reached marketing. By the time the first complaint arrived, &euro;40K was already spent telling customers something that wasn&apos;t true.</div></Fade>
              <Fade show delay={3200} duration={400}>
                <div style={{ marginTop: 20, padding: "12px 18px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>48-hour promise vs 14-day reality</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the conflict</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>MESSAGING CONFLICT: Active campaign promises 48-hour delivery. Operations lead time changed to 14 days 3 days ago.</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Signal sources: Slack message from operations team (Thursday), ERP delivery window update (Friday), campaign brief in Google Drive (approved last Wednesday). The campaign is driving traffic to a promise the company cannot fulfill.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "Slack", label: "Ops announcement", color: "#8b5cf6" },
                  { value: "ERP", label: "Lead time update", color: "#f59e0b" },
                  { value: "Drive", label: "Campaign brief", color: "#3b82f6" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 140, textAlign: "center" }}>
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
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#475569", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>4 days of<br/>wrong messaging.</div>
                  {[
                    { text: "340 angry customers", color: "#ef4444" },
                    { text: "\u20AC40K ad spend wasted", color: "#ef4444" },
                    { text: "Brand trust damaged", color: "#f59e0b" },
                    { text: "CS team overwhelmed", color: "#64748b" },
                  ].map((item, i) => (
                    <Fade key={i} show delay={400 + i * 250} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 18, color: item.color }}>{item.text}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ padding: "28px 24px", background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Campaign paused.<br/><span style={{ color: "#8b5cf6" }}>&euro;40K saved.</span></div>
                  {[
                    { text: "Campaign paused before launch", color: "#22c55e" },
                    { text: "Messaging updated to 14-day delivery", color: "#22c55e" },
                    { text: "\u20AC40K in ad spend preserved", color: "#22c55e" },
                    { text: "Brand integrity maintained", color: "#3b82f6" },
                  ].map((item, i) => (
                    <Fade key={i} show delay={800 + i * 250} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 18, color: item.color }}>{item.text}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Marketing tracks campaigns.<br/><span style={{ color: "#8b5cf6" }}>Qorpera tracks alignment.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every campaign assumes the rest of the business is standing still. Activity intelligence connects marketing spend to operational reality before customers experience the gap.</div></Fade>
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
