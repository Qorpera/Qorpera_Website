"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-sop", duration: 9625 },
  { id: "the-incident", duration: 10500 },
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

export default function ProcessDrift() {
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#f59e0b 1px,transparent 1px),linear-gradient(90deg,#f59e0b 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Operations</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Process Nobody Follows</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>The SOP says one thing. The team does another. Quality is fine — until it isn&apos;t. The workaround became the process, and nobody documented it.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Standard operating procedures are only standard<br/>if someone follows them.</div></Fade>
          </div>
        )}

        {/* Scene 2: The SOP */}
        {show("the-sop") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>SOP vs Reality</div></Fade>
              {[
                { sop: "Calibrate machine every 4 hours", reality: "Calibrated at shift start only", color: "#ef4444" },
                { sop: "Two-person inspection sign-off", reality: "One person, double-signs the form", color: "#f59e0b" },
                { sop: "Log every batch in system immediately", reality: "Logged end-of-day from memory", color: "#a855f7" },
              ].map((row, i) => (
                <Fade key={i} show delay={400 + i * 600} duration={500}>
                  <div style={{ padding: "14px 16px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <span style={{ padding: "2px 8px", background: "#22c55e10", border: "1px solid #22c55e25", borderRadius: 4, fontSize: 12, color: "#22c55e", fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>SOP</span>
                      <span style={{ fontSize: 16, color: "#94a3b8" }}>{row.sop}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ padding: "2px 8px", background: `${row.color}10`, border: `1px solid ${row.color}25`, borderRadius: 4, fontSize: 12, color: row.color, fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>REAL</span>
                      <span style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600 }}>{row.reality}</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The SOP is perfect.<br/><span style={{ color: "#f59e0b" }}>Nobody follows it.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Three deviations that &quot;save time.&quot; The workaround became the process months ago. Calibration happens once instead of three times. One person signs for two. Logs get backfilled from memory at the end of the day.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Incident */}
        {show("the-incident") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Timeline</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ padding: "20px 24px", background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14 }}>
                  {[
                    { period: "Months 1-6", event: "Drifted process, results appear fine", status: "No issues", color: "#22c55e" },
                    { period: "Month 7", event: "Batch #4418 fails QA — 1,200 units rejected", status: "Failure", color: "#ef4444" },
                    { period: "Investigation", event: "Machine was 6 hours past calibration", status: "Root cause", color: "#f59e0b" },
                    { period: "Finding", event: "Single inspector missed defect (should have been dual)", status: "Process gap", color: "#a855f7" },
                    { period: "Finding", event: "Batch log reconstructed from memory — inaccurate", status: "No audit trail", color: "#ef4444" },
                  ].map((row, i) => (
                    <Fade key={i} show delay={700 + i * 450} duration={400} direction="left" distance={12}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 4 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ minWidth: 90, fontSize: 13, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{row.period}</div>
                        <div style={{ flex: 1, fontSize: 15, color: "#cbd5e1", lineHeight: 1.4 }}>{row.event}</div>
                        <span style={{ padding: "2px 8px", background: `${row.color}10`, border: `1px solid ${row.color}25`, borderRadius: 4, fontSize: 12, color: row.color, fontFamily: "'JetBrains Mono'", whiteSpace: "nowrap" }}>{row.status}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The workaround worked —<br/><span style={{ color: "#ef4444" }}>until it didn&apos;t.</span></div></Fade>
              <Fade show delay={1400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 380 }}>Now there&apos;s a recall and no audit trail. The batch log was reconstructed from memory. The calibration was 6 hours overdue. The single inspector missed what two would have caught.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees the drift</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 700, margin: "0 auto 24px", padding: "20px 28px", background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>PROCESS DRIFT: 3 SOP deviations detected across production floor</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.8 }}>
                  Calibration frequency: 1x/shift vs required 3x/shift. Inspection: single-sign pattern (should be dual). Batch logging: end-of-day clusters (should be real-time). Risk: quality incident, audit failure.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={700}>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                {[
                  { value: "1x", label: "Calibration/shift", sub: "Should be 3x", color: "#ef4444" },
                  { value: "1", label: "Inspector signs", sub: "Should be 2", color: "#a855f7" },
                  { value: "EOD", label: "Batch logging", sub: "Should be real-time", color: "#f59e0b" },
                  { value: "3", label: "SOP deviations", sub: "Active drift", color: "#ef4444" },
                ].map((stat, i) => (
                  <Fade key={i} show delay={2400 + i * 300} duration={400}>
                    <div style={{ padding: "16px 24px", background: "#12122a", border: `1px solid ${stat.color}30`, borderRadius: 12, minWidth: 130, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "'Space Grotesk'", marginBottom: 2 }}>{stat.value}</div>
                      <div style={{ fontSize: 15, color: "#94a3b8", marginBottom: 2 }}>{stat.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{stat.sub}</div>
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
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Actions</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Close the gap between<br/><span style={{ color: "#f59e0b" }}>documented and actual.</span></div></Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 640, margin: "0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { n: "1", text: "Alert production manager to calibration gap — 1x/shift vs required 3x/shift", color: "#ef4444" },
                    { n: "2", text: "Flag dual-inspection non-compliance to quality lead — single-sign pattern detected", color: "#a855f7" },
                    { n: "3", text: "Recommend real-time logging enforcement — end-of-day clusters create audit risk", color: "#f59e0b" },
                    { n: "4", text: "Schedule SOP review with floor team — update the procedure or enforce it", color: "#22c55e" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>SOPs track what should happen.<br/><span style={{ color: "#f59e0b" }}>Qorpera tracks what actually does.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>The SOP was perfect on paper. The floor told a different story. Activity intelligence detects the gap between documented process and actual behaviour — before the workaround becomes an incident.</div></Fade>
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
