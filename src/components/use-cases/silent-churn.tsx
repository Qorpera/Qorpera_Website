"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SCENES = [
  { id: "setup", duration: 8750 },
  { id: "day1-normal", duration: 11375 },
  { id: "day14-signals", duration: 14875 },
  { id: "detection", duration: 12250 },
  { id: "context", duration: 13125 },
  { id: "action", duration: 11375 },
  { id: "outcome", duration: 10500 },
  { id: "lesson", duration: 9625 },
  { id: "cta", duration: 7000 },
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

interface TimelineEvent {
  delay: number;
  color: string;
  time: string;
  text: string;
  textColor?: string;
}

interface TimelineProps {
  show: boolean;
  events: TimelineEvent[];
}

const Timeline = ({ show, events }: TimelineProps) => (
  <div style={{ position:"relative", paddingLeft:20 }}>
    <div style={{ position:"absolute", left:6, top:0, bottom:0, width:2, background:"#1e1e3a", borderRadius:1 }} />
    {events.map((e, i) => (
      <Fade key={i} show={show} delay={e.delay} duration={400} direction="left" distance={15}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12, position:"relative" }}>
          <div style={{ position:"absolute", left:-17, top:5, width:12, height:12, borderRadius:"50%", background:e.color, border:"2px solid #0a0a1a" }} />
          <div>
            <div style={{ fontSize:14, color:"#475569", fontFamily:"'JetBrains Mono'", marginBottom:2 }}>{e.time}</div>
            <div style={{ fontSize:18, color:e.textColor || "#cbd5e1", lineHeight:1.4 }}>{e.text}</div>
          </div>
        </div>
      </Fade>
    ))}
  </div>
);

interface SignalBarProps {
  label: string;
  before: string;
  after: string;
  color: string;
  show: boolean;
  delay: number;
}

const SignalBar = ({ label, before, after, color, show, delay }: SignalBarProps) => (
  <Fade show={show} delay={delay} duration={500}>
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:17, color:"#94a3b8" }}>{label}</span>
        <span style={{ fontSize:14, color:color, fontFamily:"'JetBrains Mono'" }}>{before} → {after}</span>
      </div>
      <div style={{ height:8, borderRadius:4, background:"#1e1e3a", overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:before, background:color+"40", borderRadius:3 }} />
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:after, background:`linear-gradient(90deg, ${color}, ${color}80)`, borderRadius:3, transition:"width 1.5s cubic-bezier(.22,1,.36,1)" }} />
      </div>
    </div>
  </Fade>
);

interface ContextCardProps {
  icon: string;
  source: string;
  text: string;
  show: boolean;
  delay: number;
}

const ContextCard = ({ icon, source, text, show, delay }: ContextCardProps) => (
  <Fade show={show} delay={delay} duration={400} direction="left" distance={15}>
    <div style={{ display:"flex", gap:10, padding:"12px 18px", background:"#12122a", border:"1px solid #1e1e3a", borderRadius:10, marginBottom:6 }}>
      <span style={{ fontSize:24 }}>{icon}</span>
      <div>
        <div style={{ fontSize:14, color:"#475569", fontFamily:"'JetBrains Mono'", marginBottom:2 }}>{source}</div>
        <div style={{ fontSize:17, color:"#cbd5e1", lineHeight:1.4 }}>{text}</div>
      </div>
    </div>
  </Fade>
);

