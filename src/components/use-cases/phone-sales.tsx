"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-numbers", duration: 9625 },
  { id: "the-outlier", duration: 10500 },
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

export default function PhoneSales() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    setElapsed(fromElapsed);
    setPlaying(true);
    startRef.current = Date.now() - fromElapsed;
    rafRef.current = requestAnimationFrame(function tick() {
      if (!startRef.current) return;
      const now = Date.now() - startRef.current;
      setElapsed(now);
      if (now < TOTAL) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        startRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    startAnimation();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [startAnimation]);

  useEffect(() => {
    if (!playing && elapsed >= TOTAL) {
      restartTimerRef.current = setTimeout(() => {
        startAnimation();
      }, 3000);
      return () => {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      };
    }
  }, [playing, elapsed, startAnimation]);

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
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* Scene 1: Title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Telephone Sales</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Script That<br/>Stopped Converting</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>Your team is making 200 calls a day. Conversion dropped from 12% to 4%. Everyone is following the script. That&apos;s the problem.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>When activity is high but results are low, the issue isn&apos;t effort — it&apos;s approach.</div></Fade>
          </div>
        )}

        {/* Scene 2: The Numbers */}
        {show("the-numbers") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1.2 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Team performance — last 4 weeks</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 16 }}>Weekly conversion rate</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
                    {[
                      { week: "W1", rate: 12, color: "#22c55e" },
                      { week: "W2", rate: 9, color: "#f59e0b" },
                      { week: "W3", rate: 6, color: "#f59e0b" },
                      { week: "W4", rate: 4, color: "#ef4444" },
                    ].map((w, i) => (
                      <Fade key={i} show delay={800 + i * 400} duration={500} direction="up" distance={20}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                          <div style={{ fontSize: 21, fontWeight: 700, color: w.color, fontFamily: "'Space Grotesk'" }}>{w.rate}%</div>
                          <div style={{ width: "100%", height: Math.max(w.rate * 12, 8), borderRadius: 6, background: `${w.color}40`, border: `1px solid ${w.color}60`, minWidth: 60 }} />
                          <div style={{ fontSize: 15, color: "#475569", fontFamily: "'JetBrains Mono'" }}>{w.week}</div>
                        </div>
                      </Fade>
                    ))}
                  </div>
                  <Fade show delay={2600} duration={400}>
                    <div style={{ borderTop: "1px solid #1e1e3a", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Call volume: ~200/day</div>
                      <div style={{ padding: "4px 12px", background: "#22c55e18", border: "1px solid #22c55e30", borderRadius: 6, fontSize: 15, color: "#22c55e" }}>Steady</div>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={1800} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Activity looks healthy.<br/><span style={{ color: "#ef4444" }}>Results don&apos;t.</span></div></Fade>
              <Fade show delay={2800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 360 }}>Management sees the call volume and thinks everything is fine. The conversion rate tells a different story — and nobody&apos;s asking why.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 3: The Outlier */}
        {show("the-outlier") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1.2 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Individual rep performance</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  {[
                    { name: "Mike", calls: 48, conv: 3, highlight: false },
                    { name: "Rachel", calls: 52, conv: 4, highlight: false },
                    { name: "Sarah", calls: 44, conv: 14, highlight: true },
                    { name: "Tom", calls: 50, conv: 3, highlight: false },
                  ].map((rep, i) => (
                    <Fade key={i} show delay={700 + i * 400} duration={400}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", marginBottom: i < 3 ? 6 : 0, borderRadius: 10,
                        background: rep.highlight ? "#22c55e08" : "transparent",
                        border: rep.highlight ? "1px solid #22c55e30" : "1px solid transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: rep.highlight ? "#22c55e20" : "#1e1e3a",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 600,
                            color: rep.highlight ? "#22c55e" : "#475569",
                          }}>{rep.name[0]}</div>
                          <div style={{ fontSize: 21, fontWeight: rep.highlight ? 600 : 400, color: rep.highlight ? "#22c55e" : "#e2e8f0" }}>{rep.name}</div>
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, color: "#94a3b8", fontFamily: "'JetBrains Mono'" }}>{rep.calls}</div>
                            <div style={{ fontSize: 13, color: "#475569" }}>calls/day</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18, fontWeight: 600, color: rep.highlight ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono'" }}>{rep.conv}%</div>
                            <div style={{ fontSize: 13, color: "#475569" }}>conversion</div>
                          </div>
                        </div>
                        {rep.highlight && (
                          <div style={{ fontSize: 15, color: "#22c55e", fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>&larr;</div>
                        )}
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={2400} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>One rep broke from the script.<br/><span style={{ color: "#22c55e" }}>Her numbers went up.</span></div></Fade>
              <Fade show delay={3400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 360 }}>Sarah stopped leading with the product pitch. She starts by asking about the customer&apos;s current setup. Her conversations are 2 minutes longer — and 3.5x more likely to convert.</div></Fade>
            </div>
          </div>
        )}

        {/* Scene 4: Detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera sees what&apos;s working</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 28px", background: "#3b82f608", border: "1px solid #3b82f620", borderRadius: 14, textAlign: "left", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>SALES INSIGHT: Top performer deviating from script — 3.5x higher conversion</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Sarah Chen&apos;s call pattern changed 3 weeks ago. She leads with discovery questions instead of product features. Average call: 4.5 min (team avg: 2.5 min). Conversion: 14% (team avg: 4%). Approach correlates with 3.5x higher close rate. Rest of team following original script — conversion declining.
                </div>
              </div>
            </Fade>
            <Fade show delay={2200} duration={600}>
              <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 20 }}>
                {[
                  { value: "14%", label: "Sarah&apos;s rate", color: "#22c55e" },
                  { value: "4%", label: "Team average", color: "#ef4444" },
                  { value: "3.5x", label: "Conversion difference", color: "#3b82f6" },
                  { value: "3 weeks", label: "Since approach change", color: "#f59e0b" },
                ].map((s, i) => (
                  <Fade key={i} show delay={2600 + i * 300} duration={400}>
                    <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 12, padding: "16px 22px", minWidth: 120, textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk'", marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: s.value }} />
                      <div style={{ fontSize: 15, color: "#64748b" }} dangerouslySetInnerHTML={{ __html: s.label }} />
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
            <Fade show delay={4200} duration={400}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>A dialer counts calls. Qorpera identifies what makes them work.</div></Fade>
          </div>
        )}

        {/* Scene 5: Action — Without vs With */}
        {show("action") && (
          <div style={{ display: "flex", alignItems: "stretch", gap: 24, width: "100%", padding: "0 40px" }}>
            <Fade show delay={200} duration={600} style={{ flex: 1, display: "flex" }}>
              <div style={{ flex: 1, background: "#1a1a2e", border: "1px solid #ef444430", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Without Qorpera</div>
                <div style={{ fontSize: 21, color: "#cbd5e1", lineHeight: 1.8, flex: 1 }}>
                  Manager tells the team to &quot;make more calls.&quot; Script stays the same. Conversion keeps dropping. Top talent (Sarah) gets frustrated that nobody notices what she figured out. She leaves.
                </div>
                <Fade show delay={1200} duration={400}>
                  <div style={{ borderTop: "1px solid #1e1e3a", paddingTop: 14, marginTop: 16 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      {[
                        { label: "Conversion", value: "3%", color: "#ef4444" },
                        { label: "Top talent", value: "Lost", color: "#ef4444" },
                        { label: "Morale", value: "Low", color: "#f59e0b" },
                      ].map((m, i) => (
                        <div key={i} style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 21, fontWeight: 700, color: m.color, fontFamily: "'Space Grotesk'" }}>{m.value}</div>
                          <div style={{ fontSize: 13, color: "#475569" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              </div>
            </Fade>
            <Fade show delay={600} duration={600} style={{ flex: 1, display: "flex" }}>
              <div style={{ flex: 1, background: "#0f1a2e", border: "1px solid #22c55e30", borderRadius: 14, padding: 28, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                <div style={{ fontSize: 21, color: "#cbd5e1", lineHeight: 1.8, flex: 1 }}>
                  Manager sees the pattern. Sarah&apos;s approach becomes the new playbook. Team conversion recovers to 11% within 2 weeks. Sarah gets recognized. Best practices spread organically.
                </div>
                <Fade show delay={1600} duration={400}>
                  <div style={{ borderTop: "1px solid #1e1e3a", paddingTop: 14, marginTop: 16 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      {[
                        { label: "Conversion", value: "11%", color: "#22c55e" },
                        { label: "Top talent", value: "Recognized", color: "#22c55e" },
                        { label: "Morale", value: "High", color: "#22c55e" },
                      ].map((m, i) => (
                        <div key={i} style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 21, fontWeight: 700, color: m.color, fontFamily: "'Space Grotesk'" }}>{m.value}</div>
                          <div style={{ fontSize: 13, color: "#475569" }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              </div>
            </Fade>
          </div>
        )}

        {/* Scene 6: Close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Dialers track call volume.<br/><span style={{ color: "#3b82f6" }}>Qorpera tracks what works.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 21, color: "#94a3b8", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>In telephone sales, the difference between a 4% and a 14% conversion rate is rarely about effort. It&apos;s about approach. Activity intelligence surfaces what your best people figured out — before the rest of the team falls further behind.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>

      {playing && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg, #3b82f6, #2563eb)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>}
      {playing && <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} &bull; {Math.ceil((TOTAL - elapsed) / 1000)}s</div>}
    </div>
  );
}
