"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "surface", duration: 8750 },
  { id: "signal-docs", duration: 10500 },
  { id: "signal-comms", duration: 10500 },
  { id: "signal-calendar", duration: 9625 },
  { id: "detection", duration: 10500 },
  { id: "impact", duration: 9625 },
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

interface TBProps {
  name: string;
  icon: string;
  color: string;
  show: boolean;
  delay: number;
}

const TB = ({ name, icon, color, show, delay }: TBProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 18, color, fontWeight: 500 }}>{name}</span>
    </div>
  </Fade>
);

interface ActivitySpikeProps {
  label: string;
  normal: string;
  current: string;
  color: string;
  show: boolean;
  delay: number;
}

const ActivitySpike = ({ label, normal, current, color, show, delay }: ActivitySpikeProps) => (
  <Fade show={show} delay={delay} duration={500} style={{ marginBottom: 10 }}>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 17, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 17, color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{current} <span style={{ color: "#4a5568", fontWeight: 400 }}>/ norm: {normal}</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "#1e1e3a", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "100%", borderRadius: 4, background: `linear-gradient(90deg,${color},${color}80)` }} />
      </div>
    </div>
  </Fade>
);

export default function InvisiblePivot() {
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Cross-Department</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Invisible Pivot</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Your marketing team is overhauling the company&apos;s positioning.<br/>Sales is still pitching last quarter&apos;s value props.<br/>The CRM knows nothing.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Strategic shifts happen in docs, emails, and calendars —<br/>not in any system of record.</div></Fade>
          </div>
        )}

        {show("surface") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={700}><div style={{ fontSize: 42, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.3 }}>On the surface, nothing has changed</div></Fade>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 28 }}>
              {[{ name: "Marketing", status: "Active campaigns running", color: "#f59e0b", icon: "📣" }, { name: "Sales", status: "Pipeline looks healthy", color: "#3b82f6", icon: "💼" }, { name: "Product", status: "Roadmap on track", color: "#22c55e", icon: "⚙️" }].map((d, i) => (
                <Fade key={i} show delay={500 + i * 400} duration={500}>
                  <div style={{ padding: "20px 28px", borderRadius: 14, textAlign: "center", background: "#1a1a2e", border: "1px solid #2a2a4a", minWidth: 180 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{d.icon}</div>
                    <div style={{ fontSize: 23, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{d.name}</div>
                    <div style={{ fontSize: 17, color: "#22c55e" }}>✓ {d.status}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 23, color: "#94a3b8", maxWidth: 500, margin: "0 auto" }}>No alerts. No blockers. But underneath, Marketing is making decisions that will blindside every other department.</div></Fade>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <TB name="Google Drive" icon="📁" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>6 new documents in 5 days.<br/><span style={{ color: "#22c55e" }}>All about repositioning.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Marketing&apos;s document velocity is 4x normal. Every new doc is about messaging, positioning, or competitive framing. This isn&apos;t routine content — it&apos;s a strategic overhaul.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <ActivitySpike label="Docs created (Marketing)" normal="1-2 / week" current="6 this week" color="#22c55e" show delay={500} />
              {[
                { name: "New Messaging Framework v3", edits: 12, icon: "📄", age: "2 days ago" },
                { name: "Competitive Positioning — Q2 Refresh", edits: 8, icon: "📄", age: "3 days ago" },
                { name: "Updated Enterprise Value Props", edits: 15, icon: "📄", age: "4 days ago" },
                { name: "Customer Persona Overhaul", edits: 6, icon: "📄", age: "5 days ago" },
              ].map((d, i) => (
                <Fade key={i} show delay={800 + i * 400} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#22c55e06", border: "1px solid #22c55e12", borderRadius: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{d.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{d.age} • {d.edits} edits</div>
                    </div>
                    <div style={{ width: Math.min(d.edits * 4, 56), height: 5, borderRadius: 3, background: "#22c55e" }} />
                  </div>
                </Fade>
              ))}
              <Fade show delay={2800} duration={400}><div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'", textAlign: "center", marginTop: 6 }}>+ 2 more docs this week</div></Fade>
            </div>
          </div>
        )}

        {show("signal-comms") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ActivitySpike label="Email threads (Marketing)" normal="8 / week" current="22 this week" color="#ef4444" show delay={400} />
              <ActivitySpike label="Slack msgs in #marketing" normal="40 / week" current="127 this week" color="#e879a0" show delay={700} />
              {[
                { subj: "Re: New positioning direction — agency feedback", who: "Lisa ↔ External Agency", msgs: "14 messages", flag: true },
                { subj: "Re: Competitive analysis — urgent update needed", who: "Lisa ↔ Product team", msgs: "8 messages", flag: true },
                { subj: "Messaging workshop — pre-read materials", who: "Lisa → Full marketing team", msgs: "5 messages", flag: false },
              ].map((m, i) => (
                <Fade key={i} show delay={1000 + i * 500} duration={400}>
                  <div style={{ padding: "8px 12px", background: m.flag ? "#ef444406" : "#12122a", border: `1px solid ${m.flag ? "#ef444412" : "#1e1e3a"}`, borderRadius: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 500, marginBottom: 2 }}>{m.subj}</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.who}</span>
                      <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{m.msgs}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <TB name="Gmail + Slack" icon="📧" color="#ef4444" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Communication volume<br/><span style={{ color: "#ef4444" }}>3x normal</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>22 email threads this week vs. 8 normally. Slack messages tripled. An external agency is involved. This is coordinated strategic work — happening entirely within Marketing.</div></Fade>
            </div>
          </div>
        )}

        {show("signal-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <TB name="Calendar" icon="📅" color="#f59e0b" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>New meetings booked.<br/><span style={{ color: "#f59e0b" }}>Sales not invited.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>A full-day messaging workshop, three positioning brainstorms, and a session with the CEO. Not a single Sales rep is on any invite. The new messaging will launch without Sales input.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { title: "Messaging Workshop — Full Day", time: "Tomorrow", who: "Marketing + Agency", flag: "No Sales" },
                { title: "Positioning Brainstorm", time: "Thursday 2pm", who: "Lisa, Mark, CEO", flag: "No Sales" },
                { title: "Competitive Deep-dive", time: "Friday 10am", who: "Marketing + Product", flag: "No Sales" },
              ].map((m, i) => (
                <Fade key={i} show delay={600 + i * 500} duration={400}>
                  <div style={{ padding: "12px 16px", background: "#f59e0b06", border: "1px solid #f59e0b15", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, color: "#e2e8f0", fontWeight: 600 }}>{m.title}</span>
                      <span style={{ padding: "2px 8px", background: "#ef444415", borderRadius: 4, fontSize: 14, color: "#ef4444", fontWeight: 600 }}>{m.flag}</span>
                    </div>
                    <div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.time} • {m.who}</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2400} duration={400}><div style={{ padding: "8px 12px", background: "#f59e0b08", border: "1px solid #f59e0b15", borderRadius: 8, marginTop: 8, textAlign: "center" }}><span style={{ fontSize: 17, color: "#f59e0b" }}>Sales will discover the new messaging when customers get confused.</span></div></Fade>
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera detects the misalignment</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Marketing is pivoting.<br/><span style={{ color: "#f59e0b" }}>Sales, Product, and Support don&apos;t know.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#f59e0b" }}>CROSS-DEPARTMENT: Strategic repositioning with zero alignment</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>Document velocity 4x normal, all positioning-focused. Email volume 3x with external agency engaged. Workshop + 3 brainstorms scheduled — zero cross-functional attendance. New messaging will launch without Sales or Support awareness.</div>
              </div>
            </Fade>
            <Fade show delay={3000} duration={500}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {[{ step: "1", action: "Notify Sales lead about incoming changes", tool: "Slack" }, { step: "2", action: "Add Sales rep to workshop", tool: "Calendar" }, { step: "3", action: "Schedule cross-team alignment", tool: "Calendar" }].map((s, i) => (
                  <Fade key={i} show delay={3200 + i * 300} duration={400}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: "#a855f718", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                      <div><div style={{ fontSize: 17, color: "#e2e8f0" }}>{s.action}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{s.tool}</div></div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {show("impact") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={700}>
              <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 32 }}>
                <div style={{ textAlign: "center", padding: "24px 32px", background: "#1a1a2e", border: "1px solid #ef444420", borderRadius: 14 }}>
                  <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 8, fontWeight: 600 }}>Without Qorpera</div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 220 }}>New messaging goes live. Sales is pitching the old story. Customers get inconsistent messages. Deals stall. Two months of pipeline damage before anyone connects the dots.</div>
                </div>
                <div style={{ textAlign: "center", padding: "24px 32px", background: "#1a1a2e", border: "1px solid #22c55e20", borderRadius: 14 }}>
                  <div style={{ fontSize: 18, color: "#22c55e", marginBottom: 8, fontWeight: 600 }}>With Qorpera</div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 220 }}>Sales joins the workshop. The new messaging launches with aligned pitch decks. Support updates their talk tracks. Product updates the roadmap page. One launch. One story.</div>
                </div>
              </div>
            </Fade>
            <Fade show delay={1600} duration={600}><div style={{ fontSize: 24, color: "#94a3b8" }}>The difference between a chaotic launch and a unified one<br/>is <span style={{ color: "#e2e8f0", fontWeight: 600 }}>one conversation that happened 2 weeks earlier.</span></div></Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Strategic shifts are invisible<br/>until they aren&apos;t.<br/><span style={{ color: "#a855f7" }}>Qorpera sees them forming.</span></div></Fade>
            <Fade show delay={1200} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>Work-in-progress intelligence catches misalignment when it&apos;s still easy to fix — not after it&apos;s caused damage.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera →</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 15, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
