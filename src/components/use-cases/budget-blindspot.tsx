"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "surface", duration: 9625 },
  { id: "signal-docs", duration: 9625 },
  { id: "signal-email", duration: 9625 },
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
  useEffect(() => { if (show) { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); } setVis(false); }, [show, delay]);
  const d = { up:[0,distance], down:[0,-distance], left:[distance,0], right:[-distance,0], none:[0,0] }[direction]||[0,0];
  return <div style={{ opacity:vis?1:0, transform:vis?"translate(0,0)":`translate(${d[0]}px,${d[1]}px)`, transition:`opacity ${duration}ms cubic-bezier(.22,1,.36,1), transform ${duration}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

interface ToolBadgeProps {
  name: string;
  icon: string;
  color: string;
  show: boolean;
  delay: number;
}

const ToolBadge = ({ name, icon, color, show, delay }: ToolBadgeProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 18, color, fontWeight: 500 }}>{name}</span>
    </div>
  </Fade>
);

interface BudgetRowProps {
  dept: string;
  budget: string;
  actual: string;
  overage?: string;
  show: boolean;
  delay: number;
}

const BudgetRow = ({ dept, budget, actual, overage, show, delay }: BudgetRowProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: overage ? "#ef444408" : "#12122a", border: `1px solid ${overage ? "#ef444420" : "#1e1e3a"}`, borderRadius: 10, marginBottom: 5 }}>
      <div style={{ flex: 1, fontSize: 19, color: "#e2e8f0", fontWeight: 500 }}>{dept}</div>
      <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", width: 80, textAlign: "right" }}>{budget}</div>
      <div style={{ fontSize: 17, color: overage ? "#ef4444" : "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", width: 80, textAlign: "right" }}>{actual}</div>
      {overage && <span style={{ padding: "2px 6px", background: "#ef444418", borderRadius: 4, fontSize: 14, color: "#ef4444" }}>+{overage}</span>}
    </div>
  </Fade>
);

interface SpendItemProps {
  icon: string;
  label: string;
  amount: string;
  status: "unapproved" | "approved";
  show: boolean;
  delay: number;
}

const SpendItem = ({ icon, label, amount, status, show, delay }: SpendItemProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: status === "unapproved" ? "#f59e0b08" : "#12122a", border: `1px solid ${status === "unapproved" ? "#f59e0b20" : "#1e1e3a"}`, borderRadius: 10, marginBottom: 5 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 14, color: status === "unapproved" ? "#f59e0b" : "#4a5568", fontFamily: "'JetBrains Mono', monospace" }}>{status === "unapproved" ? "Not in budget" : "Budget approved"}</div>
      </div>
      <div style={{ fontSize: 19, fontWeight: 600, color: status === "unapproved" ? "#f59e0b" : "#94a3b8", fontFamily: "'JetBrains Mono', monospace" }}>{amount}</div>
    </div>
  </Fade>
);

export default function BudgetBlindspot() {
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
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Finance</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Budget Blindspot</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Q2 budget is locked and approved.<br/>Real spending is about to blow past it.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>When spending decisions happen outside finance tools,<br/>finance is the last to know.</div></Fade>
          </div>
        )}

        {show("surface") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>What the budget tracker shows</div></Fade>
            <Fade show delay={600} duration={700}>
              <div style={{ maxWidth: 500, margin: "0 auto" }}>
                <div style={{ display: "flex", gap: 12, padding: "8px 16px", marginBottom: 4 }}>
                  <div style={{ flex: 1, fontSize: 14, color: "#4a5568", fontWeight: 600 }}>Department</div>
                  <div style={{ fontSize: 14, color: "#4a5568", fontWeight: 600, width: 80, textAlign: "right" }}>Budget</div>
                  <div style={{ fontSize: 14, color: "#4a5568", fontWeight: 600, width: 80, textAlign: "right" }}>Actual</div>
                  <div style={{ width: 40 }} />
                </div>
                <BudgetRow dept="Engineering" budget="€180K" actual="€142K" show delay={800} />
                <BudgetRow dept="Marketing" budget="€95K" actual="€78K" show delay={1000} />
                <BudgetRow dept="Sales" budget="€120K" actual="€98K" show delay={1200} />
                <BudgetRow dept="Operations" budget="€60K" actual="€51K" show delay={1400} />
              </div>
            </Fade>
            <Fade show delay={2200} duration={600}>
              <div style={{ marginTop: 20, padding: "8px 20px", background: "#22c55e10", border: "1px solid #22c55e25", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#22c55e", fontSize: 19, fontWeight: 600 }}>All departments under budget</span>
              </div>
            </Fade>
            <Fade show delay={3000} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 16 }}>But commitments are being made that haven&apos;t hit the books yet.</div></Fade>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Google Drive" icon="📁" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>New vendor contracts<br/><span style={{ color: "#f59e0b" }}>outside the budget</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Marketing created 3 new contract documents this week. Two are with agencies, one is a SaaS tool agreement. None were in the Q2 budget.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <SpendItem icon="📋" label="Agency Agreement — Brand Studio Co" amount="€18K/mo" status="unapproved" show delay={600} />
              <SpendItem icon="📋" label="Contractor SOW — Content Writer" amount="€4.5K/mo" status="unapproved" show delay={1000} />
              <SpendItem icon="📋" label="SaaS License — VideoGen Pro" amount="€890/mo" status="unapproved" show delay={1400} />
              <Fade show delay={2200} duration={400}>
                <div style={{ padding: "10px 14px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 10, marginTop: 8, textAlign: "center" }}>
                  <span style={{ fontSize: 19, color: "#f59e0b", fontWeight: 600 }}>€23.4K/month in unbudgeted commitments</span>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>€140K annualized - Not in any approved budget</div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("signal-email") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              {[
                { subj: "Re: Brand Studio Co engagement kickoff", who: "Lisa (Marketing) → Agency", age: "3 days ago", flag: true },
                { subj: "SOW for content expansion — please sign", who: "Lisa → contractor", age: "5 days ago", flag: true },
                { subj: "Re: VideoGen Pro trial → paid conversion", who: "Mark (Marketing) → vendor", age: "Yesterday", flag: true },
                { subj: "FW: Q2 Marketing plan adjustments", who: "Lisa → CEO (no CC: Finance)", age: "1 week ago", flag: false },
              ].map((m, i) => (
                <Fade key={i} show delay={400 + i * 450} duration={400}>
                  <div style={{ padding: "10px 14px", marginBottom: 5, borderRadius: 10, background: m.flag ? "#f59e0b06" : "#12122a", border: `1px solid ${m.flag ? "#f59e0b15" : "#1e1e3a"}` }}>
                    <div style={{ fontSize: 18, color: "#e2e8f0", marginBottom: 3, fontWeight: 500 }}>{m.subj}</div>
                    <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono', monospace" }}>{m.who} - {m.age}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Gmail" icon="📧" color="#ef4444" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Vendor negotiations<br/><span style={{ color: "#ef4444" }}>bypassing Finance</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Email threads reveal active vendor negotiations in Marketing. Contracts being drafted and signed. Finance wasn&apos;t CC&apos;d on any of them. CEO was informed — Finance wasn&apos;t.</div></Fade>
            </div>
          </div>
        )}

        {show("signal-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Calendar" icon="📅" color="#f59e0b" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Hiring interviews<br/><span style={{ color: "#f59e0b" }}>for unplanned roles</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Marketing has 4 candidate interviews this week for a &quot;Content Strategist&quot; and a &quot;Brand Manager.&quot; Neither role is in the approved headcount plan.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { title: "Interview: Content Strategist — Candidate A", time: "Tuesday 2pm", who: "Lisa + HR", cost: "~€55K/yr" },
                { title: "Interview: Content Strategist — Candidate B", time: "Wednesday 10am", who: "Lisa + HR", cost: "~€55K/yr" },
                { title: "Interview: Brand Manager — Candidate C", time: "Thursday 3pm", who: "Lisa + Mark + HR", cost: "~€65K/yr" },
                { title: "Interview: Brand Manager — Final round", time: "Friday 11am", who: "Lisa + CEO", cost: "~€65K/yr" },
              ].map((m, i) => (
                <Fade key={i} show delay={600 + i * 450} duration={400}>
                  <div style={{ padding: "10px 14px", background: "#f59e0b06", border: "1px solid #f59e0b15", borderRadius: 10, marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{m.title}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.time} - {m.who}</span>
                      <span style={{ fontSize: 14, color: "#f59e0b", fontFamily: "'JetBrains Mono'" }}>{m.cost}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera alerts Finance</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 46, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>€260K in unbudgeted commitments<br/><span style={{ color: "#f59e0b" }}>Finance doesn&apos;t know about</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>BUDGET RISK: Marketing spending exceeds approved plan</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.7 }}>
                  3 new vendor contracts (€23.4K/mo, €140K annualized). 2 unplanned hires in interview stage (~€120K/yr combined). Total unbudgeted: ~€260K. Finance not included in any approval threads.
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>None of this is in any financial system yet. It&apos;s in emails, docs, and calendars.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Catch it before<br/>the invoices land</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>By the time vendor invoices hit the books, the commitments are already made. Intervening at the contract stage gives Finance actual control.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Alert CFO with spending summary", tool: "Email" },
                { step: "2", action: "Flag unsigned contracts for review", tool: "Drive" },
                { step: "3", action: "Schedule Marketing + Finance budget sync", tool: "Calendar" },
                { step: "4", action: "Create budget amendment proposal", tool: "Drive" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>via {s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Budgets track approvals.<br/><span style={{ color: "#a855f7" }}>Qorpera tracks commitments.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>Spending decisions happen in emails and docs long before they hit the books. Activity intelligence gives Finance visibility at commitment time, not invoice time.</div></Fade>
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
