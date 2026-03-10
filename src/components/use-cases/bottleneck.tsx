"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-queue", duration: 10500 },
  { id: "the-calendar", duration: 9625 },
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
  useEffect(() => { if (show) { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); } setVis(false); }, [show, delay]);
  const d = { up: [0, distance], down: [0, -distance], left: [distance, 0], right: [-distance, 0], none: [0, 0] }[direction] || [0, 0];
  return <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translate(0,0)" : `translate(${d[0]}px,${d[1]}px)`, transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1), transform ${duration}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

interface QueueRowProps {
  type: string;
  item: string;
  age: string;
  dept: string;
  show: boolean;
  delay: number;
}

const QueueRow = ({ type, item, age, show, delay }: QueueRowProps) => (
  <Fade show={show} delay={delay} duration={300}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#ef444406", border: "1px solid #ef444410", borderRadius: 8, marginBottom: 3 }}>
      <span style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'", width: 55, fontWeight: 600 }}>{type}</span>
      <span style={{ flex: 1, fontSize: 17, color: "#e2e8f0" }}>{item}</span>
      <span style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>{age}</span>
    </div>
  </Fade>
);

interface ActionStepProps {
  step: string;
  action: string;
  tool: string;
  show: boolean;
  delay: number;
}

const ActionStep = ({ step, action, tool, show, delay }: ActionStepProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 6 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#a855f7", fontWeight: 700 }}>{step}</div>
      <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{action}</div><div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{tool}</div></div>
    </div>
  </Fade>
);

export default function BottleneckNobodySees() {
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

  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    startAnimation(target);
  }, [startAnimation]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { const s = SCENES[i]; if (elapsed < acc + s.duration) { currentScene = s.id; currentSceneIndex = i; break; } acc += s.duration; }
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Operations</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Bottleneck<br/>Nobody Sees</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>One person is the approval gate on 12 workflows.<br/>Everything waits. Nobody knows why things are slow.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Organizational bottlenecks are invisible<br/>until you map the flow of approvals.</div></Fade>
          </div>
        )}

        {show("the-queue") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#ef444415", border: "1px solid #ef444440", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📧</span><span style={{ fontSize: 18, color: "#ef4444", fontWeight: 500 }}>Gmail</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>23 emails waiting for<br/><span style={{ color: "#ef4444" }}>the same person&apos;s approval</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>VP of Operations, Karen, is the approval bottleneck. Contracts, hire approvals, budget exceptions, vendor sign-offs — everything routes through her inbox.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 8 }}>Pending approvals — Karen&apos;s inbox</div></Fade>
              {[
                { type: "Contract", item: "Agency SOW — Brand Studio Co", age: "9 days", dept: "Marketing" },
                { type: "Hire", item: "Senior Engineer requisition", age: "7 days", dept: "Engineering" },
                { type: "Budget", item: "Q2 conference travel exception", age: "6 days", dept: "Sales" },
                { type: "Vendor", item: "DataView Inc SaaS agreement", age: "5 days", dept: "Operations" },
                { type: "Contract", item: "Freelancer NDA — design work", age: "4 days", dept: "Marketing" },
                { type: "Hire", item: "Customer Success Manager req", age: "3 days", dept: "Support" },
              ].map((r, i) => (
                <QueueRow key={i} type={r.type} item={r.item} age={r.age} dept={r.dept} show delay={600 + i * 350} />
              ))}
              <Fade show delay={3000} duration={400}><div style={{ textAlign: "center", marginTop: 8, fontSize: 17, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>+ 17 more across Slack, Drive, and email</div></Fade>
            </div>
          </div>
        )}

        {show("the-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #f59e0b20", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Karen&apos;s calendar — this week</div>
                  <div style={{ position: "relative", height: 200 }}>
                    {Array.from({ length: 5 }).map((_, day) => (
                      <div key={day} style={{ position: "absolute", left: `${day * 20}%`, width: "18%", top: 0, bottom: 0, borderRight: "1px solid #1e1e3a" }}>
                        <div style={{ fontSize: 12, color: "#4a5568", textAlign: "center", fontFamily: "'JetBrains Mono'" }}>{["Mon", "Tue", "Wed", "Thu", "Fri"][day]}</div>
                        {Array.from({ length: 4 + (day % 2) }).map((_, m) => (
                          <Fade key={m} show delay={600 + day * 200 + m * 100} duration={200}>
                            <div style={{ margin: "2px 1px", height: 20 + (m * 7) % 15, background: "#f59e0b20", border: "1px solid #f59e0b15", borderRadius: 3, fontSize: 11, color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>mtg</div>
                          </Fade>
                        ))}
                      </div>
                    ))}
                  </div>
                  <Fade show delay={2000} duration={400}><div style={{ fontSize: 17, color: "#ef4444", fontWeight: 600, textAlign: "center", marginTop: 8 }}>95% booked — zero open slots for approvals</div></Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📅</span><span style={{ fontSize: 18, color: "#f59e0b", fontWeight: 500 }}>Calendar</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>No time to approve<br/><span style={{ color: "#f59e0b" }}>because no time at all</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Karen&apos;s calendar is 95% booked. Back-to-back meetings from 9am to 6pm. Approvals happen in the gaps — if there are any. Most weeks there aren&apos;t.</div></Fade>
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera maps the bottleneck</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>One person blocking<br/><span style={{ color: "#ef4444" }}>12 workflows across 4 departments</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#ef4444" }}>BOTTLENECK: VP Ops is single approval gate</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>
                  23 pending approvals (avg wait: 5.7 days). Calendar 95% utilized. Approval backlog growing 4 items/week. Blocking: 2 hires, 3 contracts, 2 vendor agreements, budget exceptions. Avg company-wide delay per approval: 3.2 days.
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Nobody blamed Karen. Nobody saw the pattern. The AI mapped the dependency.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Distribute the<br/>approval authority</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The fix isn&apos;t working harder. It&apos;s delegation. Contracts under &euro;5K, travel under &euro;2K, standard vendor renewals — none of these need VP sign-off.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Present approval backlog analysis to Karen + CEO", tool: "Email" },
                { step: "2", action: "Propose tiered approval authority by amount + type", tool: "Drive" },
                { step: "3", action: "Create delegation policy document for team leads", tool: "Drive" },
                { step: "4", action: "Clear the backlog: batch-approve low-risk items", tool: "Email + Slack" },
              ].map((s, i) => (
                <ActionStep key={i} step={s.step} action={s.action} tool={s.tool} show delay={500 + i * 500} />
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Org charts show hierarchy.<br/><span style={{ color: "#a855f7" }}>Qorpera shows flow.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI maps who approves what and how long it takes, it reveals bottlenecks that org charts hide. The fix is structural, not motivational.</div></Fade>
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
