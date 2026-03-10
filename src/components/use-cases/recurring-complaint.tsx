"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SCENES = [
  { id: "title", duration: 7875 },
  { id: "complaints", duration: 10500 },
  { id: "the-pattern", duration: 9625 },
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
  const [v, setV] = useState(false);
  useEffect(() => { if (show) { const t = setTimeout(() => setV(true), delay); return () => clearTimeout(t); } setV(false); }, [show, delay]);
  const d = { up:[0,distance], down:[0,-distance], left:[distance,0], right:[-distance,0], none:[0,0] }[direction]||[0,0];
  return <div style={{ opacity:v?1:0, transform:v?"translate(0,0)":`translate(${d[0]}px,${d[1]}px)`, transition:`all ${duration * .5}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

export default function RecurringComplaint() {
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
      width:"100%", minHeight:"85vh", background:"#0a0a1a", overflow:"hidden",
      fontFamily:"'DM Sans', sans-serif", position:"relative",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;500;700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.5); } }
        @keyframes barGrow { 0% { width:0%; } 100% { width:100%; } }
      `}</style>

      <div style={{ position:"absolute", inset:0, opacity:0.025, backgroundImage:"linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)", backgroundSize:"40px 40px" }} />

      <div style={{ width:"100%", maxWidth:1080, padding:"0 40px", minHeight:400, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>

        {/* title */}
        {show("title") && (
          <div style={{ textAlign:"center" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Customer Support</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:60, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", letterSpacing:-1, marginBottom:16, lineHeight:1.2 }}>The Pattern Nobody Connected</div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
                Three customers complained about late Friday deliveries. Three different reps handled them. Nobody realized it&apos;s the same problem.
              </div>
            </Fade>
            <Fade show delay={2200} duration={800}>
              <div style={{ fontSize:21, color:"#cbd5e1", maxWidth:520, margin:"20px auto 0", lineHeight:1.7, fontStyle:"italic" }}>
                Individual complaints get resolved. Patterns get ignored — until they become a crisis.
              </div>
            </Fade>
          </div>
        )}

        {/* complaints */}
        {show("complaints") && (
          <div style={{ width:"100%", padding:"0 40px" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:20, fontFamily:"'JetBrains Mono'", textAlign:"center" }}>Three Isolated Tickets</div>
            </Fade>
            <div style={{ display:"flex", gap:20, justifyContent:"center", marginBottom:28 }}>
              {[
                { delay:500, ago:"2 weeks ago", name:"Mrs. Garcia", quote:"My order arrived Monday, was supposed to be Friday.", rep:"Tom" },
                { delay:1400, ago:"10 days ago", name:"Bakker B.V.", quote:"Third Friday delivery missed this quarter.", rep:"Lisa" },
                { delay:2300, ago:"3 days ago", name:"Jansen family", quote:"Package said Friday, came Tuesday. Had to change our plans.", rep:"Amir" },
              ].map((c, i) => (
                <Fade key={i} show delay={c.delay} duration={500} direction="up" distance={20}>
                  <div style={{ flex:1, background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:22, minWidth:200, maxWidth:300 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <span style={{ fontSize:15, color:"#64748b", fontFamily:"'JetBrains Mono'" }}>Complaint #{i + 1}</span>
                      <span style={{ fontSize:14, color:"#475569", fontFamily:"'JetBrains Mono'" }}>{c.ago}</span>
                    </div>
                    <div style={{ fontSize:18, fontWeight:600, color:"#f1f5f9", marginBottom:8 }}>{c.name}</div>
                    <div style={{ fontSize:17, color:"#94a3b8", lineHeight:1.5, marginBottom:12, fontStyle:"italic" }}>&ldquo;{c.quote}&rdquo;</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:15, color:"#64748b" }}>Handled by <span style={{ color:"#cbd5e1" }}>{c.rep}</span></span>
                      <span style={{ fontSize:14, color:"#22c55e", fontFamily:"'JetBrains Mono'", padding:"4px 10px", background:"#22c55e10", border:"1px solid #22c55e25", borderRadius:6 }}>Resolved &#10003;</span>
                    </div>
                  </div>
                </Fade>
              ))}
            </div>
            <Fade show delay={3800} duration={700}>
              <div style={{ textAlign:"center", fontSize:21, color:"#94a3b8", lineHeight:1.7, maxWidth:600, margin:"0 auto" }}>
                Three different reps. Three separate tickets. Three isolated resolutions. <span style={{ color:"#ef4444", fontWeight:600 }}>Same root cause.</span>
              </div>
            </Fade>
          </div>
        )}

        {/* the-pattern */}
        {show("the-pattern") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 40px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#f59e0b", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Hidden in the Data</div>
              </Fade>
              <Fade show delay={500} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:22, marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
                    <span style={{ fontSize:18, color:"#94a3b8" }}>Friday deliveries</span>
                    <span style={{ fontSize:21, fontWeight:700, color:"#ef4444", fontFamily:"'JetBrains Mono'" }}>23% failure rate</span>
                  </div>
                  <div style={{ height:28, borderRadius:6, background:"#1e1e3a", overflow:"hidden", marginBottom:12 }}>
                    <div style={{ height:"100%", width:"23%", background:"linear-gradient(90deg, #ef4444, #ef444480)", borderRadius:6 }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
                    <span style={{ fontSize:18, color:"#94a3b8" }}>Mon–Thu deliveries</span>
                    <span style={{ fontSize:21, fontWeight:700, color:"#22c55e", fontFamily:"'JetBrains Mono'" }}>3% failure rate</span>
                  </div>
                  <div style={{ height:28, borderRadius:6, background:"#1e1e3a", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:"3%", background:"linear-gradient(90deg, #22c55e, #22c55e80)", borderRadius:6 }} />
                  </div>
                </div>
              </Fade>
              <Fade show delay={1200} duration={500}>
                <div style={{ fontSize:15, color:"#64748b", fontFamily:"'JetBrains Mono'", textAlign:"center" }}>All failed Friday deliveries route through the southern depot.</div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={1600} duration={800}>
                <div style={{ fontSize:39, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:14, lineHeight:1.2 }}>It&apos;s not random.<br /><span style={{ color:"#ef4444" }}>It&apos;s the Friday route.</span></div>
              </Fade>
              <Fade show delay={2400} duration={800}>
                <div style={{ fontSize:21, color:"#94a3b8", lineHeight:1.7 }}>
                  The southern depot has a part-time driver on Fridays. He handles 40% more stops than weekday drivers. Deliveries slip to Monday every week.
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ width:"100%", padding:"0 40px" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Qorpera sees the pattern</div>
              </div>
            </Fade>
            <Fade show delay={600} duration={600}>
              <div style={{ maxWidth:680, margin:"0 auto", background:"#1a1a2e", border:"1px solid #ef444430", borderRadius:16, padding:28, marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", animation:"pulse 1.5s infinite" }} />
                  <span style={{ fontSize:15, fontWeight:600, color:"#ef4444", fontFamily:"'JetBrains Mono'", letterSpacing:1, textTransform:"uppercase" }}>Recurring Issue Detected</span>
                </div>
                <Fade show delay={1000} duration={500}>
                  <div style={{ fontSize:21, fontWeight:600, color:"#f1f5f9", marginBottom:12 }}>Friday delivery failures — 23% failure rate via southern depot</div>
                </Fade>
                <Fade show delay={1600} duration={500}>
                  <div style={{ fontSize:17, color:"#94a3b8", lineHeight:1.7, marginBottom:6 }}>3 complaints in 14 days, all Friday deliveries, all southern depot route.</div>
                </Fade>
                <Fade show delay={2000} duration={500}>
                  <div style={{ fontSize:17, color:"#94a3b8", lineHeight:1.7, marginBottom:6 }}>23% of Friday deliveries arrive late vs 3% baseline.</div>
                </Fade>
                <Fade show delay={2400} duration={500}>
                  <div style={{ fontSize:17, color:"#94a3b8", lineHeight:1.7, marginBottom:6 }}>Root cause: part-time Friday driver, 40% route overload.</div>
                </Fade>
                <Fade show delay={2800} duration={500}>
                  <div style={{ fontSize:17, color:"#f59e0b", lineHeight:1.7, marginBottom:6 }}>12 additional customers affected but haven&apos;t complained yet.</div>
                </Fade>
                <Fade show delay={3200} duration={500}>
                  <div style={{ fontSize:17, color:"#ef4444", lineHeight:1.7 }}>Estimated churn risk: 4 accounts.</div>
                </Fade>
              </div>
            </Fade>
            <Fade show delay={3800} duration={600}>
              <div style={{ display:"flex", gap:20, justifyContent:"center" }}>
                {[
                  { value:"23%", label:"Friday failure rate", color:"#ef4444" },
                  { value:"3", label:"complaints in 14 days", color:"#f59e0b" },
                  { value:"12", label:"more customers affected", color:"#a855f7" },
                  { value:"4", label:"accounts at churn risk", color:"#ef4444" },
                ].map((s, i) => (
                  <Fade key={i} show delay={4000 + i * 250} duration={400}>
                    <div style={{ background:"#0f0f24", border:`1px solid ${s.color}30`, borderRadius:12, padding:"18px 22px", minWidth:130, textAlign:"center" }}>
                      <div style={{ fontSize:39, fontWeight:700, color:s.color, fontFamily:"'Space Grotesk'", marginBottom:4 }}>{s.value}</div>
                      <div style={{ fontSize:15, color:"#64748b", lineHeight:1.4 }}>{s.label}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {/* action */}
        {show("action") && (
          <div style={{ display:"flex", gap:24, width:"100%", padding:"0 40px" }}>
            <Fade show delay={200} duration={600} style={{ flex:1 }}>
              <div style={{ background:"#0f0f24", border:"1px solid #ef444430", borderRadius:14, padding:28, height:"100%" }}>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:2, color:"#ef4444", textTransform:"uppercase", marginBottom:14, fontFamily:"'JetBrains Mono'" }}>Without Qorpera</div>
                <Fade show delay={500} duration={500}>
                  <div style={{ fontSize:21, color:"#f1f5f9", marginBottom:12, lineHeight:1.4 }}>Each complaint gets a refund and an apology.</div>
                </Fade>
                <Fade show delay={1000} duration={500}>
                  <div style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7, marginBottom:12 }}>The pattern continues. By Q3, you&apos;ve lost 4 accounts and don&apos;t know why.</div>
                </Fade>
                <Fade show delay={1500} duration={500}>
                  <div style={{ fontSize:18, color:"#64748b", lineHeight:1.7, fontStyle:"italic" }}>Support metrics look fine — every ticket was resolved.</div>
                </Fade>
              </div>
            </Fade>
            <Fade show delay={400} duration={600} style={{ flex:1 }}>
              <div style={{ background:"#0f0f24", border:"1px solid #22c55e30", borderRadius:14, padding:28, height:"100%" }}>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:2, color:"#22c55e", textTransform:"uppercase", marginBottom:14, fontFamily:"'JetBrains Mono'" }}>With Qorpera</div>
                <Fade show delay={800} duration={500}>
                  <div style={{ fontSize:21, color:"#f1f5f9", marginBottom:12, lineHeight:1.4 }}>Operations gets a pattern report. Friday routing is adjusted.</div>
                </Fade>
                <Fade show delay={1300} duration={500}>
                  <div style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7, marginBottom:12 }}>One driver added. Failure rate drops to baseline.</div>
                </Fade>
                <Fade show delay={1800} duration={500}>
                  <div style={{ fontSize:18, color:"#22c55e", lineHeight:1.7, marginBottom:12 }}>12 at-risk customers get proactive outreach.</div>
                </Fade>
                <Fade show delay={2300} duration={500}>
                  <div style={{ fontSize:21, fontWeight:700, color:"#22c55e" }}>Zero churn.</div>
                </Fade>
              </div>
            </Fade>
          </div>
        )}

        {/* close */}
        {show("close") && (
          <div style={{ textAlign:"center", padding:"0 60px" }}>
            <Fade show delay={200} duration={800}>
              <div style={{ fontSize:45, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24, lineHeight:1.2 }}>
                Support systems track tickets.<br /><span style={{ color:"#ef4444" }}>Qorpera tracks patterns.</span>
              </div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:560, margin:"0 auto 32px", lineHeight:1.7 }}>
                Every resolved ticket feels like a win. But when the same issue keeps appearing across different reps, channels, and customers — the real problem isn&apos;t the complaint. It&apos;s the pattern nobody connected.
              </div>
            </Fade>
            <Fade show delay={2200} duration={600}>
              <a href="/contact" style={{ display:"inline-block", padding:"18px 50px", borderRadius:10, background:"linear-gradient(135deg, #2563eb, #1d4ed8)", color:"#fff", fontSize:19, fontWeight:600, textDecoration:"none" }}>Get Qorpera &rarr;</a>
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

      {playing && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#1a1a2e" }}><div style={{ height:"100%", background:"linear-gradient(90deg, #a855f7, #6366f1)", width:`${progress*100}%`, transition:"width 0.1s linear" }} /></div>}

      {playing && <div style={{ position:"absolute", top:16, right:20, fontSize:14, color:"#2a2a4a", fontFamily:"'JetBrains Mono'", letterSpacing:1, textTransform:"uppercase" }}>{currentScene} • {Math.ceil((TOTAL-elapsed)/1000)}s</div>}
    </div>
  );
}
