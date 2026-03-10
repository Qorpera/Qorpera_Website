"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-pile", duration: 9625 },
  { id: "the-math", duration: 10500 },
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

export default function ExpenseCreep() {
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

  const subscriptions = [
    { name: "Zoom", dept: "Sales", cost: "€45", flag: "duplicate" },
    { name: "Google Meet", dept: "Engineering", cost: "€0", flag: "duplicate" },
    { name: "Asana", dept: "Marketing", cost: "€180", flag: "duplicate" },
    { name: "Monday", dept: "Operations", cost: "€220", flag: "duplicate" },
    { name: "Slack", dept: "Company-wide", cost: "€680", flag: "duplicate" },
    { name: "Teams", dept: "HR", cost: "€275", flag: "duplicate" },
    { name: "Figma", dept: "Design", cost: "€390", flag: "" },
    { name: "HubSpot", dept: "Sales", cost: "€450", flag: "" },
    { name: "Notion", dept: "Engineering", cost: "€160", flag: "" },
    { name: "Jira", dept: "Engineering", cost: "€340", flag: "seats" },
    { name: "Salesforce", dept: "Sales", cost: "€890", flag: "seats" },
    { name: "Miro", dept: "Design", cost: "€120", flag: "" },
    { name: "DocuSign", dept: "Legal", cost: "€320", flag: "dormant" },
    { name: "Intercom", dept: "Support", cost: "€560", flag: "" },
  ];

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Finance</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Subscriptions That Grew</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>14 SaaS tools across departments. 3 are duplicates. 2 have unused seats. Total waste: &euro;2,400/month — each one approved by a different person.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>No single subscription is expensive. The pile of them is.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Pile */}
        {show("the-pile") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 40px" }}>
            <div style={{ flex: 1.2 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>14 Active Subscriptions</div></Fade>
              <Fade show delay={400} duration={500}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {subscriptions.map((s, i) => (
                    <Fade key={i} show delay={500 + i * 120} duration={250} direction="none">
                      <div style={{ padding: "8px 12px", background: s.flag === "duplicate" ? "#f59e0b06" : s.flag === "seats" ? "#3b82f606" : s.flag === "dormant" ? "#ef444406" : "#12122a", border: `1px solid ${s.flag === "duplicate" ? "#f59e0b20" : s.flag === "seats" ? "#3b82f620" : s.flag === "dormant" ? "#ef444420" : "#1e1e3a"}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#4a5568" }}>{s.dept}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'JetBrains Mono'" }}>{s.cost}</div>
                          {s.flag === "duplicate" && <div style={{ fontSize: 10, color: "#f59e0b", fontFamily: "'JetBrains Mono'" }}>DUPLICATE</div>}
                          {s.flag === "seats" && <div style={{ fontSize: 10, color: "#3b82f6", fontFamily: "'JetBrains Mono'" }}>UNUSED SEATS</div>}
                          {s.flag === "dormant" && <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>NO LOGINS 90d</div>}
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 0.8, paddingLeft: 10 }}>
              <Fade show delay={1800} duration={700}><div style={{ fontSize: 36, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>14 subscriptions.<br/>7 department owners.</div></Fade>
              <Fade show delay={2400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Nobody has the full picture.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Math */}
        {show("the-math") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Waste Breakdown</div></Fade>
              {[
                { category: "Duplicate tools", detail: "3 pairs (Zoom/Meet, Asana/Monday, Slack/Teams)", amount: "€1,400/mo", color: "#f59e0b" },
                { category: "Unused seats", detail: "Jira: 32 of 100 used. Salesforce: 18 of 50 used.", amount: "€680/mo", color: "#3b82f6" },
                { category: "Dormant tools", detail: "DocuSign: last login 94 days ago", amount: "€320/mo", color: "#ef4444" },
              ].map((row, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400} direction="left" distance={12}>
                  <div style={{ padding: "14px 18px", background: `${row.color}06`, border: `1px solid ${row.color}18`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 16, color: row.color, fontWeight: 600 }}>{row.category}</span>
                      <span style={{ fontSize: 16, color: row.color, fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{row.amount}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>{row.detail}</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2200} duration={400}>
                <div style={{ padding: "12px 18px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 10, textAlign: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>Total waste: &euro;2,400/month = &euro;28,800/year</span>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1000} duration={700}><div style={{ fontSize: 36, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Every subscription was approved by someone.</div></Fade>
              <Fade show delay={1800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Nobody was responsible for all of them.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the waste</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>SUBSCRIPTION WASTE: &euro;2,400/month in unused or duplicate SaaS spending</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  14 subscriptions across 7 departments. 3 duplicate tool pairs, 68 unused seats across 2 tools, 1 tool with zero logins in 90 days. Annual waste: &euro;28,800.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "3", label: "Duplicate pairs", color: "#f59e0b" },
                  { value: "68", label: "Unused seats", color: "#3b82f6" },
                  { value: "90d", label: "Zero logins", color: "#ef4444" },
                  { value: "€28.8K", label: "Annual waste", color: "#ef4444" },
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

        {/* Scene 5: Action — With/Without */}
        {show("action") && (
          <div style={{ display: "flex", alignItems: "stretch", gap: 32, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ padding: "28px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Without Qorpera</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#475569", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Auto-renew.<br/>Repeat waste.</div>
                  <div style={{ fontSize: 19, color: "#64748b", lineHeight: 1.7 }}>Subscriptions auto-renew. Waste compounds. Duplicate tools add features nobody uses. Next year: &euro;31K+ in invisible spend.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>-&euro;31K+ next year</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ padding: "28px 24px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Consolidate. Reclaim.<br/><span style={{ color: "#f59e0b" }}>&euro;28,800 saved.</span></div>
                  {[
                    { text: "Consolidate 3 duplicate pairs", savings: "-€1,400/mo", color: "#f59e0b" },
                    { text: "Reclaim 68 unused seats", savings: "-€680/mo", color: "#3b82f6" },
                    { text: "Cancel dormant tool", savings: "-€320/mo", color: "#ef4444" },
                  ].map((item, i) => (
                    <Fade key={i} show delay={1000 + i * 300} duration={300}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 2 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize: 15, color: "#94a3b8" }}>{item.text}</span>
                        <span style={{ fontSize: 14, color: item.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{item.savings}</span>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2000} duration={400}>
                    <div style={{ marginTop: 16, padding: "10px 16px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 8, textAlign: "center" }}>
                      <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>+&euro;28,800 saved/year</span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Finance tracks budgets.<br/><span style={{ color: "#f59e0b" }}>Qorpera tracks what you&apos;re actually using.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every department approves their own tools. Nobody audits the overlap. Activity intelligence maps usage across every subscription, every seat, every login — and finds the waste hiding in plain sight.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#f59e0b,#d97706)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
