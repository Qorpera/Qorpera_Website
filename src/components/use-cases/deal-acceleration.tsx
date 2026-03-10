"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "crm-lie", duration: 9625 },
  { id: "signal-docs", duration: 9625 },
  { id: "signal-email", duration: 10500 },
  { id: "signal-calendar", duration: 8750 },
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

interface MiniGaugeProps {
  label: string;
  before: string;
  after: string;
  color: string;
  show: boolean;
  delay: number;
}

const MiniGauge = ({ label, before, after, color, show, delay }: MiniGaugeProps) => (
  <Fade show={show} delay={delay} duration={500}>
    <div style={{ background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 120 }}>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4, fontFamily: "'JetBrains Mono'" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
        <span style={{ fontSize: 17, color: "#4a5568", textDecoration: "line-through" }}>{before}</span>
        <span style={{ fontSize: 18, color: "#4a5568" }}>→</span>
        <span style={{ fontSize: 27, fontWeight: 700, color, fontFamily: "'Space Grotesk'" }}>{after}</span>
      </div>
    </div>
  </Fade>
);

export default function DealAcceleration() {
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Sales Intelligence</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Deal That&apos;s<br/>Actually Closing</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>The CRM says this deal is stalled. 21 days in Negotiation.<br/>The activity tells a completely different story.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Pipeline reviews are based on stage updates.<br/>Buying signals live in activity data.</div></Fade>
          </div>
        )}

        {show("crm-lie") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>What the pipeline says</div></Fade>
            <Fade show delay={600} duration={700}>
              <div style={{ maxWidth: 520, margin: "0 auto", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 24, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div><div style={{ fontSize: 27, fontWeight: 700, color: "#e2e8f0" }}>Nexus Industries</div><div style={{ fontSize: 18, color: "#64748b" }}>Enterprise Platform License • €125K</div></div>
                  <div style={{ padding: "4px 12px", background: "#f59e0b18", border: "1px solid #f59e0b30", borderRadius: 6, fontSize: 17, color: "#f59e0b" }}>Negotiation</div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "#1e1e3a", overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: "60%", borderRadius: 4, background: "linear-gradient(90deg,#f59e0b,#f59e0b60)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 17, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>⚠ 21 days without stage change</span>
                  <span style={{ fontSize: 17, color: "#64748b" }}>Close probability: 35%</span>
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", marginTop: 24 }}>A pipeline review would say: <span style={{ color: "#ef4444", fontWeight: 600 }}>&quot;Follow up or deprioritize.&quot;</span><br/><span style={{ color: "#64748b" }}>That would be exactly wrong.</span></div></Fade>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <TB name="Google Drive" icon="📁" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>They&apos;re reading<br/><span style={{ color: "#22c55e" }}>everything you shared</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Your proposal was opened 11 times this week — by 3 new people you haven&apos;t met. The technical spec has new viewers. Someone downloaded the ROI calculator twice.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { name: "Proposal_NexusEnterprise_v2.pdf", activity: "11 views this week", who: "CTO, VP Eng, Procurement (new)", hot: true },
                { name: "Technical_Architecture_Spec.pdf", activity: "7 views, 3 new viewers", who: "VP Eng + 2 unknown contacts", hot: true },
                { name: "ROI_Calculator_Nexus.xlsx", activity: "4 views, downloaded 2x", who: "CFO (new), Procurement", hot: true },
                { name: "Case_Study_SimilarCo.pdf", activity: "2 views", who: "CTO", hot: false },
              ].map((d, i) => (
                <Fade key={i} show delay={600 + i * 450} duration={400}>
                  <div style={{ padding: "10px 14px", background: d.hot ? "#22c55e06" : "#12122a", border: `1px solid ${d.hot ? "#22c55e15" : "#1e1e3a"}`, borderRadius: 10, marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{d.name}</span>
                      {d.hot && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e60" }} />}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{d.activity}</span>
                      <span style={{ fontSize: 14, color: "#4a5568" }}>{d.who}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("signal-email") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <MiniGauge label="Response time" before="2 days" after="2 hrs" color="#22c55e" show delay={500} />
                <MiniGauge label="Thread length" before="3 msgs" after="12 msgs" color="#22c55e" show delay={800} />
                <MiniGauge label="Stakeholders" before="1 contact" after="4 contacts" color="#22c55e" show delay={1100} />
              </div>
              <Fade show delay={1800} duration={500}>
                <div style={{ padding: "12px 14px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 10 }}>
                  <div style={{ fontSize: 17, color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>Latest email — 2 hours ago</div>
                  <div style={{ fontSize: 18, color: "#e2e8f0", fontStyle: "italic" }}>&quot;Can we get your CEO on a call Thursday? Our board wants to move on this before end of quarter.&quot;</div>
                  <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'", marginTop: 4 }}>From: VP Engineering, Nexus Industries</div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <TB name="Gmail" icon="📧" color="#ef4444" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Response times<br/><span style={{ color: "#22c55e" }}>collapsed from days to hours</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>They went from 2-day replies to 2-hour replies. Four new stakeholders joined the email thread — including their CFO and Procurement. Someone just mentioned &quot;board approval.&quot;</div></Fade>
            </div>
          </div>
        )}

        {show("signal-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <TB name="Calendar" icon="📅" color="#f59e0b" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>They requested a<br/><span style={{ color: "#22c55e" }}>CEO-to-CEO meeting</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>A meeting request came in from their VP Engineering — requesting a call between both CEOs. This doesn&apos;t happen for stalled deals. This happens for deals about to close.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#22c55e", fontFamily: "'JetBrains Mono'", marginBottom: 10, fontWeight: 600 }}>Acceleration timeline — this week</div></Fade>
              {[
                { icon: "📧", text: "CTO replies in 2 hours (was 2 days)", day: "Monday" },
                { icon: "📁", text: "Proposal opened by 3 new stakeholders", day: "Tuesday" },
                { icon: "📁", text: "CFO downloads ROI calculator", day: "Wednesday" },
                { icon: "📧", text: "VP Eng: 'Our board wants to move on this'", day: "Wednesday" },
                { icon: "📅", text: "CEO meeting requested for Thursday", day: "Today" },
              ].map((e, i) => (
                <Fade key={i} show delay={600 + i * 400} duration={400}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6, paddingLeft: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 20 }}>
                      <span style={{ fontSize: 18 }}>{e.icon}</span>
                      {i < 4 && <div style={{ width: 1, height: 14, background: "#22c55e30", marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, color: "#22c55e", fontWeight: 500 }}>{e.text}</div>
                      <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{e.day}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera overrides the CRM</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>CRM says: <span style={{ color: "#ef4444" }}>stalled, 35% probability.</span><br/>Activity says: <span style={{ color: "#22c55e" }}>closing, 91% confidence.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#22c55e08", border: "1px solid #22c55e20", borderRadius: 14, textAlign: "left", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#22c55e" }}>ACCELERATION: Nexus deal is closing — act now</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>Response time dropped 95% (2d → 2h). 4 new stakeholders including CFO and Procurement. Proposal viewed 11x. ROI calculator downloaded. CEO meeting requested. Board mentioned. Activity pattern matches closed-won deals at 91% confidence.</div>
              </div>
            </Fade>
            <Fade show delay={3000} duration={500}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {[{ s: "1", a: "Confirm CEO availability Thursday", t: "Calendar" }, { s: "2", a: "Prep executive briefing", t: "Drive" }, { s: "3", a: "Send meeting agenda with pricing", t: "Gmail" }, { s: "4", a: "Update stage to Closing", t: "HubSpot" }].map((s, i) => (
                  <Fade key={i} show delay={3200 + i * 250} duration={300}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: "#22c55e18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#22c55e", fontWeight: 700 }}>{s.s}</div>
                      <div><div style={{ fontSize: 15, color: "#e2e8f0" }}>{s.a}</div><div style={{ fontSize: 12, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{s.t}</div></div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={700}>
              <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 32 }}>
                <div style={{ textAlign: "center", padding: "24px 32px", background: "#1a1a2e", border: "1px solid #ef444420", borderRadius: 14 }}>
                  <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 8, fontWeight: 600 }}>Without Qorpera</div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 220 }}>Pipeline review flags it as stalled. Rep gets told to &quot;follow up harder.&quot; The deal closes 3 weeks late because nobody escalated to the CEO. Or worse — a competitor moved faster.</div>
                </div>
                <div style={{ textAlign: "center", padding: "24px 32px", background: "#1a1a2e", border: "1px solid #22c55e20", borderRadius: 14 }}>
                  <div style={{ fontSize: 18, color: "#22c55e", marginBottom: 8, fontWeight: 600 }}>With Qorpera</div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 220 }}>Activity signals override the CRM. CEO call happens Thursday. Executive briefing is prepped with their specific asks. Deal closes this week. €125K booked before the quarter ends.</div>
                </div>
              </div>
            </Fade>
            <Fade show delay={1600} duration={600}><div style={{ fontSize: 24, color: "#94a3b8" }}>The difference: <span style={{ color: "#e2e8f0", fontWeight: 600 }}>reading the activity, not the stage.</span></div></Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>CRM stages are guesses.<br/><span style={{ color: "#a855f7" }}>Activity is evidence.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>Hot deals don&apos;t always look hot in the pipeline. Cold deals don&apos;t always look cold. Activity intelligence sees the truth behind the stage — and tells you when to move.</div></Fade>
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
