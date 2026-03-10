"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-pattern", duration: 9625 },
  { id: "the-cost", duration: 10500 },
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

export default function ContentGap() {
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Question Nobody<br/>Answered</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Prospects keep asking about implementation timelines. Sales answers manually every time. Marketing&apos;s website doesn&apos;t mention it. The FAQ is from 2024.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Your best content ideas aren&apos;t in brainstorm sessions.<br/>They&apos;re in your inbox.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Pattern */}
        {show("the-pattern") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Prospect Emails — 6 Weeks</div></Fade>
              {[
                { from: "VP Ops, Meridian Group", date: "Jan 28", text: "What does implementation look like for a team of 200?", color: "#3b82f6" },
                { from: "Head of IT, Crane Industrial", date: "Feb 5", text: "How long does it typically take to go live?", color: "#8b5cf6" },
                { from: "COO, Belmont Partners", date: "Feb 19", text: "What&apos;s the onboarding process? Do you handle migration?", color: "#f59e0b" },
                { from: "Director of Ops, Ashford Ltd", date: "Mar 4", text: "Can you walk me through your implementation timeline?", color: "#22c55e" },
              ].map((email, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: `${email.color}06`, border: `1px solid ${email.color}18`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 4, borderRadius: 2, background: email.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, color: email.color, fontFamily: "'JetBrains Mono'" }}>{email.from}</span>
                        <span style={{ fontSize: 13, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{email.date}</span>
                      </div>
                      <div style={{ fontSize: 17, color: "#e2e8f0", lineHeight: 1.5 }}>&ldquo;{email.text}&rdquo;</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>4 prospects.<br/>Same question.<br/><span style={{ color: "#8b5cf6" }}>4 manual answers.</span></div></Fade>
              <Fade show delay={1600} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Every sales rep writes a custom reply from scratch. Each answer is slightly different. None of them end up on the website where the next prospect could self-serve.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Cost */}
        {show("the-cost") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Hidden Cost</div></Fade>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { metric: "12 hours/month", detail: "Sales time answering the same question", color: "#ef4444" },
                  { metric: "3 deals delayed", detail: "Waiting for implementation details", color: "#f59e0b" },
                  { metric: "0 pages", detail: "On website addressing onboarding", color: "#8b5cf6" },
                  { metric: "14 months", detail: "Since FAQ was last updated", color: "#64748b" },
                ].map((item, i) => (
                  <Fade key={i} show delay={500 + i * 450} duration={400}>
                    <div style={{ padding: "14px 18px", background: "#12122a", border: `1px solid ${item.color}20`, borderRadius: 12, display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: item.color, fontFamily: "'Space Grotesk'", whiteSpace: "nowrap" }}>{item.metric}</span>
                      <span style={{ fontSize: 17, color: "#94a3b8" }}>{item.detail}</span>
                    </div>
                  </Fade>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Marketing creates content based on what they <span style={{ color: "#8b5cf6" }}>think</span> people want.</div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The data about what people actually ask exists — buried in sales inboxes, support threads, and call transcripts. Nobody connects it to the content calendar.</div></Fade>
              <Fade show delay={3200} duration={400}>
                <div style={{ marginTop: 20, padding: "12px 18px", background: "#8b5cf608", border: "1px solid #8b5cf618", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#8b5cf6", fontFamily: "'JetBrains Mono'" }}>23 conversations. 0 content pages.</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8b5cf6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the gap</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>CONTENT GAP: &ldquo;Implementation timeline&rdquo; mentioned in 23 prospect conversations over 6 weeks.</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  No matching content on website or knowledge base. Sales spending ~12 hours/month answering manually. 3 deals currently delayed waiting for detailed implementation documentation.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "23", label: "Conversations", color: "#8b5cf6" },
                  { value: "6wk", label: "Time span", color: "#3b82f6" },
                  { value: "12h", label: "Monthly cost", color: "#f59e0b" },
                  { value: "0", label: "Content pages", color: "#ef4444" },
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
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Turn questions into<br/><span style={{ color: "#8b5cf6" }}>content.</span></div></Fade>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { n: "1", text: "Create implementation timeline page — draft from existing sales responses across 23 conversations", color: "#8b5cf6" },
                  { n: "2", text: "Update FAQ with top 5 recurring prospect questions identified from email and call data", color: "#3b82f6" },
                  { n: "3", text: "Build email template for sales to use until the page is live — standardize the answer today", color: "#22c55e" },
                ].map((a, i) => (
                  <Fade key={i} show delay={1000 + i * 450} duration={400} direction="left" distance={15}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 18px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, textAlign: "left" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.n}</div>
                      <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.4 }}>{a.text}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </div>
            <Fade show delay={2800} duration={600}>
              <div style={{ marginTop: 28, fontSize: 21, color: "#94a3b8", maxWidth: 500, margin: "28px auto 0", lineHeight: 1.7 }}>Every unanswered question is a content opportunity. Every manual reply is a draft waiting to be published.</div>
            </Fade>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Content calendars track what you planned.<br/><span style={{ color: "#8b5cf6" }}>Qorpera tracks what your prospects actually need.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>The best content strategy isn&apos;t built in a planning meeting. It&apos;s built from the questions your customers are already asking. Activity intelligence connects the dots.</div></Fade>
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
