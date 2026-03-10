"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-departure", duration: 9625 },
  { id: "the-silos", duration: 10500 },
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

export default function IpExposure() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#ef4444 1px,transparent 1px),linear-gradient(90deg,#ef4444 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Legal</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The IP That<br/>Walked Out</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>Departing employee downloads 4,000 files in their last week. Product roadmaps, pricing strategies, client lists. IT sees the spike. HR doesn&apos;t know. Legal doesn&apos;t know.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Most IP theft doesn&apos;t involve hackers.<br/>It involves the exit door.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Departure */}
        {show("the-departure") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Employee Profile</div></Fade>
              <Fade show delay={400} duration={500}>
                <div style={{ padding: "18px 22px", background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, color: "#e2e8f0", fontWeight: 600 }}>Jan Eriksson</div>
                      <div style={{ fontSize: 15, color: "#64748b" }}>Senior Product Manager</div>
                    </div>
                    <div style={{ padding: "4px 10px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 6, fontSize: 14, color: "#ef4444" }}>Departing Friday</div>
                  </div>
                  <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>Notice given: 2 weeks ago</div>
                </div>
              </Fade>
              <Fade show delay={800} duration={500}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 10, fontFamily: "'JetBrains Mono'" }}>Download Activity (Last 7 Days)</div></Fade>
              <Fade show delay={1000} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 16 }}>
                  {[
                    { label: "Files downloaded", value: "4,000", normal: "Normal: 50/week", color: "#ef4444" },
                    { label: "Product roadmap 2026-2027", value: "Downloaded", normal: "", color: "#f59e0b" },
                    { label: "Competitive analysis deck", value: "Downloaded", normal: "", color: "#f59e0b" },
                    { label: "Client pricing matrix", value: "Downloaded", normal: "", color: "#f59e0b" },
                    { label: "Customer list (2,400 accounts)", value: "Downloaded", normal: "", color: "#ef4444" },
                    { label: "Patent application drafts (3)", value: "Downloaded", normal: "", color: "#ef4444" },
                    { label: "USB device connected", value: "Tue, Wed", normal: "", color: "#ef4444" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={1200 + i * 250} duration={300} direction="left" distance={10}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 6 ? "1px solid #1a1a2e" : "none" }}>
                        <span style={{ fontSize: 14, color: "#94a3b8" }}>{row.label}</span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 14, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>{row.value}</span>
                          {row.normal && <div style={{ fontSize: 12, color: "#4a5568" }}>{row.normal}</div>}
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1400} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Normal weekly downloads: 50.<br/><span style={{ color: "#ef4444" }}>Last week: 4,000.</span></div></Fade>
              <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Including your roadmap, pricing, and client list. USB device connected twice. Destination: unknown.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Silos */}
        {show("the-silos") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The Disconnection</div></Fade>
              {[
                { dept: "HR", knows: "Knows about departure", detail: "Processed exit paperwork", icon: "1", color: "#22c55e" },
                { dept: "IT", knows: "Sees download spike in logs", detail: "Flagged as anomaly — no action taken", icon: "2", color: "#f59e0b" },
                { dept: "Legal", knows: "Doesn&apos;t know about either", detail: "No visibility into HR or IT signals", icon: "3", color: "#ef4444" },
                { dept: "Manager", knows: "Knows about departure", detail: "Doesn&apos;t see IT logs", icon: "4", color: "#3b82f6" },
              ].map((row, i) => (
                <Fade key={i} show delay={400 + i * 500} duration={500}>
                  <div style={{ display: "flex", gap: 12, padding: "12px 16px", background: `${row.color}06`, border: `1px solid ${row.color}18`, borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${row.color}15`, border: `1px solid ${row.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: row.color, flexShrink: 0 }}>{row.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600 }}>{row.dept}</div>
                      <div style={{ fontSize: 15, color: row.color, marginTop: 2 }}>{row.knows}</div>
                      <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{row.detail}</div>
                    </div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2800} duration={400}>
                <div style={{ marginTop: 8, padding: "8px 14px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "blink 2s infinite" }} />
                    <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>Nobody connected: departure + download spike + competitive files + USB</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1, paddingLeft: 20 }}>
              <Fade show delay={1200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Four departments.<br/>Four puzzle pieces.<br/><span style={{ color: "#ef4444" }}>Zero connections.</span></div></Fade>
              <Fade show delay={2200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The complete picture: someone is taking your IP to a competitor. But each department only sees their own piece.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera connects the signals</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto 24px", padding: "20px 28px", background: "#ef444408", border: "1px solid #ef444420", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>IP RISK: Departing employee — download volume 80x normal in final week</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Jan Eriksson — 4,000 files including: product roadmap, competitive analysis, client list (2,400 accounts), 3 patent drafts. USB device connected 2 days. Destination: unknown. NDA status: signed but expires in 12 months.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "4,000", label: "Files downloaded", color: "#ef4444" },
                  { value: "80x", label: "Above normal", color: "#f59e0b" },
                  { value: "2,400", label: "Client accounts", color: "#ef4444" },
                  { value: "12mo", label: "NDA remaining", color: "#3b82f6" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'" }}>{stat.value}</div>
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Actions</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Before the IP<br/><span style={{ color: "#ef4444" }}>leaves the building</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Alert legal immediately — IP exposure in progress", color: "#ef4444" },
                    { n: "2", text: "Restrict file access and disable USB ports", color: "#f59e0b" },
                    { n: "3", text: "Conduct exit interview with legal present", color: "#3b82f6" },
                    { n: "4", text: "Preserve download logs for potential enforcement", color: "#a855f7" },
                    { n: "5", text: "Review NDA terms and enforceability", color: "#22c55e" },
                  ].map((a, i) => (
                    <Fade key={i} show delay={1400 + i * 350} duration={350} direction="left" distance={15}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, textAlign: "left" }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: a.color, flexShrink: 0 }}>{a.n}</div>
                        <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.4 }}>{a.text}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </Fade>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>HR tracks departures.<br/>IT tracks downloads.<br/><span style={{ color: "#ef4444" }}>Qorpera connects the two.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>IP risk doesn&apos;t announce itself. It hides in the gap between systems that don&apos;t talk to each other. Activity intelligence connects departure signals with data movement before it&apos;s too late.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#ef4444,#dc2626)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
