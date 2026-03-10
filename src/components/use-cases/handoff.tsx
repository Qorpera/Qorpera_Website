"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "old-way", duration: 9625 },
  { id: "ai-knows", duration: 11375 },
  { id: "the-brief", duration: 10500 },
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

interface OldWayCardProps {
  icon: string;
  label: string;
  problem: string;
  color: string;
  show: boolean;
  delay: number;
}

const OldWayCard = ({ icon, label, problem, color, show, delay }: OldWayCardProps) => (
  <Fade show={show} delay={delay} duration={500}>
    <div style={{ flex: 1, padding: "20px", background: "#1a1a2e", border: `1px solid ${color}18`, borderRadius: 14, textAlign: "center" }}>
      <div style={{ fontSize: 42, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, color }}>{problem}</div>
    </div>
  </Fade>
);

interface SourceRowProps {
  icon: string;
  source: string;
  count: string;
  detail: string;
  show: boolean;
  delay: number;
}

const SourceRow = ({ icon, source, count, detail, show, delay }: SourceRowProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#22c55e04", border: "1px solid #22c55e10", borderRadius: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 21 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 17, color: "#22c55e", fontWeight: 600 }}>{source}</span>
          <span style={{ fontSize: 14, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{count}</span>
        </div>
        <div style={{ fontSize: 15, color: "#94a3b8" }}>{detail}</div>
      </div>
    </div>
  </Fade>
);

interface BriefSectionProps {
  section: string;
  content: string;
  show: boolean;
  delay: number;
}

const BriefSection = ({ section, content, show, delay }: BriefSectionProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ marginBottom: 10, padding: "8px 0", borderBottom: "1px solid #1e1e3a" }}>
      <div style={{ fontSize: 17, color: "#a855f7", fontWeight: 600, marginBottom: 3 }}>{section}</div>
      <div style={{ fontSize: 18, color: "#cbd5e1" }}>{content}</div>
    </div>
  </Fade>
);

export default function HandoffWorks() {
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');`}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Project Handoff</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Handoff That<br/>Actually Works</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Projects change hands. Usually in a 2-hour meeting<br/>where 60% of the context is lost.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The AI has every document, decision, and conversation.<br/>The handoff brief writes itself.</div></Fade>
          </div>
        )}

        {show("old-way") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={700}><div style={{ fontSize: 42, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 20, lineHeight: 1.3 }}>Every handoff loses <span style={{ color: "#ef4444" }}>most of its context</span></div></Fade>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
              <OldWayCard icon="🗣️" label="2-hour verbal handoff" problem="Relies on memory" color="#ef4444" show delay={600} />
              <OldWayCard icon="📄" label="Sparse handoff doc" problem="Missing decisions + rationale" color="#ef4444" show delay={1100} />
              <OldWayCard icon="❓" label="3 weeks of 'who do I ask?'" problem="Tribal knowledge lost" color="#ef4444" show delay={1600} />
            </div>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 21, color: "#94a3b8" }}>The new team spends 3 weeks rediscovering context<br/>that the old team had in their heads.</div></Fade>
          </div>
        )}

        {show("ai-knows") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>The AI watched<br/><span style={{ color: "#22c55e" }}>the entire project</span></div></Fade>
              <Fade show delay={800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Every Slack discussion, every email thread, every doc revision, every meeting, every decision. The AI doesn&apos;t forget and doesn&apos;t summarize from memory.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <SourceRow icon="💬" source="Slack" count="847 messages across 3 channels" detail="Key decisions, debates, resolutions" show delay={400} />
              <SourceRow icon="📧" source="Gmail" count="124 email threads" detail="Stakeholder communication, vendor coordination" show delay={850} />
              <SourceRow icon="📁" source="Drive" count="38 documents" detail="Specs, designs, meeting notes, decisions" show delay={1300} />
              <SourceRow icon="📅" source="Calendar" count="67 meetings" detail="Attendees, frequency patterns, key sessions" show delay={1750} />
              <SourceRow icon="🔧" source="HubSpot" count="12 customer touchpoints" detail="Requirements, feedback, change requests" show delay={2200} />
            </div>
          </div>
        )}

        {show("the-brief") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>AI-generated handoff brief</div></Fade>
            <Fade show delay={600} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px", background: "#1a1a2e", border: "1px solid #a855f720", borderRadius: 14, textAlign: "left" }}>
                <div style={{ fontSize: 23, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>📋 Project Handoff: Platform Redesign v2</div>
                <BriefSection section="Current State" content="Sprint 4 of 6, 65% complete. 3 critical features remaining. On track but tight." show delay={800} />
                <BriefSection section="Key Decisions Made" content="Chose React over Vue (Slack, Mar 2). Dropped offline mode (Email thread, Feb 14). Pricing: 3-tier model approved by CEO." show delay={1200} />
                <BriefSection section="Open Issues" content="API rate limiting unresolved (Slack thread). Customer X requested custom field — no decision yet. Design system inconsistency flagged by QA." show delay={1600} />
                <BriefSection section="Stakeholder Map" content="CTO: final sign-off. VP Eng: daily standup. Customer X: weekly check-in (Fridays). Agency: async via email." show delay={2000} />
                <BriefSection section="Where to Find Things" content="Specs: /Platform-Redesign/specs. Designs: Figma link in #design channel pinned. Meeting notes: Drive/meetings folder." show delay={2400} />
                <Fade show delay={3200} duration={400}><div style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'", marginTop: 8 }}>Generated from 847 Slack messages, 124 email threads, 38 documents, 67 meetings</div></Fade>
              </div>
            </Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Handoffs transfer documents.<br/><span style={{ color: "#a855f7" }}>Qorpera transfers understanding.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>When the AI has the full history, the new team doesn&apos;t start from scratch. They start from complete context — every decision, every reason, every open thread.</div></Fade>
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
