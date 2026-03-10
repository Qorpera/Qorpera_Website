"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "old-way", duration: 9625 },
  { id: "ai-brief", duration: 12250 },
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
  useEffect(() => { if (show) { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); } setVis(false); }, [show, delay]);
  const d = { up: [0, distance], down: [0, -distance], left: [distance, 0], right: [-distance, 0], none: [0, 0] }[direction] || [0, 0];
  return <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translate(0,0)" : `translate(${d[0]}px,${d[1]}px)`, transition: `opacity ${duration}ms cubic-bezier(.22,1,.36,1), transform ${duration}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
};

interface ScrambleCardProps {
  time: string;
  task: string;
  icon: string;
  show: boolean;
  delay: number;
}

const ScrambleCard = ({ time, task, icon, show, delay }: ScrambleCardProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ padding: "14px 12px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, width: 140, textAlign: "center" }}>
      <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "'Space Grotesk'", marginBottom: 4 }}>{time}</div>
      <div style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.4 }}>{task}</div>
    </div>
  </Fade>
);

interface BriefSectionProps {
  section: string;
  items: string[];
  source: string;
  show: boolean;
  delay: number;
}

const BriefSection = ({ section, items, source, show, delay }: BriefSectionProps) => (
  <Fade show={show} delay={delay} duration={500}>
    <div style={{ marginBottom: 12, padding: "8px 0", borderBottom: "1px solid #1e1e3a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 17, color: "#a855f7", fontWeight: 600 }}>{section}</span>
        <span style={{ fontSize: 15, color: "#4a5568" }}>{source}</span>
      </div>
      {items.map((item, j) => (
        <div key={j} style={{ fontSize: 17, color: "#cbd5e1", padding: "2px 0 2px 12px", borderLeft: "2px solid #2a2a4a", marginBottom: 2 }}>{item}</div>
      ))}
    </div>
  </Fade>
);

interface ImpactCardProps {
  before: string;
  after: string;
  label: string;
  color: string;
  show: boolean;
  delay: number;
}

const ImpactCard = ({ before, after, label, color, show, delay }: ImpactCardProps) => (
  <Fade show={show} delay={delay} duration={500}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, color: "#4a5568", textDecoration: "line-through", marginBottom: 4 }}>{before}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "'Space Grotesk'" }}>{after}</div>
    </div>
  </Fade>
);

export default function PerfectBrief() {
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Meeting Quality</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Perfect Brief</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Before every important meeting, the AI prepares a brief<br />with everything you need to know — in 30 seconds.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Meeting prep: from 30 minutes to 30 seconds.</div></Fade>
          </div>
        )}

        {show("old-way") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={700}><div style={{ fontSize: 42, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.3 }}>The 30-minute scramble <span style={{ color: "#ef4444" }}>before every meeting</span></div></Fade>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
              <ScrambleCard time="10 min" task="Search email for last conversation" icon="📧" show delay={500} />
              <ScrambleCard time="8 min" task="Find the shared doc and read updates" icon="📁" show delay={900} />
              <ScrambleCard time="5 min" task="Check Slack for any recent mentions" icon="💬" show delay={1300} />
              <ScrambleCard time="5 min" task="Look up CRM for latest deal status" icon="🔧" show delay={1700} />
              <ScrambleCard time="2 min" task="Scan calendar for context on attendees" icon="📅" show delay={2100} />
            </div>
            <Fade show delay={3000} duration={600}><div style={{ fontSize: 21, color: "#64748b" }}>30 minutes of context-switching. And you still miss things.</div></Fade>
          </div>
        )}

        {show("ai-brief") && (
          <div style={{ display: "flex", alignItems: "center", gap: 40, width: "100%", padding: "0 50px" }}>
            <div style={{ flex: "0 0 280px" }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#a855f715", border: "1px solid #a855f740", borderRadius: 10 }}><span style={{ fontSize: 24 }}>🤖</span><span style={{ fontSize: 18, color: "#a855f7", fontWeight: 500 }}>Qorpera Brief</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 36, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Everything you<br />need to know.<br /><span style={{ color: "#22c55e" }}>30 seconds.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7 }}>Before your 2pm with Nexus Industries, the AI assembles context from every connected tool automatically.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={500} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #a855f720", borderRadius: 14, padding: 20, maxHeight: 480, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 21, fontWeight: 700, color: "#e2e8f0" }}>📋 Pre-Meeting Brief: Nexus Industries</div>
                    <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>2:00 PM today - 45 min</div>
                  </div>
                  <BriefSection section="Since Last Meeting (Feb 18)" items={["Deal moved to Negotiation stage (HubSpot, Feb 22)", "Their CTO opened proposal 6 times this week (Drive)", "CFO downloaded ROI calculator twice (Drive)", "VP Eng asked about uptime SLA via email (Gmail, Feb 25)"]} source="📧📁🔧" show delay={700} />
                  <BriefSection section="Attendees & What They Care About" items={["CTO — technical architecture, data residency (asked 3x)", "VP Eng — uptime SLAs, integration depth", "CFO — ROI, multi-year pricing (downloaded calculator)", "Procurement — contract terms (new addition)"]} source="📧📅" show delay={1600} />
                  <BriefSection section="Open Items to Address" items={["Self-hosting question (unanswered since Feb 5)", "SLA guarantee request (needs product input)", "Multi-year discount (Finance approved up to 15%)"]} source="📧💬" show delay={2500} />
                  <BriefSection section="Internal Context" items={["Alex (Sales) flagged: 'They're comparing us to Competitor X'", "Product team confirmed: v3 API supports their requirements", "Legal approved standard enterprise terms yesterday"]} source="💬📁" show delay={3400} />
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("impact") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={700}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 24, lineHeight: 1.3 }}>Better prepared. Better conversations.<br /><span style={{ color: "#22c55e" }}>Better outcomes.</span></div></Fade>
            <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 28 }}>
              <ImpactCard before="30 min prep" after="30 seconds" label="Preparation time" color="#22c55e" show delay={600} />
              <ImpactCard before="Partial context" after="Full picture" label="Information quality" color="#3b82f6" show delay={1100} />
              <ImpactCard before="Reactive" after="Proactive" label="Meeting posture" color="#a855f7" show delay={1600} />
            </div>
            <Fade show delay={2800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", maxWidth: 480, margin: "0 auto" }}>You walk in knowing what changed, what they care about, what&apos;s unresolved, and what your team has already prepared. Every meeting starts at full speed.</div></Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Agendas list topics.<br /><span style={{ color: "#a855f7" }}>Qorpera delivers context.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI has the full picture — emails, docs, meetings, CRM, Slack — every meeting brief is comprehensive, current, and personalized to what matters.</div></Fade>
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
