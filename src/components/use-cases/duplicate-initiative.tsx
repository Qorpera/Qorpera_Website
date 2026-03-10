"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "track-a", duration: 10500 },
  { id: "track-b", duration: 10500 },
  { id: "detection", duration: 10500 },
  { id: "action", duration: 8750 },
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

interface TrackCardItem {
  icon: string;
  label: string;
  source: string;
  time: string;
}

interface TrackCardProps {
  color: string;
  dept: string;
  icon: string;
  items: TrackCardItem[];
  show: boolean;
  delay: number;
}

const TrackCard = ({ color, dept, icon, items, show, delay }: TrackCardProps) => (
  <Fade show={show} delay={delay} duration={700}>
    <div style={{ background:"#1a1a2e",border:`1.5px solid ${color}30`,borderRadius:14,padding:20,position:"relative",overflow:"hidden",flex:1 }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}60)` }} />
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
        <span style={{ fontSize:27 }}>{icon}</span>
        <span style={{ fontSize:21,fontWeight:700,color }}>{dept}</span>
      </div>
      {items.map((item, i) => (
        <Fade key={i} show={show} delay={delay + 300 + i * 400} duration={400}>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #1e1e3a" }}>
            <span style={{ fontSize:18 }}>{item.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:17,color:"#e2e8f0" }}>{item.label}</div>
              <div style={{ fontSize:14,color:"#4a5568",fontFamily:"'JetBrains Mono', monospace" }}>{item.source} - {item.time}</div>
            </div>
          </div>
        </Fade>
      ))}
    </div>
  </Fade>
);

export default function DuplicateInitiative() {
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
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#6366f1", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Cross-Team</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Duplicate Initiative</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Two teams. Same problem. Neither knows<br/>the other is already working on it.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The most expensive kind of wasted effort:<br/>solving the same problem twice.</div></Fade>
          </div>
        )}

        {show("track-a") && (
          <div style={{ display: "flex", alignItems: "center", gap: 40, width: "100%", padding: "0 60px" }}>
            <TrackCard color="#3b82f6" dept="Engineering" icon="&#9881;&#65039;" show delay={200} items={[
              { icon: "\ud83d\udcc1", label: "Internal Reporting Tool \u2014 Architecture Doc", source: "Drive", time: "Created 6 days ago" },
              { icon: "\ud83d\udcac", label: "Thread: 'Building custom dashboards for ops team'", source: "Slack #engineering", time: "8 messages this week" },
              { icon: "\ud83d\udcc5", label: "Sprint planning: Reporting tool sprint 1", source: "Calendar", time: "Yesterday" },
              { icon: "\ud83d\udce7", label: "Email to VP Eng: 'Estimated 3 sprints to deliver'", source: "Gmail", time: "4 days ago" },
            ]} />
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 8, lineHeight: 1.3 }}>Engineering is<br/><span style={{ color: "#3b82f6" }}>building it in-house</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>The engineering team started a 3-sprint project to build custom reporting dashboards. Architecture doc written, sprint planned, dev time allocated. Estimated cost: 6 weeks x 2 engineers.</div></Fade>
              <Fade show delay={2000} duration={400}><div style={{ fontSize: 18, color: "#3b82f6", marginTop: 12, fontFamily: "'JetBrains Mono'" }}>~&euro;40K in engineering time committed</div></Fade>
            </div>
          </div>
        )}

        {show("track-b") && (
          <div style={{ display: "flex", alignItems: "center", gap: 40, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 8, lineHeight: 1.3 }}>Operations is<br/><span style={{ color: "#22c55e" }}>buying it off the shelf</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7 }}>Meanwhile, the ops team has been evaluating SaaS tools that do the same thing. They&apos;re in final contract negotiation with a vendor. Email threads with pricing, a signed trial agreement in Drive.</div></Fade>
              <Fade show delay={2000} duration={400}><div style={{ fontSize: 18, color: "#22c55e", marginTop: 12, fontFamily: "'JetBrains Mono'" }}>~&euro;18K/year SaaS contract in negotiation</div></Fade>
            </div>
            <TrackCard color="#22c55e" dept="Operations" icon="&#128202;" show delay={200} items={[
              { icon: "\ud83d\udce7", label: "Email: 'Looker vs Metabase vs custom \u2014 final eval'", source: "Gmail", time: "5 days ago" },
              { icon: "\ud83d\udccb", label: "Vendor comparison spreadsheet (3 tools evaluated)", source: "Drive", time: "Last week" },
              { icon: "\ud83d\udce7", label: "Email: 'Trial agreement with DataView Inc'", source: "Gmail", time: "3 days ago" },
              { icon: "\ud83d\udcc5", label: "Meeting: 'DataView contract review + sign-off'", source: "Calendar", time: "Tomorrow" },
            ]} />
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera spots the overlap</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Same problem. Two solutions.<br/><span style={{ color: "#ef4444" }}>~&euro;58K about to be wasted.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#ef4444" }}>DUPLICATE: Engineering build + Ops vendor solve same problem</span>
                </div>
                <div style={{ fontSize: 20, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Engineering is 1 week into a 6-week build for internal reporting dashboards. Operations is signing a SaaS contract for the same capability tomorrow. Neither team appears aware of the other&apos;s work. Combined cost: ~&euro;58K (&euro;40K eng time + &euro;18K vendor).
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Drive docs + email threads + calendar events across two departments revealed the overlap.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Merge the efforts<br/>before either ships</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>One conversation between the two teams saves weeks of duplicated work and tens of thousands in wasted budget.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Alert both team leads to the overlap", tool: "Slack" },
                { step: "2", action: "Share Eng architecture doc + Ops vendor comparison", tool: "Drive" },
                { step: "3", action: "Schedule joint decision meeting", tool: "Calendar" },
                { step: "4", action: "Pause vendor sign-off until alignment", tool: "Email" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 15, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>via {s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Teams work in silos.<br/><span style={{ color: "#a855f7" }}>Qorpera sees across them.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI understands what every department is working on, it catches overlaps that no single team can see. Duplication isn&apos;t a communication failure — it&apos;s a visibility failure.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera →</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>)}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 15, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} - {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
