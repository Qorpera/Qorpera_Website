"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-promise", duration: 9625 },
  { id: "the-gap", duration: 10500 },
  { id: "detection", duration: 10500 },
  { id: "impact", duration: 9625 },
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
  const d = { up: [0, distance], down: [0, -distance], left: [distance, 0], right: [-distance, 0], none: [0, 0] }[direction] || [0, 0];
  return <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translate(0,0)" : `translate(${d[0]}px,${d[1]}px)`, transition: `opacity ${duration * .5}ms cubic-bezier(.22,1,.36,1), transform ${duration * .5}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

interface TrackRowProps {
  label: string;
  status: "yes" | "no";
  show: boolean;
  delay: number;
}

const TrackRow = ({ label, status, show, delay }: TrackRowProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: status === "yes" ? "#22c55e06" : "#ef444406", border: `1px solid ${status === "yes" ? "#22c55e" : "#ef4444"}12`, borderRadius: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 21, color: status === "yes" ? "#22c55e" : "#ef4444" }}>{status === "yes" ? "✓" : "✗"}</span>
      <span style={{ fontSize: 18, color: "#cbd5e1" }}>{label}</span>
    </div>
  </Fade>
);

interface TimelineStepProps {
  week: string;
  text: string;
  color: string;
  icon: string;
  show: boolean;
  delay: number;
}

const TimelineStep = ({ week, text, color, icon, show, delay }: TimelineStepProps) => (
  <Fade show={show} delay={delay} duration={400} direction="left" distance={15}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14, position: "relative" }}>
      <div style={{ position: "absolute", left: -17, top: 5, width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid #0a0a1a" }} />
      <div>
        <div style={{ fontSize: 14, color: "#475569", fontFamily: "'JetBrains Mono'", marginBottom: 2 }}>{week}</div>
        <div style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.4 }}>{icon} {text}</div>
      </div>
    </div>
  </Fade>
);

