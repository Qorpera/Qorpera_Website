"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "the-draft", duration: 9625 },
  { id: "missed-1", duration: 9625 },
  { id: "missed-2", duration: 9625 },
  { id: "enriched", duration: 10500 },
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

export default function ProposalMissedContext() {
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#22c55e", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Work Quality</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Proposal That<br/>Missed Context</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>Sales is drafting a proposal. They don&apos;t know that Engineering<br/>deprecated the feature they&apos;re highlighting.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 20, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>The best proposal uses context the author doesn&apos;t have.</div></Fade>
          </div>
        )}

        {show("the-draft") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}><div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: 10 }}><span style={{ fontSize: 24 }}>📝</span><span style={{ fontSize: 18, color: "#3b82f6", fontWeight: 500 }}>Proposal in progress</span></div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Alex is writing a proposal<br/><span style={{ color: "#3b82f6" }}>for Nexus Industries</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>$125K deal. The proposal highlights real-time sync, batch processing, and the legacy API. It references a case study from 2023.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={800} duration={500}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", marginBottom: 12 }}>Proposal_Nexus_v1.docx</div>
                  {["✓ Real-time data sync capabilities", "✓ Batch processing pipeline", "⚠ Legacy API integration", "✓ 2023 Acme Corp case study", "✓ Standard pricing table"].map((l, i) => (
                    <Fade key={i} show delay={1000 + i * 250} duration={300}>
                      <div style={{ padding: "5px 0", borderBottom: "1px solid #1e1e3a", fontSize: 18, color: l.startsWith("⚠") ? "#f59e0b" : "#94a3b8" }}>{l}</div>
                    </Fade>
                  ))}
                  <Fade show delay={2600} duration={400}><div style={{ marginTop: 10, fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>Last edited: 2 hours ago - 60% complete</div></Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("missed-1") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              {[
                { icon: "💬", source: "Slack #engineering — 5 days ago", msg: "The legacy API is being deprecated next quarter. All new integrations should use v3 REST API.", color: "#ef4444", label: "The proposal highlights a feature being killed" },
                { icon: "📁", source: "Drive — published yesterday", msg: "Case Study: DataFlow Corp — 40% faster onboarding with v3 API integration", color: "#22c55e", label: "A better case study exists that Alex hasn't seen" },
              ].map((m, i) => (
                <Fade key={i} show delay={400 + i * 1200} duration={600}>
                  <div style={{ padding: "16px", background: i === 0 ? "#ef444408" : "#22c55e06", border: `1px solid ${m.color}20`, borderRadius: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 21 }}>{m.icon}</span>
                      <span style={{ fontSize: 15, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>{m.source}</span>
                    </div>
                    <div style={{ fontSize: 18, color: "#e2e8f0", marginBottom: 6, fontStyle: "italic" }}>&quot;{m.msg}&quot;</div>
                    <div style={{ fontSize: 17, color: m.color, fontWeight: 600 }}>{m.label}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 8, lineHeight: 1.3 }}>The AI knows things<br/><span style={{ color: "#ef4444" }}>the author doesn&apos;t</span></div></Fade>
              <Fade show delay={800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>A Slack announcement from Engineering. A new case study published in Drive yesterday. Both directly relevant to this proposal. Neither visible to Alex in Sales.</div></Fade>
            </div>
          </div>
        )}

        {show("missed-2") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={700}><div style={{ fontSize: 39, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 8, lineHeight: 1.3 }}>The prospect already<br/><span style={{ color: "#f59e0b" }}>told you what they want</span></div></Fade>
              <Fade show delay={800} duration={600}><div style={{ fontSize: 21, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Three emails from Nexus over the past month. Each one asked about a specific capability. The proposal doesn&apos;t address any of them.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { from: "Nexus CTO", ask: "Can we self-host? Data residency is critical for us.", date: "3 weeks ago" },
                { from: "Nexus VP Eng", ask: "What's your uptime SLA? We need 99.95% minimum.", date: "2 weeks ago" },
                { from: "Nexus Procurement", ask: "Do you offer multi-year discounts?", date: "Last week" },
              ].map((m, i) => (
                <Fade key={i} show delay={400 + i * 600} duration={400}>
                  <div style={{ padding: "12px 14px", background: "#f59e0b06", border: "1px solid #f59e0b15", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 18, color: "#f59e0b", fontWeight: 600 }}>{m.from}</span>
                      <span style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{m.date}</span>
                    </div>
                    <div style={{ fontSize: 18, color: "#e2e8f0", fontStyle: "italic" }}>&quot;{m.ask}&quot;</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2400} duration={400}><div style={{ padding: "6px 12px", background: "#f59e0b08", border: "1px solid #f59e0b18", borderRadius: 8, textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 17, color: "#f59e0b" }}>3 specific asks. 0 addressed in the proposal.</span></div></Fade>
            </div>
          </div>
        )}

        {show("enriched") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera enriches the work</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 45, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>Before sending, the AI suggests<br/><span style={{ color: "#22c55e" }}>5 improvements</span></div></Fade>
            <Fade show delay={1200} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#22c55e08", border: "1px solid #22c55e20", borderRadius: 14, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 21, fontWeight: 700, color: "#22c55e" }}>ENRICHMENT: Proposal can be significantly improved</span>
                </div>
                {[
                  { icon: "🔄", text: "Replace Legacy API section with v3 REST API (legacy deprecated Q2)", source: "Slack #engineering" },
                  { icon: "📊", text: "Swap 2023 Acme case study for 2024 DataFlow case study (more relevant)", source: "Drive — published yesterday" },
                  { icon: "🏠", text: "Add self-hosting section (Nexus CTO specifically asked about data residency)", source: "Gmail — 3 weeks ago" },
                  { icon: "📈", text: "Add SLA guarantees section (Nexus VP Eng requested 99.95%)", source: "Gmail — 2 weeks ago" },
                  { icon: "💰", text: "Include multi-year discount table (Procurement asked last week)", source: "Gmail — last week" },
                ].map((s, i) => (
                  <Fade key={i} show delay={1400 + i * 400} duration={400}>
                    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #22c55e10" }}>
                      <span style={{ fontSize: 18 }}>{s.icon}</span>
                      <div><div style={{ fontSize: 18, color: "#e2e8f0" }}>{s.text}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{s.source}</div></div>
                    </div>
                  </Fade>
                ))}
              </div>
            </Fade>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 54, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Good work + full context<br/>= <span style={{ color: "#a855f7" }}>great work</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 26, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>The AI doesn&apos;t write the proposal. It makes sure the author has every piece of context that exists across the company — before they hit send.</div></Fade>
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
