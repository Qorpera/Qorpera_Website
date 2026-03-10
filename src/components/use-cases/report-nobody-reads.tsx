"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-effort", duration: 9625 },
  { id: "the-truth", duration: 10500 },
  { id: "detection", duration: 9625 },
  { id: "action", duration: 8750 },
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

interface WeekRowProps {
  week: string;
  hours: number;
  views: number;
  replies: number;
  show: boolean;
  delay: number;
}

const WeekRow = ({ week, hours, views, replies, show, delay }: WeekRowProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "8px 0", borderBottom: "1px solid #1e1e3a" }}>
      <div style={{ width: 60, fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{week}</div>
      <div style={{ width: 80, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "2px 8px", background: "#3b82f615", borderRadius: 4, fontSize: 17, color: "#3b82f6", fontFamily: "'JetBrains Mono'" }}>{hours}h</div>
      </div>
      <div style={{ width: 80, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "2px 8px", background: views > 1 ? "#22c55e15" : "#ef444412", borderRadius: 4, fontSize: 17, color: views > 1 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono'" }}>{views}</div>
      </div>
      <div style={{ width: 80, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "2px 8px", background: replies > 0 ? "#22c55e15" : "#ef444412", borderRadius: 4, fontSize: 17, color: replies > 0 ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono'" }}>{replies}</div>
      </div>
    </div>
  </Fade>
);

export default function ReportNobodyReads() {
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Workflow</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Report<br/>Nobody Reads</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>4 hours every Friday. A beautifully formatted report.<br/>Opened by one person: the author.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Effort without engagement is waste disguised as work.</div></Fade>
          </div>
        )}

        {show("the-effort") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📊</span><span style={{ fontSize: 18, color: "#3b82f6", fontWeight: 500 }}>Weekly Ops Report</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Every Friday,<br/><span style={{ color: "#3b82f6" }}>like clockwork</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Tom in Operations spends 4 hours assembling a weekly status report. Pulls data from 5 tools, formats it in a spreadsheet, writes a summary email, sends it to the full team.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>Weekly effort breakdown</div>
                  {[
                    { task: "Pull CRM pipeline data", time: "45 min", icon: "🔧" },
                    { task: "Pull revenue numbers from Stripe", time: "30 min", icon: "💳" },
                    { task: "Compile support metrics", time: "30 min", icon: "🎫" },
                    { task: "Format spreadsheet + charts", time: "60 min", icon: "📊" },
                    { task: "Write summary + commentary", time: "45 min", icon: "✍️" },
                    { task: "Send email to 12 recipients", time: "10 min", icon: "📧" },
                  ].map((t, i) => (
                    <Fade key={i} show delay={1000 + i * 250} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #1e1e3a" }}>
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        <span style={{ flex: 1, fontSize: 17, color: "#e2e8f0" }}>{t.task}</span>
                        <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{t.time}</span>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2800} duration={400}><div style={{ marginTop: 10, fontSize: 18, color: "#3b82f6", fontWeight: 600, textAlign: "right" }}>Total: ~4 hours / week</div></Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("the-truth") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={300} duration={400}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", gap: 0, padding: "6px 0", borderBottom: "1px solid #2a2a4a", marginBottom: 4 }}>
                    <div style={{ width: 60, fontSize: 15, color: "#4a5568", fontWeight: 600 }}>Week</div>
                    <div style={{ width: 80, textAlign: "center", fontSize: 15, color: "#4a5568", fontWeight: 600 }}>Time spent</div>
                    <div style={{ width: 80, textAlign: "center", fontSize: 15, color: "#4a5568", fontWeight: 600 }}>Doc views</div>
                    <div style={{ width: 80, textAlign: "center", fontSize: 15, color: "#4a5568", fontWeight: 600 }}>Replies</div>
                  </div>
                  <WeekRow week="W1" hours={4} views={1} replies={0} show delay={500} />
                  <WeekRow week="W2" hours={4} views={2} replies={0} show delay={700} />
                  <WeekRow week="W3" hours={3.5} views={1} replies={0} show delay={900} />
                  <WeekRow week="W4" hours={4} views={1} replies={0} show delay={1100} />
                  <WeekRow week="W5" hours={4} views={0} replies={0} show delay={1300} />
                  <WeekRow week="W6" hours={4} views={1} replies={0} show delay={1500} />
                  <Fade show delay={2000} duration={400}>
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#ef444410", border: "1px solid #ef444420", borderRadius: 8, textAlign: "center" }}>
                      <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600 }}>24 hours invested. 6 views (5 by author). 0 replies.</span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#22c55e15", border: "1px solid #22c55e40", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📁</span><span style={{ fontSize: 18, color: "#22c55e", fontWeight: 500 }}>Drive + Gmail</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Nobody opens it.<br/><span style={{ color: "#ef4444" }}>Nobody replies.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Drive activity shows the report doc is opened almost exclusively by Tom himself. The email gets zero replies. Zero forwards. The engagement is effectively zero — 24 hours of effort meeting an empty room.</div></Fade>
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera measures effort vs impact</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>4 hours/week on work<br/><span style={{ color: "#ef4444" }}>with zero engagement</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#f59e0b" }}>LOW IMPACT: Weekly Ops Report has near-zero engagement</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Tom spends ~4h/week on this report. Over 6 weeks: 1 view by a non-author, 0 replies, 0 forwards. 24 person-hours invested with no measurable engagement. Consider restructuring or automating.
                </div>
              </div>
            </Fade>
            <Fade show delay={3000} duration={600}><div style={{ fontSize: 18, color: "#64748b", marginTop: 16, fontFamily: "'JetBrains Mono'" }}>Nobody told Tom his report wasn&apos;t landing. The engagement data did.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Automate, restructure,<br/>or kill it</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Three options, all better than the status quo. Give Tom his Friday back.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "A", action: "AI auto-generates the report from connected tools", tool: "Qorpera automates it", color: "#22c55e" },
                { step: "B", action: "Convert to a 3-line Slack summary instead", tool: "Less effort, more visible", color: "#3b82f6" },
                { step: "C", action: "Ask the team: does anyone use this?", tool: "Validate before killing", color: "#f59e0b" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 600} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: s.color, fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Task lists track effort.<br/><span style={{ color: "#a855f7" }}>Qorpera tracks impact.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI sees both the effort going in and the engagement coming out, it can tell you which work matters and which work is theater.</div></Fade>
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