export default function BrokenPromise() {
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

        {/* title */}
        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Client Relations</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Promise That<br/>Slipped Through</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>In a client call, your team promised free installation.<br/>It went in the email. It never made it into the contract<br/>or the project plan.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Promises live in conversations. Deliverables live in systems.<br/>The gap between them is where trust breaks.</div></Fade>
          </div>
        )}

        {/* the-promise */}
        {show("the-promise") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#f59e0b", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>The commitment</div></Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #f59e0b25", borderRadius: 14, padding: 24, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 17, color: "#f59e0b", fontWeight: 600 }}>From: James → Henderson &amp; Co.</span>
                    <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>March 5</span>
                  </div>
                  <div style={{ fontSize: 20, color: "#e2e8f0", lineHeight: 1.7 }}>
                    &ldquo;As discussed, we&apos;ll include complimentary installation at all 3 locations as part of the package. Timeline: 2 weeks after delivery.&rdquo;
                  </div>
                </div>
              </Fade>
              <Fade show delay={1400} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 8, lineHeight: 1.3 }}>Committed in conversation.<br/><span style={{ color: "#ef4444" }}>Missing from every system.</span></div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 12 }}>Where this commitment exists</div></Fade>
              <TrackRow label="Email" status="yes" show delay={700} />
              <TrackRow label="Meeting notes" status="yes" show delay={1000} />
              <TrackRow label="Project scope" status="no" show delay={1300} />
              <TrackRow label="Invoice" status="no" show delay={1600} />
              <TrackRow label="Delivery schedule" status="no" show delay={1900} />
              <Fade show delay={2400} duration={400}>
                <div style={{ padding: "8px 12px", background: "#ef444408", border: "1px solid #ef444415", borderRadius: 8, textAlign: "center", marginTop: 10 }}>
                  <span style={{ fontSize: 17, color: "#ef4444" }}>2 of 5 systems aware — commitment will be forgotten</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* the-gap */}
        {show("the-gap") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>What happens next</div></Fade>
              <Fade show delay={500} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The client remembered.<br/><span style={{ color: "#f59e0b" }}>Your systems didn&apos;t.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 360 }}>Delivery goes out on schedule. Everything looks fine internally. But the client is waiting for something your project team doesn&apos;t know about.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 2, background: "#1e1e3a", borderRadius: 1 }} />
                <TimelineStep week="Week 1" text="Delivery completed on schedule" color="#22c55e" icon="✓" show delay={400} />
                <TimelineStep week="Week 2" text="Client emails: &quot;When is the installation team arriving?&quot;" color="#f59e0b" icon="📧" show delay={1200} />
                <TimelineStep week="Week 2" text="Internal confusion — &quot;Was installation included?&quot;" color="#f59e0b" icon="❓" show delay={2000} />
                <TimelineStep week="Week 3" text="Client: &quot;We were promised this. Check the email from March 5th.&quot;" color="#ef4444" icon="🔥" show delay={2800} />
              </div>
              <Fade show delay={3800} duration={400}>
                <div style={{ padding: "10px 14px", background: "#ef444408", border: "1px solid #ef444418", borderRadius: 10, textAlign: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 17, color: "#ef4444", fontWeight: 500 }}>Trust eroding. The scramble begins.</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera connects the commitment to the gap</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 660, margin: "0 auto", padding: "20px 28px", background: "#f59e0b10", border: "1px solid #f59e0b25", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#f59e0b" }}>COMMITMENT GAP: Client promised free installation — not in project scope or delivery schedule</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Email from James on March 5 committed to complimentary installation at 3 locations. This commitment is not reflected in: project scope, delivery schedule, or invoicing. Client delivery completed — installation not scheduled. Gap identified 2 weeks before client follow-up.
                </div>
              </div>
            </Fade>
            <Fade show delay={2400} duration={600}>
              <div style={{ maxWidth: 560, margin: "0 auto" }}>
                <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>Proposed actions</div>
                {[
                  { n: "1", text: "Alert project manager about the unfulfilled commitment" },
                  { n: "2", text: "Schedule installation crew for all 3 locations" },
                  { n: "3", text: "Update project scope and delivery schedule" },
                ].map((s, i) => (
                  <Fade key={i} show delay={2800 + i * 400} duration={400}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 5 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 5, background: "#f59e0b18", border: "1px solid #f59e0b30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#f59e0b", fontWeight: 700 }}>{s.n}</div>
                      <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.text}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {/* impact */}
        {show("impact") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>The difference</div></Fade>
            <Fade show delay={500} duration={700}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 32, lineHeight: 1.3 }}>Two outcomes. <span style={{ color: "#f59e0b" }}>One promise.</span></div></Fade>
            <div style={{ display: "flex", gap: 28, justifyContent: "center", maxWidth: 800, margin: "0 auto" }}>
              <Fade show delay={900} duration={600} style={{ flex: 1 }}>
                <div style={{ background: "#1a1a2e", border: "1px solid #ef444425", borderRadius: 14, padding: 28, textAlign: "left", height: "100%" }}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: "#ef4444", marginBottom: 16, fontFamily: "'Space Grotesk'" }}>Without Qorpera</div>
                  {[
                    "Client calls angry",
                    "Emergency scramble to schedule installation",
                    "Trust damaged",
                    "Discount requested on next contract",
                    "Account at risk",
                  ].map((item, i) => (
                    <Fade key={i} show delay={1200 + i * 300} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 15, color: "#ef4444" }}>✗</span>
                        <span style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.5 }}>{item}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
              <Fade show delay={1100} duration={600} style={{ flex: 1 }}>
                <div style={{ background: "#1a1a2e", border: "1px solid #22c55e25", borderRadius: 14, padding: 28, textAlign: "left", height: "100%" }}>
                  <div style={{ fontSize: 21, fontWeight: 700, color: "#22c55e", marginBottom: 16, fontFamily: "'Space Grotesk'" }}>With Qorpera</div>
                  {[
                    "Installation is scheduled before the client asks",
                    "Promise kept",
                    "Trust reinforced",
                    "Account grows",
                  ].map((item, i) => (
                    <Fade key={i} show delay={1400 + i * 300} duration={300}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 15, color: "#22c55e" }}>✓</span>
                        <span style={{ fontSize: 18, color: "#cbd5e1", lineHeight: 1.5 }}>{item}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* close */}
        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Project plans track deliverables.<br/><span style={{ color: "#f59e0b" }}>Qorpera tracks promises.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.7 }}>Every client relationship has commitments made in emails and meetings that never reach a project plan. Activity intelligence closes the gap between what was said and what gets done.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>)}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 15, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