export default function SilentChurn() {
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
        @keyframes scanDown { 0% { top:-2px; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { top:100%; opacity:0; } }
      `}</style>

      <div style={{ position:"absolute", inset:0, opacity:0.025, backgroundImage:"linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)", backgroundSize:"40px 40px" }} />

      <div style={{ width:"100%", maxWidth:1080, padding:"0 40px", minHeight:400, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>

        {/* setup */}
        {show("setup") && (
          <div style={{ textAlign:"center" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Use Case</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:62, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", letterSpacing:-1, marginBottom:16, lineHeight:1.2 }}>The silent churn<br />nobody saw coming</div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ fontSize:24, color:"#94a3b8", maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
                How Qorpera detects a customer walking away — by reading the signals humans miss across email, meetings, support, and billing.
              </div>
            </Fade>
          </div>
        )}

        {/* day1-normal */}
        {show("day1-normal") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 60px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#22c55e", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>January — Business as Usual</div>
              </Fade>
              <Fade show delay={500} duration={800}>
                <div style={{ fontSize:46, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:12, lineHeight:1.2 }}>Meridian Corp is a healthy account</div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize:22, color:"#94a3b8", lineHeight:1.7 }}>
                  &euro;45K annual contract. Active deal in pipeline for expansion. Regular biweekly meetings. Fast email responses. No open support tickets.
                </div>
              </Fade>
              <Fade show delay={1600} duration={600}>
                <div style={{ marginTop:16, padding:"12px 20px", background:"#22c55e10", border:"1px solid #22c55e30", borderRadius:10, display:"inline-block" }}>
                  <span style={{ fontSize:18, color:"#22c55e", fontFamily:"'JetBrains Mono'" }}>Health score: Excellent</span>
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={400} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:25 }}>
                  <div style={{ fontSize:17, color:"#475569", marginBottom:14, fontFamily:"'JetBrains Mono'" }}>Meridian Corp — Activity baseline</div>
                  <SignalBar label="Email frequency" before="80%" after="80%" color="#22c55e" show delay={600} />
                  <SignalBar label="Meeting cadence" before="70%" after="70%" color="#22c55e" show delay={800} />
                  <SignalBar label="Response time" before="85%" after="85%" color="#22c55e" show delay={1000} />
                  <SignalBar label="Support tickets" before="5%" after="5%" color="#22c55e" show delay={1200} />
                  <SignalBar label="Payment status" before="90%" after="90%" color="#22c55e" show delay={1400} />
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* day14-signals */}
        {show("day14-signals") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 60px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#f59e0b", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>February — Subtle Shifts</div>
              </Fade>
              <Fade show delay={500} duration={800}>
                <div style={{ fontSize:46, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:12, lineHeight:1.2 }}>Nobody notices. <span style={{ color:"#a855f7" }}>Qorpera does.</span></div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize:22, color:"#94a3b8", lineHeight:1.7 }}>
                  No single signal is alarming. Email response time crept up. A meeting was cancelled. A small support ticket opened. Invoice went past due. Each tool shows its own slice. Only the pattern tells the story.
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={300} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #1e1e3a", borderRadius:14, padding:25 }}>
                  <div style={{ fontSize:17, color:"#475569", marginBottom:14, fontFamily:"'JetBrains Mono'" }}>Meridian Corp — Signals shifting</div>
                  <SignalBar label="Email frequency" before="80%" after="35%" color="#ef4444" show delay={600} />
                  <SignalBar label="Meeting cadence" before="70%" after="15%" color="#ef4444" show delay={1200} />
                  <SignalBar label="Response time" before="85%" after="30%" color="#f59e0b" show delay={1800} />
                  <SignalBar label="Support tickets" before="5%" after="55%" color="#ef4444" show delay={2400} />
                  <SignalBar label="Payment status" before="90%" after="20%" color="#ef4444" show delay={3000} />
                  <Fade show delay={4000} duration={400}>
                    <div style={{ borderTop:"1px solid #1e1e3a", marginTop:12, paddingTop:10, textAlign:"center" }}>
                      <span style={{ fontSize:14, color:"#ef4444", fontFamily:"'JetBrains Mono'", animation:"pulse 1.5s infinite" }}>⚠ Pattern detected across 5 signals</span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* detection */}
        {show("detection") && (
          <div style={{ textAlign:"center", width:"100%" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#ef4444", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>Situation Detected</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:53, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24 }}>
                Churn risk — <span style={{ color:"#ef4444" }}>Meridian Corp</span>
              </div>
            </Fade>
            <Fade show delay={1200} duration={500}>
              <div style={{ maxWidth:600, margin:"0 auto", background:"#1a1a2e", border:"1px solid #ef444430", borderRadius:16, padding:30, textAlign:"left" }}>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
                  {[
                    { icon:"📧", text:"Email response time 3× slower", color:"#ef4444" },
                    { icon:"📅", text:"0 meetings in 6 weeks", color:"#ef4444" },
                    { icon:"🎫", text:"P2 ticket open 8 days", color:"#f59e0b" },
                    { icon:"💰", text:"Invoice 42 days overdue", color:"#ef4444" },
                    { icon:"📉", text:"Deal stage unchanged 18 days", color:"#f59e0b" },
                  ].map((s, i) => (
                    <Fade key={i} show delay={1600 + i * 300} duration={300} direction="none">
                      <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 15px", background:s.color+"10", border:`1px solid ${s.color}25`, borderRadius:8 }}>
                        <span style={{ fontSize:19 }}>{s.icon}</span>
                        <span style={{ fontSize:17, color:s.color }}>{s.text}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
                <Fade show delay={3400} duration={400}>
                  <div style={{ fontSize:19, color:"#94a3b8", lineHeight:1.6, fontStyle:"italic", borderTop:"1px solid #1e1e3a", paddingTop:12 }}>
                    &ldquo;No single tool flagged this. Each metric individually is within noise range. The pattern across all five is a 91% churn predictor.&rdquo;
                  </div>
                </Fade>
              </div>
            </Fade>
          </div>
        )}

        {/* context */}
        {show("context") && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:50, width:"100%", padding:"0 60px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#a855f7", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Full Context Retrieved</div>
              </Fade>
              <Fade show delay={500} duration={800}>
                <div style={{ fontSize:41, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:12, lineHeight:1.2 }}>AI reads everything before deciding</div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize:20, color:"#94a3b8", lineHeight:1.7 }}>
                  Before proposing an action, the AI assembles full context from every connected source — not just the signals that triggered the alert.
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <ContextCard icon="📧" source="Gmail — 3 days ago" text="Last email from Sarah Chen: &apos;We&apos;re reviewing our vendor agreements for Q2. Will circle back.&apos;" show delay={600} />
              <ContextCard icon="💬" source="Slack #sales — 1 week ago" text="Account rep mentioned: &apos;Meridian has gone quiet, might be comparing options&apos;" show delay={1200} />
              <ContextCard icon="📄" source="Google Drive — 2 weeks ago" text="Meridian renewal proposal doc last edited Feb 1 — not opened since" show delay={1800} />
              <ContextCard icon="📅" source="Calendar" text="Last meeting: Jan 15. Next scheduled: none. Previously: biweekly" show delay={2400} />
              <ContextCard icon="🎫" source="Support" text="Ticket #119: API latency issue. Opened Feb 3, still unresolved." show delay={3000} />
              <Fade show delay={3800} duration={400}>
                <div style={{ textAlign:"center", fontSize:14, color:"#a855f7", fontFamily:"'JetBrains Mono'", marginTop:8 }}>
                  5 sources · 12 related entities · 30 days of activity
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* action */}
        {show("action") && (
          <div style={{ display:"flex", alignItems:"center", gap:50, width:"100%", padding:"0 60px" }}>
            <div style={{ flex:1 }}>
              <Fade show delay={200} duration={600}>
                <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#22c55e", textTransform:"uppercase", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Proposed Action</div>
              </Fade>
              <Fade show delay={500} duration={800}>
                <div style={{ fontSize:41, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:12, lineHeight:1.2 }}>Not a template. A judgment call.</div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize:20, color:"#94a3b8", lineHeight:1.7 }}>
                  The AI doesn&apos;t send a generic &ldquo;just checking in.&rdquo; It reasons about context: there&apos;s an unresolved support ticket, a stalled renewal, and a hint of vendor evaluation. The response addresses all three.
                </div>
              </Fade>
            </div>
            <div style={{ flex:1 }}>
              <Fade show delay={600} duration={500}>
                <div style={{ background:"#0f0f24", border:"1px solid #22c55e30", borderRadius:14, padding:25 }}>
                  <div style={{ fontSize:17, color:"#22c55e", marginBottom:12, fontFamily:"'JetBrains Mono'" }}>Recommended: Multi-step outreach</div>
                  {[
                    { n:"1", text:"Escalate support ticket to P1 — resolve the API issue within 48h", delay:900 },
                    { n:"2", text:"Account manager calls Sarah (not email — they&apos;ve gone silent on email)", delay:1500 },
                    { n:"3", text:"Acknowledge vendor review, offer technical deep-dive session", delay:2100 },
                    { n:"4", text:"Defer invoice follow-up until support ticket resolved", delay:2700 },
                  ].map((s, i) => (
                    <Fade key={i} show delay={s.delay} duration={400} direction="left" distance={15}>
                      <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:"#22c55e15", border:"1px solid #22c55e30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#22c55e", flexShrink:0 }}>{s.n}</div>
                        <div style={{ fontSize:18, color:"#cbd5e1", lineHeight:1.5 }}>{s.text}</div>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={3400} duration={400}>
                    <div style={{ display:"flex", gap:8, marginTop:14, borderTop:"1px solid #1e1e3a", paddingTop:12 }}>
                      <div style={{ padding:"8px 20px", borderRadius:8, background:"#22c55e20", border:"1px solid #22c55e40", fontSize:18, color:"#22c55e", cursor:"pointer" }}>Approve All</div>
                      <div style={{ padding:"8px 20px", borderRadius:8, background:"#ffffff08", border:"1px solid #ffffff15", fontSize:18, color:"#94a3b8", cursor:"pointer" }}>Edit & Approve</div>
                      <div style={{ padding:"8px 20px", borderRadius:8, background:"#ffffff08", border:"1px solid #ffffff15", fontSize:18, color:"#64748b", cursor:"pointer" }}>Reject</div>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* outcome */}
        {show("outcome") && (
          <div style={{ textAlign:"center", width:"100%" }}>
            <Fade show delay={200} duration={600}>
              <div style={{ fontSize:19, fontWeight:600, letterSpacing:3, color:"#22c55e", textTransform:"uppercase", marginBottom:16, fontFamily:"'JetBrains Mono'" }}>2 Weeks Later</div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ fontSize:53, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24 }}>
                Meridian <span style={{ color:"#22c55e" }}>renewed and expanded</span>
              </div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ display:"flex", gap:24, justifyContent:"center", marginBottom:32 }}>
                {[
                  { label:"Support ticket", value:"Resolved", color:"#22c55e" },
                  { label:"Invoice", value:"Paid", color:"#22c55e" },
                  { label:"Deal", value:"&euro;58K (+29%)", color:"#a855f7" },
                  { label:"Meetings", value:"Resumed weekly", color:"#3b82f6" },
                ].map((s, i) => (
                  <Fade key={i} show delay={1600 + i * 300} duration={400}>
                    <div style={{ background:"#1a1a2e", border:"1px solid #2a2a4a", borderRadius:12, padding:"20px 25px", minWidth:130, textAlign:"center" }}>
                      <div style={{ fontSize:17, color:"#64748b", marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontSize:20, fontWeight:600, color:s.color }}>{s.value}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}>
              <div style={{ fontSize:22, color:"#94a3b8", maxWidth:480, margin:"0 auto", lineHeight:1.7, fontStyle:"italic" }}>
                Without cross-tool activity intelligence, this account would have churned silently. The CRM showed &ldquo;active deal.&rdquo; The invoice system showed &ldquo;overdue.&rdquo; Only the full picture showed &ldquo;customer walking away.&rdquo;
              </div>
            </Fade>
          </div>
        )}

        {/* lesson */}
        {show("lesson") && (
          <div style={{ textAlign:"center", width:"100%", padding:"0 80px" }}>
            <Fade show delay={200} duration={800}>
              <div style={{ fontSize:53, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:24, lineHeight:1.2 }}>
                This is what AI <span style={{ color:"#a855f7" }}>integrated</span><br />into your workforce looks like
              </div>
            </Fade>
            <Fade show delay={1000} duration={800}>
              <div style={{ display:"flex", gap:20, justifyContent:"center" }}>
                {[
                  { icon:"👁", text:"Reads every email, message, meeting, and document" },
                  { icon:"🧠", text:"Connects patterns across tools humans can&apos;t track" },
                  { icon:"⚡", text:"Acts with context — not templates" },
                  { icon:"📈", text:"Learns from every outcome" },
                ].map((s, i) => (
                  <Fade key={i} show delay={1400 + i * 300} duration={400}>
                    <div style={{ flex:1, background:"#1a1a2e", border:"1px solid #2a2a4a", borderRadius:14, padding:"25px 20px", textAlign:"center" }}>
                      <div style={{ fontSize:41, marginBottom:8 }}>{s.icon}</div>
                      <div style={{ fontSize:18, color:"#94a3b8", lineHeight:1.5 }}>{s.text}</div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {/* cta */}
        {show("cta") && (
          <div style={{ textAlign:"center" }}>
            <Fade show delay={200} duration={1000}>
              <div style={{ fontSize:67, fontWeight:700, color:"#f1f5f9", fontFamily:"'Space Grotesk'", marginBottom:16, letterSpacing:-1 }}>Qorpera</div>
            </Fade>
            <Fade show delay={800} duration={800}>
              <div style={{ fontSize:22, color:"#94a3b8", marginBottom:32, fontWeight:300, lineHeight:1.6 }}>
                AI that understands how your business actually works.
              </div>
            </Fade>
            <Fade show delay={1400} duration={600}>
              <a href="/contact" style={{ display:"inline-block", padding:"18px 50px", borderRadius:10, background:"linear-gradient(135deg, #2563eb, #1d4ed8)", color:"#fff", fontSize:19, fontWeight:600, textDecoration:"none" }}>Get Qorpera</a>
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
