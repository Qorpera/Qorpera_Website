"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-inventory", duration: 9625 },
  { id: "the-why", duration: 10500 },
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

export default function LicenseWaste() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — IT</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Licenses<br/>Nobody Uses</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>200 software licenses at &euro;45/seat/month. 68 haven&apos;t been used in 90 days. That&apos;s &euro;36K/year in unused seats.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive software isn&apos;t the one you pay too much for.<br/>It&apos;s the one nobody opens.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Inventory */}
        {show("the-inventory") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>License Breakdown</div></Fade>
              <Fade show delay={500} duration={700}>
                <div style={{ padding: "24px 28px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  <Fade show delay={600} duration={400}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1e1e3a" }}>
                      <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Total licenses</span>
                      <span style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>200 seats &times; &euro;45/mo = &euro;108K/yr</span>
                    </div>
                  </Fade>
                  {[
                    { label: "Active (last 30 days)", value: "132 seats", color: "#22c55e", bar: 66 },
                    { label: "Inactive (30-90 days)", value: "26 seats", color: "#f59e0b", bar: 13 },
                    { label: "Dormant (90+ days)", value: "42 seats", color: "#ef4444", bar: 21 },
                    { label: "Never activated", value: "26 seats", color: "#ef4444", bar: 13 },
                  ].map((row, i) => (
                    <Fade key={i} show delay={900 + i * 350} duration={400}>
                      <div style={{ padding: "10px 0", borderBottom: i < 3 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{row.label}</span>
                          <span style={{ fontSize: 18, color: row.color, fontWeight: 500 }}>{row.value}</span>
                        </div>
                        <div style={{ height: 4, background: "#1a1a2e", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${row.bar}%`, background: row.color, borderRadius: 2, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>68 licenses gathering<br/><span style={{ color: "#f59e0b" }}>digital dust.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>&euro;36,720/year — paid monthly, noticed never. A third of your seats are generating invoices but not value.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Why */}
        {show("the-why") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Why They&apos;re Unused</div></Fade>
              {[
                { count: "18", reason: "Employees who left", detail: "Accounts not cleaned up during offboarding", color: "#ef4444" },
                { count: "14", reason: "Role changes", detail: "Moved to a team that doesn\u2019t need this tool", color: "#f59e0b" },
                { count: "10", reason: "Never activated", detail: "Onboarding bulk-provisioned, never logged in", color: "#64748b" },
                { count: "26", reason: "Project ended", detail: "Purchased \u201Cjust in case\u201D for a Q2 initiative", color: "#64748b" },
              ].map((item, i) => (
                <Fade key={i} show delay={400 + i * 600} duration={500}>
                  <div style={{ display: "flex", gap: 14, padding: "12px 16px", background: `${item.color}06`, border: `1px solid ${item.color}18`, borderRadius: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 36, height: 36, borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: item.color, fontFamily: "'JetBrains Mono'", flexShrink: 0 }}>{item.count}</div>
                    <div>
                      <div style={{ fontSize: 17, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>{item.reason}</div>
                      <div style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.4 }}>{item.detail}</div>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Every license had a reason<br/><span style={{ color: "#f59e0b" }}>— once.</span></div></Fade>
              <Fade show delay={2000} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Nobody checked if the reason still applies. People leave, roles shift, projects end — but the licenses keep billing.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the waste</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#6366f108", border: "1px solid #6366f120", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>LICENSE WASTE: 68 of 200 seats unused for 90+ days</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Annual waste: &euro;36,720. Breakdown: 18 departed employees (not deprovisioned), 14 role changes, 10 never activated, 26 project-ended. Next renewal: 45 days. Action window closing.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "68", label: "Unused seats", color: "#ef4444" },
                  { value: "\u20AC36K", label: "Annual waste", color: "#f59e0b" },
                  { value: "45d", label: "Until renewal", color: "#3b82f6" },
                  { value: "34%", label: "Utilization gap", color: "#ef4444" },
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
          <div style={{ display: "flex", alignItems: "stretch", gap: 32, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ padding: "28px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Without Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#475569", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Auto-renews at<br/>200 seats.</div>
                  <div style={{ fontSize: 21, color: "#64748b", lineHeight: 1.7 }}>&euro;108K/year continues. 68 unused seats keep billing. Nobody reviews until the next budget cycle — 9 months from now.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#ef4444", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>-&euro;36,720/year wasted</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ padding: "28px 24px", background: "#6366f108", border: "1px solid #6366f120", borderRadius: 14, height: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Reclaim 68 seats.<br/><span style={{ color: "#22c55e" }}>&euro;36K saved/year.</span></div>
                  <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Right-size to 132 seats before renewal. Negotiate a lower tier. Set up quarterly usage reviews to catch drift early.</div>
                  <div style={{ marginTop: 20, padding: "10px 16px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 8, textAlign: "center" }}>
                    <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>+&euro;36,720 saved/year</span>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>License management tracks seats.<br/><span style={{ color: "#6366f1" }}>Qorpera tracks usage.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>Every company has software seats that nobody opens. Activity intelligence matches licenses to actual usage — so you stop paying for digital shelf space before renewal locks you in for another year.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#6366f1,#4f46e5)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
