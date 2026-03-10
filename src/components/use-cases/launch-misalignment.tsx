"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-timeline", duration: 9625 },
  { id: "the-fallout", duration: 10500 },
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

export default function LaunchMisalignment() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Launch Nobody<br/>Was Ready For</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Product set the launch date. Marketing found out from a customer&apos;s tweet. Sales discovered it in a press release. Support got the first ticket before the docs were written.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>A launch without alignment isn&apos;t a launch.<br/>It&apos;s a fire drill.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Timeline */}
        {show("the-timeline") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Launch Timeline</div></Fade>
              <Fade show delay={500} duration={400}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 20 }}>
                  {[
                    { when: "Week -4", event: "Product sets launch date", detail: "Internal doc, limited distribution", color: "#64748b", icon: "\u25CB" },
                    { when: "Week -2", event: "Product updates changelog", detail: "No cross-team notification sent", color: "#64748b", icon: "\u25CB" },
                    { when: "Week -1", event: "Marketing starts assets", detail: "Deadline was yesterday", color: "#f59e0b", icon: "!" },
                    { when: "Day 0", event: "Feature launches", detail: "Press release goes out", color: "#8b5cf6", icon: "\u25B6" },
                    { when: "Day 0 +2h", event: "Sales gets first call about new feature", detail: "No enablement materials", color: "#ef4444", icon: "?" },
                    { when: "Day 0 +4h", event: "Support gets first ticket", detail: "No documentation exists", color: "#ef4444", icon: "\u2715" },
                  ].map((e, i) => (
                    <Fade key={i} show delay={600 + i * 400} duration={350} direction="left" distance={12}>
                      <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 5 ? "1px solid #1a1a2e" : "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: e.color, background: `${e.color}10`, border: `1px solid ${e.color}20`, flexShrink: 0, fontWeight: 700 }}>{e.icon}</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, color: e.color, fontFamily: "'JetBrains Mono'" }}>{e.when}</span>
                          </div>
                          <div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.3 }}>{e.event}</div>
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 1 }}>{e.detail}</div>
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>One launch.<br/><span style={{ color: "#ef4444" }}>Zero coordination.</span></div></Fade>
              <Fade show delay={1600} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Product planned the launch in a doc nobody outside engineering read. By the time other teams found out, the feature was already live and customers were already asking questions.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Fallout */}
        {show("the-fallout") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Fallout — Day 1</div></Fade>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { team: "Sales", impact: "Blindsided", detail: "0 enablement materials ready", color: "#ef4444" },
                  { team: "Support", impact: "Overwhelmed", detail: "34 tickets, no documentation", color: "#ef4444" },
                  { team: "Marketing", impact: "Behind", detail: "Assets delayed 3 days", color: "#f59e0b" },
                  { team: "Customers", impact: "Confused", detail: "\"Why doesn\u2019t your team know about your own product?\"", color: "#8b5cf6" },
                ].map((item, i) => (
                  <Fade key={i} show delay={500 + i * 500} duration={400}>
                    <div style={{ padding: "16px 18px", background: "#12122a", border: `1px solid ${item.color}20`, borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 15, color: item.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{item.team}</span>
                        <span style={{ padding: "3px 10px", background: `${item.color}10`, border: `1px solid ${item.color}25`, borderRadius: 6, fontSize: 13, color: item.color }}>{item.impact}</span>
                      </div>
                      <div style={{ fontSize: 17, color: "#e2e8f0", lineHeight: 1.5 }}>{item.detail}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The product was ready.<br/><span style={{ color: "#ef4444" }}>The company wasn&apos;t.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>A great feature launch became a trust-damaging event. Not because of the product, but because every customer-facing team was caught off guard.</div></Fade>
              <Fade show delay={3200} duration={400}>
                <div style={{ marginTop: 20, padding: "12px 18px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>34 tickets before a single doc was published</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the risk</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>LAUNCH RISK: Product launch scheduled in 5 days. Cross-team readiness: critical gaps detected.</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Marketing assets: not started. Sales enablement: none. Support documentation: none. Knowledge base: not updated. Training: not scheduled. Source: product roadmap doc updated 3 weeks ago.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "5 days", label: "Until launch", color: "#ef4444" },
                  { value: "0", label: "Assets ready", color: "#f59e0b" },
                  { value: "0", label: "Docs written", color: "#8b5cf6" },
                  { value: "0", label: "Teams briefed", color: "#64748b" },
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed actions</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Catch the gap.<br/><span style={{ color: "#8b5cf6" }}>Before launch day.</span></div></Fade>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { n: "1", text: "Alert marketing lead — launch in 5 days, no assets in progress. Creative brief needed immediately.", color: "#ef4444" },
                  { n: "2", text: "Flag to sales enablement — no training or materials prepared. Sales team will face customer questions unprepared.", color: "#f59e0b" },
                  { n: "3", text: "Alert support lead — no documentation drafted. Knowledge base needs update before tickets arrive.", color: "#8b5cf6" },
                  { n: "4", text: "Suggest launch delay or rapid coordination sprint — 5 days is insufficient for full readiness.", color: "#3b82f6" },
                ].map((a, i) => (
                  <Fade key={i} show delay={1000 + i * 400} duration={400} direction="left" distance={15}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, textAlign: "left" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.n}</div>
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Release management tracks features.<br/><span style={{ color: "#8b5cf6" }}>Qorpera tracks readiness.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>A product launch is a company-wide event. Activity intelligence ensures every team knows what&apos;s coming, what&apos;s needed, and what&apos;s missing — before the first customer finds out.</div></Fade>
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
