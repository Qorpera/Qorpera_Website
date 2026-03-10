"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-rule", duration: 9625 },
  { id: "signal-docs", duration: 10500 },
  { id: "signal-email", duration: 9625 },
  { id: "the-gap", duration: 10500 },
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

export default function ComplianceGap() {
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Legal &amp; Compliance</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Compliance Gap</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>The legal team knows about the new regulation.<br/>They discussed it. They updated some contracts.<br/>They missed four.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The gap between knowing about a requirement<br/>and actually implementing it everywhere.</div></Fade>
          </div>
        )}

        {show("the-rule") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>The requirement</div></Fade>
            <Fade show delay={600} duration={700}>
              <div style={{ maxWidth: 540, margin: "0 auto", background: "#1a1a2e", border: "1px solid #ef444425", borderRadius: 14, padding: 24, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 30 }}>⚖️</span>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>New Data Processing Regulation — Article 14</div>
                    <div style={{ fontSize: 17, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>Enforcement date: April 1 — 22 days away</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 14 }}>All vendor and partner contracts must include a data processing addendum specifying: data residency requirements, breach notification timelines (72 hours max), and right-to-deletion procedures. Non-compliance penalty: up to 4% of annual revenue.</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {[{ label: "Contracts to update", value: "8 active", color: "#e2e8f0" }, { label: "Deadline", value: "22 days", color: "#f59e0b" }, { label: "Penalty risk", value: "4% revenue", color: "#ef4444" }].map((s, i) => (
                    <Fade key={i} show delay={1200 + i * 300} duration={400}>
                      <div style={{ flex: 1, textAlign: "center", padding: "8px", background: "#12122a", borderRadius: 8 }}>
                        <div style={{ fontSize: 14, color: "#64748b" }}>{s.label}</div>
                        <div style={{ fontSize: 21, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk'" }}>{s.value}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </Fade>
            <Fade show delay={2600} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", marginTop: 20 }}>Legal knows about this. They discussed it 3 weeks ago.<br/><span style={{ color: "#64748b" }}>But knowing isn&apos;t the same as doing.</span></div></Fade>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <TB name="Google Drive" icon="📁" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>8 active contracts.<br/><span style={{ color: "#ef4444" }}>4 missing the clause.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The AI scanned all active vendor and partner contracts in Drive. Four are missing the required data processing addendum. Two were updated. Two were never touched.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 8 }}>Contract compliance scan</div></Fade>
              {[
                { vendor: "CloudHost Inc", status: "compliant", clause: "✓ DPA added Feb 12", color: "#22c55e" },
                { vendor: "DataSync Partners", status: "compliant", clause: "✓ DPA added Feb 15", color: "#22c55e" },
                { vendor: "AnalytiCo", status: "missing", clause: "✗ No DPA clause", color: "#ef4444" },
                { vendor: "Brand Studio Co", status: "missing", clause: "✗ No DPA clause — new contract", color: "#ef4444" },
                { vendor: "SecureVault Storage", status: "missing", clause: "✗ No DPA clause", color: "#ef4444" },
                { vendor: "APIConnect Ltd", status: "missing", clause: "✗ No DPA clause — expires May", color: "#ef4444" },
                { vendor: "MarketEdge Agency", status: "partial", clause: "⚠ DPA present but missing breach timeline", color: "#f59e0b" },
                { vendor: "TechRecruiters", status: "partial", clause: "⚠ DPA present but missing deletion procedures", color: "#f59e0b" },
              ].map((c, i) => (
                <Fade key={i} show delay={600 + i * 300} duration={300}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: c.status === "missing" ? "#ef444406" : c.status === "partial" ? "#f59e0b04" : "#22c55e04", border: `1px solid ${c.color}12`, borderRadius: 6, marginBottom: 3 }}>
                    <span style={{ flex: 1, fontSize: 17, color: "#e2e8f0" }}>{c.vendor}</span>
                    <span style={{ fontSize: 14, color: c.color, fontFamily: "'JetBrains Mono'", maxWidth: 200, textAlign: "right" }}>{c.clause}</span>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("signal-email") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              {[
                { who: "Head of Legal → Team", subj: "Action needed: Article 14 compliance for vendor contracts", date: "3 weeks ago", note: "Initiated the review" },
                { who: "Legal Associate → Head of Legal", subj: "Re: Updated CloudHost and DataSync contracts", date: "2 weeks ago", note: "Reported 2 of 8 done" },
                { who: "Head of Legal → Team", subj: "Re: Article 14 — where are we on the remaining contracts?", date: "6 days ago", note: "Follow-up — no response" },
              ].map((m, i) => (
                <Fade key={i} show delay={400 + i * 600} duration={400}>
                  <div style={{ padding: "12px 14px", background: i === 2 ? "#f59e0b06" : "#12122a", border: `1px solid ${i === 2 ? "#f59e0b15" : "#1e1e3a"}`, borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 17, color: "#a855f7", fontWeight: 600 }}>{m.who}</span>
                      <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.date}</span>
                    </div>
                    <div style={{ fontSize: 18, color: "#e2e8f0", marginBottom: 2 }}>{m.subj}</div>
                    <div style={{ fontSize: 15, color: "#64748b", fontStyle: "italic" }}>{m.note}</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2400} duration={400}>
                <div style={{ padding: "8px 12px", background: "#f59e0b08", border: "1px solid #f59e0b15", borderRadius: 8, textAlign: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 17, color: "#f59e0b" }}>Task started. Follow-up sent. No completion. Classic execution gap.</span>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <TB name="Gmail" icon="📧" color="#ef4444" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>They knew about it.<br/><span style={{ color: "#f59e0b" }}>They started it.<br/>They didn&apos;t finish.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Email threads show the legal team discussed Article 14 three weeks ago. Two contracts were updated. Then it stalled. The follow-up email got no response. Six contracts remain non-compliant.</div></Fade>
            </div>
          </div>
        )}

        {show("the-gap") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera bridges the gap</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Awareness ≠ Compliance.<br/><span style={{ color: "#ef4444" }}>22 days to enforcement. 4 contracts exposed.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 14, textAlign: "left", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#ef4444" }}>COMPLIANCE RISK: Article 14 implementation incomplete</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>
                  8 active vendor contracts require DPA. 2 compliant. 2 partially compliant (missing subclauses). 4 completely missing. Legal team initiated review 3 weeks ago but execution stalled after 2 updates. Follow-up email unanswered. Enforcement in 22 days.
                </div>
              </div>
            </Fade>
            <Fade show delay={3000} duration={600}>
              <div style={{ display: "flex", gap: 32, justifyContent: "center" }}>
                {[{ n: "4", l: "Contracts with zero DPA", c: "#ef4444" }, { n: "2", l: "Contracts with partial DPA", c: "#f59e0b" }, { n: "22", l: "Days to enforcement", c: "#f59e0b" }, { n: "4%", l: "Revenue at risk", c: "#ef4444" }].map((s, i) => (
                  <Fade key={i} show delay={3200 + i * 300} duration={400}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 42, fontWeight: 700, color: s.c, fontFamily: "'Space Grotesk'" }}>{s.n}</div>
                      <div style={{ fontSize: 15, color: "#94a3b8" }}>{s.l}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Close the gap<br/>before enforcement</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>22 days is tight but doable — if the team knows exactly which contracts need what. The AI provides the complete gap analysis so Legal can act immediately.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Alert Head of Legal with complete gap analysis", tool: "Email" },
                { step: "2", action: "Generate DPA addendum template from compliant contracts", tool: "Drive" },
                { step: "3", action: "Create vendor-specific amendment docs for 4 missing contracts", tool: "Drive" },
                { step: "4", action: "Send amendment requests to each vendor with deadline", tool: "Email" },
                { step: "5", action: "Schedule weekly compliance check until enforcement date", tool: "Calendar" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 450} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 5 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Checklists track requirements.<br/><span style={{ color: "#a855f7" }}>Qorpera tracks implementation.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>The most dangerous compliance gap isn&apos;t ignorance — it&apos;s knowing about the requirement but not finishing the implementation. Activity intelligence tracks both the intent and the execution.</div></Fade>
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
