"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SCENES = [
  { id: "title", duration: 7875 },
  { id: "surface", duration: 9625 },
  { id: "signal-email", duration: 10500 },
  { id: "signal-calendar", duration: 9625 },
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

export default function EmployeeLeaving() {
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
      `}</style>

      <div style={{ position:"absolute", inset:0, opacity:0.025, backgroundImage:"linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)", backgroundSize:"40px 40px" }} />

      <div style={{ width:"100%", maxWidth:1080, padding:"0 40px", minHeight:400, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>

        {/* title */}
        {show("title") && (
          <div style={{ textAlign:"center" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:18, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>HR / People</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:60, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", letterSpacing:-1, marginBottom:16, lineHeight:1.2 }}>The Resignation You<br />Didn&apos;t See Coming</div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:560, margin:"0 auto", lineHeight:1.7 }}>
                Performance reviews say everything&apos;s fine. The AI sees the disengagement building for 6 weeks.
              </div>
            </Fade>
            <Fade show delay={2000} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:520, margin:"20px auto 0", lineHeight:1.7, fontStyle:"italic" }}>
                The most expensive surprise in business isn&apos;t a lost deal &mdash; it&apos;s a lost employee.
              </div>
            </Fade>
          </div>
        )}

        {/* surface */}
        {show("surface") && (
          <div style={{ textAlign:"center", width:"100%" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:18, fontWeight:600, letterSpacing:3, color:"#22c55e", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>On Paper, Nothing Is Wrong</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ display:"flex", gap:24, justifyContent:"center", marginBottom:32, marginTop:24 }}>
                {[
                  { label:"Performance review", value:"Meets expectations", icon:"\u2713", delay:800 },
                  { label:"Attendance", value:"No absences", icon:"\u2713", delay:1200 },
                  { label:"Project delivery", value:"On time", icon:"\u2713", delay:1600 },
                ].map((card, i) => (
                  <Fade key={i} show delay={card.delay} duration={500}>
                    <div style={{ background:"#0f0f24", border:"1px solid #22c55e30", borderRadius:14, padding:"28px 32px", minWidth:200, textAlign:"center" }}>
                      <div style={{ fontSize:36, color:"#22c55e", marginBottom:10, fontWeight:700 }}>{card.icon}</div>
                      <div style={{ fontSize:15, color:"#64748b", marginBottom:6, fontFamily:"'JetBrains Mono'" }}>{card.label}</div>
                      <div style={{ fontSize:21, color:"#e2e8f0", fontWeight:500 }}>{card.value}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
            <Fade show delay={2200} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>
                Every system says this employee is fine. The activity tells a different story.
              </div>
            </Fade>
          </div>
        )}

        {/* signal-email */}
        {show("signal-email") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 40px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:18, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Gmail Signals</div>
              </Fade>
              <Fade show delay={400} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:25 }}>
                  <div style={{ fontSize:15, color:"#475569", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Email behaviour — 6-week trend</div>
                  {[
                    { label:"Response time", before:"2 hours", after:"14 hours", color:"#ef4444", delay:600 },
                    { label:"Email length", before:"4 paragraphs", after:"1 line", color:"#ef4444", delay:1000 },
                    { label:"Suggestions offered", before:"3 / week", after:"0", color:"#f59e0b", delay:1400 },
                    { label:"Initiative emails", before:"Weekly", after:"None in 4 weeks", color:"#ef4444", delay:1800 },
                  ].map((row, i) => (
                    <Fade key={i} show delay={row.delay} duration={400} direction="left" distance={15}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i < 3 ? "1px solid #1e1e3a" : "none" }}>
                        <span style={{ fontSize:18, color:"#94a3b8" }}>{row.label}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:15, color:"#64748b", fontFamily:"'JetBrains Mono'" }}>{row.before}</span>
                          <span style={{ fontSize:15, color:"#475569" }}>&rarr;</span>
                          <span style={{ fontSize:15, color:row.color, fontFamily:"'JetBrains Mono'", fontWeight:600 }}>{row.after}</span>
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={800} duration={800}>
                <div style={{ fontSize:39, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:16, lineHeight:1.2 }}>Replies got shorter. Ideas stopped. Engagement faded.</div>
              </Fade>
              <Fade show delay={1600} duration={800}>
                <div style={{ fontSize:21, color:"#94a3b8", lineHeight:1.7 }}>
                  Six weeks ago, this person was the first to respond to every thread. Now they reply with &ldquo;OK&rdquo; and &ldquo;Noted.&rdquo;
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* signal-calendar */}
        {show("signal-calendar") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 40px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:18, fontWeight:600, letterSpacing:3, color:"#f59e0b", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Calendar Signals</div>
              </Fade>
              <Fade show delay={400} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:25 }}>
                  {[
                    { text:"Optional meetings declined: 8 of last 10", color:"#ef4444", delay:600 },
                    { text:"Blocked \u2018personal time\u2019 3 afternoons this week", color:"#f59e0b", delay:1000 },
                    { text:"Skipped team lunch for first time in 6 months", color:"#f59e0b", delay:1400 },
                    { text:"Camera off in last 4 video calls", color:"#ef4444", delay:1800 },
                  ].map((item, i) => (
                    <Fade key={i} show delay={item.delay} duration={400} direction="left" distance={15}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom: i < 3 ? "1px solid #1e1e3a" : "none" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:item.color, flexShrink:0 }} />
                        <span style={{ fontSize:18, color:"#cbd5e1", lineHeight:1.4 }}>{item.text}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={800} duration={800}>
                <div style={{ fontSize:39, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:16, lineHeight:1.2 }}>Calendar tells the real story</div>
              </Fade>
              <Fade show delay={1600} duration={800}>
                <div style={{ fontSize:21, color:"#94a3b8", lineHeight:1.7 }}>
                  They&apos;re still showing up. But they&apos;ve already checked out. The calendar shows withdrawal before the conversation happens.
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ textAlign:"center", width:"100%" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:18, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Pattern Detected</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:42, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24, lineHeight:1.2 }}>Qorpera sees the disengagement</div>
            </Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth:680, margin:"0 auto 28px", background:"#1a1a2e", border:"1px solid #ef444430", borderRadius:16, padding:30, textAlign:"left" }}>
                <Fade show delay={1400} duration={400}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", animation:"pulse 1.5s infinite" }} />
                    <span style={{ fontSize:15, color:"#ef4444", fontFamily:"'JetBrains Mono'", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>At Risk: Employee disengagement pattern detected</span>
                  </div>
                </Fade>
                <Fade show delay={1800} duration={500}>
                  <div style={{ fontSize:18, color:"#cbd5e1", lineHeight:1.7, marginBottom:16 }}>
                    6-week decline identified. Email response time up 600%. Initiative emails stopped. 80% of optional meetings declined. Communication shifted from proactive to reactive across all channels. Pattern matches pre-resignation behavior at 87% confidence.
                  </div>
                </Fade>
                <Fade show delay={2600} duration={400}>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap", borderTop:"1px solid #1e1e3a", paddingTop:16 }}>
                    {[
                      { value:"600%", label:"Response time increase", color:"#ef4444" },
                      { value:"0", label:"Initiative emails in 4 weeks", color:"#ef4444" },
                      { value:"80%", label:"Optional meetings declined", color:"#f59e0b" },
                      { value:"87%", label:"Confidence match", color:"#a855f7" },
                    ].map((stat, i) => (
                      <Fade key={i} show delay={2800 + i * 250} duration={300} direction="none">
                        <div style={{ flex:1, minWidth:120, textAlign:"center", padding:"10px 14px", background:stat.color + "08", border:`1px solid ${stat.color}20`, borderRadius:10 }}>
                          <div style={{ fontSize:28, fontWeight:700, color:stat.color, fontFamily:"'Space Grotesk'" }}>{stat.value}</div>
                          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{stat.label}</div>
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
          <div style={{ display:"flex", gap:28, width:"100%", padding:"0 40px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #ef444430", borderRadius:14, padding:28, height:"100%" }}>
                  <div style={{ fontSize:15, fontWeight:600, letterSpacing:2, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Without Qorpera</div>
                  <Fade show delay={500} duration={500}>
                    <div style={{ fontSize:21, color:"#cbd5e1", lineHeight:1.7, marginBottom:16 }}>
                      Manager finds out when the resignation letter lands.
                    </div>
                  </Fade>
                  <Fade show delay={900} duration={400}>
                    <div style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7 }}>
                      3 months to hire a replacement. 6 months to full productivity. &euro;50K+ in lost output and recruiting.
                    </div>
                  </Fade>
                  <Fade show delay={1400} duration={400}>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:20 }}>
                      {[
                        { text:"3 months to hire", color:"#ef4444" },
                        { text:"6 months to ramp", color:"#ef4444" },
                        { text:"\u20AC50K+ cost", color:"#ef4444" },
                      ].map((tag, i) => (
                        <div key={i} style={{ padding:"6px 14px", borderRadius:8, background:tag.color + "10", border:`1px solid ${tag.color}25`, fontSize:15, color:tag.color, fontFamily:"'JetBrains Mono'" }}>{tag.text}</div>
                      ))}
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={400} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #22c55e30", borderRadius:14, padding:28, height:"100%" }}>
                  <div style={{ fontSize:15, fontWeight:600, letterSpacing:2, color:"#22c55e", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>With Qorpera</div>
                  <Fade show delay={700} duration={500}>
                    <div style={{ fontSize:21, color:"#cbd5e1", lineHeight:1.7, marginBottom:16 }}>
                      Manager gets an early signal. Has a retention conversation while it still matters.
                    </div>
                  </Fade>
                  <Fade show delay={1100} duration={400}>
                    <div style={{ fontSize:18, color:"#94a3b8", lineHeight:1.7 }}>
                      Addresses the root cause &mdash; whether it&apos;s workload, growth, or recognition &mdash; before it&apos;s too late.
                    </div>
                  </Fade>
                  <Fade show delay={1600} duration={400}>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:20 }}>
                      {[
                        { text:"Early signal", color:"#22c55e" },
                        { text:"Retention conversation", color:"#22c55e" },
                        { text:"Root cause addressed", color:"#22c55e" },
                      ].map((tag, i) => (
                        <div key={i} style={{ padding:"6px 14px", borderRadius:8, background:tag.color + "10", border:`1px solid ${tag.color}25`, fontSize:15, color:tag.color, fontFamily:"'JetBrains Mono'" }}>{tag.text}</div>
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
          <div style={{ textAlign:"center", width:"100%", padding:"0 60px" }}>
            <Fade show delay={200} duration={800}>
              <div style={{ fontSize:45, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24, lineHeight:1.2 }}>
                HR systems track attendance.<br /><span style={{ color:"#ef4444" }}>Qorpera tracks engagement.</span>
              </div>
            </Fade>
            <Fade show delay={1000} duration={800}>
              <div style={{ fontSize:21, color:"#94a3b8", maxWidth:600, margin:"0 auto", lineHeight:1.7 }}>
                The difference between a surprise resignation and a retention conversation is seeing the signals six weeks earlier &mdash; in the emails, calendars, and conversations that no system was watching.
              </div>
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
