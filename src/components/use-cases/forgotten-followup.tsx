"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-inquiry", duration: 9625 },
  { id: "the-gap", duration: 10500 },
  { id: "the-loss", duration: 9625 },
  { id: "detection", duration: 10500 },
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

export default function ForgottenFollowup() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
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

  useEffect(() => {
    startAnimation();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [startAnimation]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { const s = SCENES[i]; if (elapsed < acc + s.duration) { currentScene = s.id; currentSceneIndex = i; break; } acc += s.duration; }
  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    startAnimation(target);
  }, [startAnimation]);
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Sales</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Lead That<br/>Went Cold</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>A prospect asked for a quote. They replied with a question.<br/>Nobody answered. The competitor did.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive email in your inbox<br/>is the one you forgot to reply to.</div></Fade>
          </div>
        )}

        {/* the-inquiry */}
        {show("the-inquiry") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>Day 1 — The Inquiry</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>From: Sarah Chen, Operations Director</div>
                      <div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>Greenfield Manufacturing</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: "#22c55e10", border: "1px solid #22c55e25", borderRadius: 6, fontSize: 14, color: "#22c55e" }}>Inbound</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 10 }}>Subject: Pricing for fleet of 50 units</div>
                  <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.7, borderTop: "1px solid #1e1e3a", paddingTop: 12 }}>
                    Hi, we&apos;re looking to replace our current supplier. Could you send pricing for 50 units with delivery to 3 locations? We need to make a decision by end of month.
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>A warm lead</div></Fade>
              <Fade show delay={1800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>They came to you. Budget ready. Timeline clear. Decision-maker writing directly.</div></Fade>
              <Fade show delay={2600} duration={400}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                  {[
                    { label: "50 units", color: "#22c55e" },
                    { label: "3 locations", color: "#22c55e" },
                    { label: "End of month deadline", color: "#3b82f6" },
                    { label: "Decision-maker", color: "#a855f7" },
                  ].map((t, i) => (
                    <Fade key={i} show delay={2800 + i * 200} duration={300}>
                      <div style={{ padding: "6px 14px", background: `${t.color}10`, border: `1px solid ${t.color}30`, borderRadius: 8, fontSize: 15, color: t.color, fontFamily: "'JetBrains Mono'" }}>{t.label}</div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* the-gap */}
        {show("the-gap") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>The Reply Chain</div></Fade>
              <Fade show delay={500} duration={400}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 20 }}>
                  {[
                    { day: "Day 1", sender: "You", text: "Quote sent — €85K for 50 units, 3-location delivery", color: "#22c55e", icon: "→" },
                    { day: "Day 3", sender: "Sarah Chen", text: "Thanks — can you confirm lead time for the southern warehouse?", color: "#3b82f6", icon: "←" },
                    { day: "Day 3", sender: "Your team", text: "", color: "#64748b", icon: "..." },
                    { day: "Day 4", sender: "", text: "", color: "#4a5568", icon: "..." },
                    { day: "Day 5", sender: "", text: "", color: "#4a5568", icon: "..." },
                    { day: "Day 7", sender: "", text: "", color: "#3a3a4a", icon: "..." },
                    { day: "Day 10", sender: "", text: "", color: "#2a2a3a", icon: "..." },
                    { day: "Day 14", sender: "", text: "No reply", color: "#ef4444", icon: "✕" },
                  ].map((e, i) => (
                    <Fade key={i} show delay={600 + i * 350} duration={350} direction="left" distance={12}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 7 ? "1px solid #1a1a2e" : "none" }}>
                        <div style={{ minWidth: 50, fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{e.day}</div>
                        <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: e.color, background: `${e.color}10`, border: `1px solid ${e.color}20`, flexShrink: 0 }}>{e.icon}</div>
                        {e.text ? (
                          <div style={{ fontSize: 15, color: e.sender ? "#cbd5e1" : "#ef4444", lineHeight: 1.4 }}>
                            {e.sender && <span style={{ color: e.color, fontWeight: 600 }}>{e.sender}: </span>}{e.text}
                          </div>
                        ) : (
                          <div style={{ fontSize: 15, color: "#2a2a4a", fontStyle: "italic" }}>Silence</div>
                        )}
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>They asked one question.<br/><span style={{ color: "#ef4444" }}>You never answered.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The email was opened, read, and forgotten. Not malice — just a busy Tuesday that turned into two weeks.</div></Fade>
              <Fade show delay={3200} duration={400}>
                <div style={{ marginTop: 20, padding: "12px 18px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>Email marked as read — Day 3 — never replied</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* the-loss */}
        {show("the-loss") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Day 21</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Sarah signs with <span style={{ color: "#ef4444" }}>your competitor.</span></div></Fade>
            <Fade show delay={1400} duration={600}>
              <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 32 }}>
                {[
                  { label: "Deal value", value: "€85K", sublabel: "lost", color: "#ef4444" },
                  { label: "Units", value: "50", sublabel: "to competitor", color: "#ef4444" },
                  { label: "Root cause", value: "1 email", sublabel: "unanswered", color: "#f59e0b" },
                ].map((c, i) => (
                  <Fade key={i} show delay={1800 + i * 400} duration={400}>
                    <div style={{ background: "#1a1a2e", border: `1px solid ${c.color}20`, borderRadius: 14, padding: "28px 36px", minWidth: 160, textAlign: "center" }}>
                      <div style={{ fontSize: 15, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono'" }}>{c.label}</div>
                      <div style={{ fontSize: 42, fontWeight: 700, color: c.color, fontFamily: "'Space Grotesk'", marginBottom: 4 }}>{c.value}</div>
                      <div style={{ fontSize: 18, color: "#94a3b8" }}>{c.sublabel}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
            <Fade show delay={3600} duration={700}>
              <div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                They didn&apos;t leave because of price or product.<br/><span style={{ color: "#e2e8f0", fontWeight: 600 }}>They left because you went silent.</span>
              </div>
            </Fade>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the gap</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>What should have<br/><span style={{ color: "#3b82f6" }}>happened on Day 3</span></div></Fade>
            <Fade show delay={1200} duration={600}>
              <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 28px", background: "#3b82f608", border: "1px solid #3b82f620", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#f59e0b" }}>STALE THREAD: Prospect question unanswered for 3 days — €85K opportunity at risk</span>
                </div>
                <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Sarah Chen (Greenfield Manufacturing) replied with a logistics question on Tuesday. No response from your team. Original inquiry was for 50 units across 3 locations. Decision deadline: end of month. Thread is going cold.
                </div>
              </div>
            </Fade>
            <Fade show delay={2800} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10, textAlign: "left", textTransform: "uppercase", letterSpacing: 1 }}>Proposed actions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Flag to sales manager — unanswered prospect thread, high-value opportunity", color: "#ef4444" },
                    { n: "2", text: "Draft response with delivery schedule for the southern warehouse", color: "#3b82f6" },
                    { n: "3", text: "Schedule follow-up call with Sarah Chen within 24 hours", color: "#22c55e" },
                  ].map((a, i) => (
                    <Fade key={i} show delay={3000 + i * 350} duration={350} direction="left" distance={15}>
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

        {/* close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 20, lineHeight: 1.3 }}>Inboxes track messages.<br/><span style={{ color: "#a855f7" }}>Qorpera tracks conversations.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 21, color: "#94a3b8", maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.7 }}>The difference between winning and losing this deal was a 30-second reply on a Tuesday afternoon. Activity intelligence makes sure no conversation falls through the cracks.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 15, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
