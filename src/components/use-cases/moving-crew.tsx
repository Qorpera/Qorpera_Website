"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "claim-1", duration: 9625 },
  { id: "claim-2-3", duration: 10500 },
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

export default function MovingCrew() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setPlaying(false);
  }, []);

  const start = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setElapsed(fromElapsed);
    setPlaying(true);
    startRef.current = Date.now() - fromElapsed;
  }, []);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const now = Date.now() - startRef.current;
    setElapsed(now);
    if (now < TOTAL) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stop();
      restartTimerRef.current = setTimeout(() => {
        start();
      }, 3000);
    }
  }, [stop, start]);

  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    start(target);
  }, [start]);

  useEffect(() => {
    start();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (playing && startRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { if (elapsed < acc + SCENES[i].duration) { currentScene = SCENES[i].id; currentSceneIndex = i; break; } acc += SCENES[i].duration; }
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{
      width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;500;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.5); } }
        @keyframes scanDown { 0% { top:-2px; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { top:100%; opacity:0; } }
      `}</style>

      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "linear-gradient(#ef4444 1px, transparent 1px), linear-gradient(90deg, #ef4444 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {/* title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Moving &amp; Logistics</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", letterSpacing: -1, marginBottom: 20, lineHeight: 1.15 }}>The Crew That Keeps<br />Getting Complaints</div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ fontSize: 21, color: "#94a3b8", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
                Three damage claims in two months. Different customers, different addresses. Same crew. Nobody connected the dots.
              </div>
            </Fade>
            <Fade show delay={2000} duration={800}>
              <div style={{ fontSize: 21, color: "#cbd5e1", maxWidth: 520, margin: "20px auto 0", lineHeight: 1.7, fontStyle: "italic" }}>
                When complaints are handled one at a time, patterns hide in plain sight.
              </div>
            </Fade>
          </div>
        )}

        {/* claim-1 */}
        {show("claim-1") && (
          <div style={{ display: "flex", alignItems: "center", gap: 44, width: "100%", padding: "0 40px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>Claim #1</div>
              </Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 24 }}>
                  <div style={{ fontSize: 15, color: "#475569", fontFamily: "'JetBrains Mono'", marginBottom: 14 }}>DAMAGE CLAIM — FILED VIA EMAIL</div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 15, color: "#64748b" }}>Customer:</span>
                    <span style={{ fontSize: 18, color: "#f1f5f9", marginLeft: 8 }}>The Johnsons</span>
                    <span style={{ fontSize: 15, color: "#475569", marginLeft: 12 }}>March 3</span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 15, color: "#64748b" }}>Item:</span>
                    <span style={{ fontSize: 18, color: "#ef4444", marginLeft: 8 }}>Antique dresser — deep scratch on top surface</span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 15, color: "#64748b" }}>Crew:</span>
                    <span style={{ fontSize: 18, color: "#cbd5e1", marginLeft: 8 }}>Team B (Marcus, Dave, Tyler)</span>
                  </div>
                  <div style={{ borderTop: "1px solid #1e1e3a", paddingTop: 10, marginTop: 10 }}>
                    <span style={{ fontSize: 15, color: "#64748b" }}>Resolution:</span>
                    <span style={{ fontSize: 18, color: "#f59e0b", marginLeft: 8 }}>&euro;350 compensation, case closed.</span>
                  </div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={600}>
                <div style={{ background: "#12122a", border: "1px solid #1e1e3a", borderRadius: 14, padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 21 }}>📧</span>
                    <span style={{ fontSize: 15, color: "#475569", fontFamily: "'JetBrains Mono'" }}>Email from Mrs. Johnson</span>
                  </div>
                  <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.6, fontStyle: "italic", padding: "14px 18px", background: "#0a0a1a", borderRadius: 10, borderLeft: "3px solid #ef4444" }}>
                    &ldquo;The movers were rushing and didn&apos;t wrap the furniture properly. Very disappointed.&rdquo;
                  </div>
                </div>
              </Fade>
              <Fade show delay={1400} duration={600}>
                <div style={{ marginTop: 16, textAlign: "center", fontSize: 18, color: "#64748b", lineHeight: 1.5 }}>
                  One claim. Handled. Closed. <span style={{ color: "#475569" }}>Forgotten.</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* claim-2-3 */}
        {show("claim-2-3") && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 44, width: "100%", padding: "0 40px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono'" }}>Claims #2 &amp; #3</div>
              </Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 22, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 21 }}>📋</span>
                    <span style={{ fontSize: 15, color: "#475569", fontFamily: "'JetBrains Mono'" }}>INSURANCE FORM — CLAIM #2</span>
                  </div>
                  <div style={{ fontSize: 18, color: "#f1f5f9", marginBottom: 6 }}>The Petersons — March 19</div>
                  <div style={{ fontSize: 18, color: "#ef4444", marginBottom: 6 }}>Hardwood floor scratched during fridge move</div>
                  <div style={{ fontSize: 15, color: "#94a3b8" }}>Crew: Team B &nbsp;·&nbsp; &euro;500 compensation</div>
                </div>
              </Fade>
              <Fade show delay={1100} duration={500}>
                <div style={{ background: "#0f0f24", border: "1px solid #1e1e3a", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 21 }}>⭐</span>
                    <span style={{ fontSize: 15, color: "#475569", fontFamily: "'JetBrains Mono'" }}>GOOGLE REVIEW — CLAIM #3</span>
                  </div>
                  <div style={{ fontSize: 18, color: "#f1f5f9", marginBottom: 6 }}>Martinez family — April 1</div>
                  <div style={{ fontSize: 18, color: "#f59e0b", marginBottom: 6 }}>★★☆☆☆ &ldquo;Careless movers. Sofa leg snapped. Would not recommend.&rdquo;</div>
                  <div style={{ fontSize: 15, color: "#94a3b8" }}>Crew: Team B</div>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={1800} duration={800}>
                <div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>Three claims. Three channels. <span style={{ color: "#ef4444" }}>Same crew.</span></div>
              </Fade>
              <Fade show delay={2600} duration={800}>
                <div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>
                  Each complaint went to a different person — dispatch, insurance, customer service. Nobody saw all three together.
                </div>
              </Fade>
              <Fade show delay={3400} duration={500}>
                <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                  {[
                    { label: "Email", color: "#3b82f6" },
                    { label: "Insurance form", color: "#f59e0b" },
                    { label: "Public review", color: "#ef4444" },
                  ].map((ch, i) => (
                    <div key={i} style={{ padding: "6px 14px", background: `${ch.color}12`, border: `1px solid ${ch.color}30`, borderRadius: 8 }}>
                      <span style={{ fontSize: 15, color: ch.color }}>{ch.label}</span>
                    </div>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Pattern Detected</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.2 }}>
                Qorpera <span style={{ color: "#ef4444" }}>sees the pattern</span>
              </div>
            </Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth: 680, margin: "0 auto", background: "#1a1a2e", border: "1px solid #ef444430", borderRadius: 16, padding: 28, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: 15, color: "#ef4444", fontFamily: "'JetBrains Mono'", fontWeight: 600 }}>CREW QUALITY ALERT: Team B — 3 damage claims in 8 weeks (company avg: 0.4)</span>
                </div>
                <Fade show delay={1800} duration={400}>
                  <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 16, padding: "14px 18px", background: "#0a0a1a", borderRadius: 10, borderLeft: "3px solid #ef4444" }}>
                    Damage claims linked to Team B: March 3 (furniture), March 19 (flooring), April 1 (furniture). Rate is 7.5x company average. Common factor: insufficient wrapping noted in 2 of 3 complaints. 6 upcoming jobs assigned to Team B this week.
                  </div>
                </Fade>
                <Fade show delay={2600} duration={500}>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { value: "3", label: "claims in 8 weeks", color: "#ef4444" },
                      { value: "7.5x", label: "above average", color: "#ef4444" },
                      { value: "\u20AC850+", label: "compensation paid", color: "#f59e0b" },
                      { value: "6", label: "upcoming jobs at risk", color: "#ef4444" },
                    ].map((s, i) => (
                      <Fade key={i} show delay={2900 + i * 250} duration={400}>
                        <div style={{ background: "#12122a", border: `1px solid ${s.color}30`, borderRadius: 12, padding: "16px 22px", minWidth: 120, textAlign: "center" }}>
                          <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk'" }}>{s.value}</div>
                          <div style={{ fontSize: 15, color: "#64748b", marginTop: 4 }}>{s.label}</div>
                        </div>
                      </Fade>
                    ))}
                  </div>
                </Fade>
              </div>
            </Fade>
          </div>
        )}

        {/* action */}
        {show("action") && (
          <div style={{ display: "flex", alignItems: "stretch", gap: 28, width: "100%", padding: "0 40px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ background: "#0f0f24", border: "1px solid #ef444430", borderRadius: 14, padding: 28, height: "100%" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, color: "#ef4444", textTransform: "uppercase", marginBottom: 14, fontFamily: "'JetBrains Mono'" }}>Without Qorpera</div>
                  <div style={{ fontSize: 21, color: "#cbd5e1", lineHeight: 1.7 }}>
                    Each claim is processed in isolation. Team B keeps working. By summer, you&apos;ve paid <span style={{ color: "#ef4444", fontWeight: 700 }}>&euro;3,000+</span> in claims, lost <span style={{ color: "#ef4444", fontWeight: 700 }}>2 Google review stars</span>, and still don&apos;t know why.
                  </div>
                  <Fade show delay={800} duration={400}>
                    <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {[
                        { text: "\u20AC3,000+ in claims", color: "#ef4444" },
                        { text: "Reputation damage", color: "#ef4444" },
                        { text: "Pattern invisible", color: "#64748b" },
                      ].map((t, i) => (
                        <div key={i} style={{ padding: "6px 14px", background: `${t.color}12`, border: `1px solid ${t.color}30`, borderRadius: 8 }}>
                          <span style={{ fontSize: 15, color: t.color }}>{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={600}>
                <div style={{ background: "#0f0f24", border: "1px solid #22c55e30", borderRadius: 14, padding: 28, height: "100%" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 2, color: "#22c55e", textTransform: "uppercase", marginBottom: 14, fontFamily: "'JetBrains Mono'" }}>With Qorpera</div>
                  <div style={{ fontSize: 21, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 16 }}>
                    Dispatch manager gets the pattern. Team B gets retraining on wrapping and handling. Upcoming jobs reassigned or supervised. Claims drop to zero. Reviews recover.
                  </div>
                  <Fade show delay={1200} duration={400}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { n: "1", text: "Pattern surfaced to dispatch manager", delay: 1400 },
                        { n: "2", text: "Team B retrained on wrapping & handling", delay: 1800 },
                        { n: "3", text: "6 upcoming jobs reassigned or supervised", delay: 2200 },
                        { n: "4", text: "Claims drop to zero. Reviews recover.", delay: 2600 },
                      ].map((s, i) => (
                        <Fade key={i} show delay={s.delay} duration={400} direction="left" distance={15}>
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#22c55e15", border: "1px solid #22c55e30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#22c55e", flexShrink: 0 }}>{s.n}</div>
                            <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.5 }}>{s.text}</div>
                          </div>
                        </Fade>
                      ))}
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* close */}
        {show("close") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={800}>
              <div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.2 }}>
                Dispatch systems track jobs.<br /><span style={{ color: "#ef4444" }}>Qorpera tracks quality.</span>
              </div>
            </Fade>
            <Fade show delay={1000} duration={800}>
              <div style={{ fontSize: 21, color: "#94a3b8", maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
                In a moving company, damage claims come through emails, phone calls, insurance forms, and online reviews. When they&apos;re handled separately, the crew that needs help never gets it.
              </div>
            </Fade>
            <Fade show delay={2200} duration={600}>
              <a href="/contact" style={{ display: "inline-block", padding: "18px 50px", borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 19, fontWeight: 600, textDecoration: "none", marginTop: 32 }}>Get Qorpera &rarr;</a>
            </Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (
          <button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            &larr; Back
          </button>
        )}
        {currentSceneIndex === SCENES.length - 1 ? (
          <a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
            Get Qorpera &rarr;
          </a>
        ) : (
          <button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Next &rarr;
          </button>
        )}
      </div>

      {playing && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg, #ef4444, #dc2626)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>}

      {playing && <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} &bull; {Math.ceil((TOTAL - elapsed) / 1000)}s</div>}
    </div>
  );
}
