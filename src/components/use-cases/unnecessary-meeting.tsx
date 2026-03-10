"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-invite", duration: 9625 },
  { id: "the-thread", duration: 10500 },
  { id: "the-math", duration: 8750 },
  { id: "intervention", duration: 9625 },
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

export default function UnnecessaryMeeting() {
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Collaboration</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Meeting That<br/>Shouldn&apos;t Happen</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>6 people. 1 hour. A decision that was already made<br/>in a Slack thread nobody remembered to share.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive sentence in business:<br/>&quot;Let&apos;s schedule a meeting to align.&quot;</div></Fade>
          </div>
        )}

        {show("the-invite") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📅</span><span style={{ fontSize: 18, color: "#f59e0b", fontWeight: 500 }}>Calendar</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>New meeting:<br/><span style={{ color: "#f59e0b" }}>&quot;Align on pricing model&quot;</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Product lead schedules 1 hour with Sales, Finance, Marketing, CEO, and VP Product. Agenda: &quot;Decide on the new pricing tiers.&quot;</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 21, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>📅 Pricing Model Alignment</div>
                  <div style={{ fontSize: 17, color: "#64748b", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>Thursday 2-3pm - 1 hour</div>
                  {["Emma (Product Lead)","Alex (Sales)","Maria (Finance)","Lisa (Marketing)","CEO","VP Product"].map((p, i) => (
                    <Fade key={i} show delay={1000 + i * 200} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f710", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#a855f7" }}>👤</div>
                        <span style={{ fontSize: 18, color: "#e2e8f0" }}>{p}</span>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2600} duration={400}>
                    <div style={{ marginTop: 12, padding: "6px 10px", background: "#f59e0b08", border: "1px solid #f59e0b15", borderRadius: 6, fontSize: 17, color: "#f59e0b", textAlign: "center" }}>
                      6 people × 1 hour = 6 person-hours
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("the-thread") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={300} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>#pricing-discussion — 3 days ago</div></Fade>
              {[
                { who: "Alex (Sales)", msg: "Based on the competitive analysis, three tiers makes sense. Enterprise at €99/seat, Pro at €49, Starter free.", t: "Tuesday 2:14pm" },
                { who: "Maria (Finance)", msg: "The margins work. I ran it — 70% gross margin on Pro, 82% on Enterprise. Starter is a funnel play.", t: "Tuesday 3:02pm" },
                { who: "Lisa (Marketing)", msg: "Love it. This aligns with the positioning doc I shared last week. Three tiers, clear differentiation.", t: "Tuesday 3:18pm" },
                { who: "VP Product", msg: "Agreed. Let's lock this in. Emma, can you update the spec?", t: "Tuesday 4:45pm" },
                { who: "Emma (Product Lead)", msg: "Done. Updated the pricing spec. ✅", t: "Wednesday 9:30am" },
              ].map((m, i) => (
                <Fade key={i} show delay={500 + i * 600} duration={400}>
                  <div style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: i === 4 ? "#22c55e06" : "#12122a", border: `1px solid ${i === 4 ? "#22c55e15" : "#1e1e3a"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 17, color: "#a855f7", fontWeight: 600 }}>{m.who}</span>
                      <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.t}</span>
                    </div>
                    <div style={{ fontSize: 17, color: "#cbd5e1" }}>{m.msg}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#e879a015", border: "1px solid #e879a040", borderRadius: 10 }}><span style={{ fontSize: 24 }}>💬</span><span style={{ fontSize: 18, color: "#e879a0", fontWeight: 500 }}>Slack</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>This was already<br/><span style={{ color: "#22c55e" }}>decided 3 days ago</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>All stakeholders participated. Consensus was reached. The spec was updated. The decision exists in a Slack thread that the meeting organizer didn&apos;t see.</div></Fade>
            </div>
          </div>
        )}

        {show("the-math") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={700}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.3 }}>This happens <span style={{ color: "#ef4444" }}>every week</span><br/>in every company</div></Fade>
            <div style={{ display: "flex", gap: 32, justifyContent: "center", marginBottom: 32 }}>
              {[
                { n: "$399B", l: "annual cost of unnecessary meetings (U.S.)", c: "#ef4444" },
                { n: "2hrs", l: "wasted per week per worker in pointless meetings", c: "#f59e0b" },
                { n: "13 days", l: "per employee per year lost to bad meetings", c: "#a855f7" },
              ].map((s, i) => (
                <Fade key={i} show delay={600 + i * 400} duration={500}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 54, fontWeight: 700, color: s.c, fontFamily: "'Space Grotesk'" }}>{s.n}</div>
                    <div style={{ fontSize: 18, color: "#94a3b8", maxWidth: 160 }}>{s.l}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 23, color: "#64748b" }}>The problem isn&apos;t that people schedule bad meetings.<br/>It&apos;s that they don&apos;t have the context to know the meeting is unnecessary.</div></Fade>
            <Fade show delay={2800} duration={400}><div style={{ fontSize: 14, color: "#3a3a5a", fontFamily: "'JetBrains Mono'", marginTop: 12 }}>Source: Doodle State of Meetings Report, 2019 (19M meetings, 6,500+ professionals)</div></Fade>
          </div>
        )}

        {show("intervention") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera has the context</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 28px", background: "#22c55e08", border: "1px solid #22c55e20", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#22c55e" }}>SUGGESTION: This decision already exists</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
                  The pricing model was discussed and decided in #pricing-discussion on Tuesday. All invited attendees participated. The spec was updated Wednesday. This meeting can be replaced with a thread summary.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ padding: "6px 16px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#16a34a)", fontSize: 18, color: "#fff", fontWeight: 600 }}>View Thread Summary</div>
                  <div style={{ padding: "6px 16px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", fontSize: 18, color: "#94a3b8" }}>Keep Meeting</div>
                </div>
              </div>
            </Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8" }}>6 person-hours saved. Decision already made.<br/><span style={{ color: "#22c55e", fontWeight: 600 }}>The decision already exists. Now you know.</span></div></Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Calendars schedule meetings.<br/><span style={{ color: "#a855f7" }}>Qorpera knows which ones you don&apos;t need.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI knows what was already discussed, decided, and documented — it can tell you which meetings to skip and which ones matter.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera →</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
