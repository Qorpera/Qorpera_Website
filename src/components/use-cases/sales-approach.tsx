"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration: number;
}

const SCENES: Scene[] = [
  { id: "title", duration: 7875 },
  { id: "surface", duration: 9625 },
  { id: "signal-volume", duration: 9625 },
  { id: "signal-pattern", duration: 10500 },
  { id: "signal-replies", duration: 9625 },
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

interface ToolBadgeProps {
  name: string;
  icon: string;
  color: string;
  show: boolean;
  delay: number;
}

const ToolBadge = ({ name, icon, color, show, delay }: ToolBadgeProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10 }}>
      <span style={{ fontSize: 20 }}>{icon}</span><span style={{ fontSize: 18, color, fontWeight: 500 }}>{name}</span>
    </div>
  </Fade>
);

interface WeekBarProps {
  label: string;
  values: number[];
  maxVal: number;
  color: string;
  show: boolean;
  delay: number;
}

const WeekBar = ({ label, values, maxVal, color, show, delay }: WeekBarProps) => (
  <Fade show={show} delay={delay} duration={500} style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 70, fontSize: 17, color: "#94a3b8", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ display: "flex", gap: 3, flex: 1, alignItems: "flex-end", height: 40 }}>
        {values.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 13, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{v > 0 ? v : ""}</span>
            <div style={{
              width: "100%", borderRadius: 3,
              height: Math.max((v / maxVal) * 28, 2),
              background: `${color}${Math.round(Math.min(v / maxVal, 1) * 180 + 40).toString(16).padStart(2, "0")}`,
            }} />
          </div>
        ))}
      </div>
    </div>
  </Fade>
);

interface ReplyCardProps {
  prospect: string;
  question: string;
  show: boolean;
  delay: number;
}

const ReplyCard = ({ prospect, question, show, delay }: ReplyCardProps) => (
  <Fade show={show} delay={delay} duration={400}>
    <div style={{ padding: "10px 14px", background: "#3b82f608", border: "1px solid #3b82f618", borderRadius: 10, marginBottom: 5 }}>
      <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>{prospect}</div>
      <div style={{ fontSize: 18, color: "#e2e8f0", fontStyle: "italic" }}>&quot;{question}&quot;</div>
    </div>
  </Fade>
);

export default function SalesApproach() {
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

  // Auto-start on mount
  useEffect(() => {
    startAnimation();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [startAnimation]);

  // When animation finishes, wait 3s then restart
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
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#3b82f6", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Sales</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Approach That<br/>Isn&apos;t Landing</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>The rep is working hard. Sending emails, making calls.<br/>The problem isn&apos;t effort — it&apos;s strategy.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>Volume doesn&apos;t fix a broken message.</div></Fade>
          </div>
        )}

        {show("surface") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>What the activity numbers show</div></Fade>
            <Fade show delay={600} duration={700}>
              <div style={{ maxWidth: 480, margin: "0 auto", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div><div style={{ fontSize: 25, fontWeight: 700, color: "#e2e8f0" }}>Alex — Sales Rep</div><div style={{ fontSize: 18, color: "#64748b" }}>Q1 Outbound Campaign</div></div>
                  <div style={{ padding: "4px 12px", background: "#3b82f618", border: "1px solid #3b82f630", borderRadius: 6, fontSize: 17, color: "#3b82f6" }}>Active</div>
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  {[{ n: "127", l: "Emails sent", c: "#22c55e" }, { n: "34", l: "Calls made", c: "#22c55e" }, { n: "8", l: "Replies", c: "#f59e0b" }, { n: "0", l: "Meetings booked", c: "#ef4444" }].map((s, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: s.c, fontFamily: "'Space Grotesk'" }}>{s.n}</div>
                      <div style={{ fontSize: 14, color: "#64748b" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 22, color: "#94a3b8", marginTop: 24 }}>High activity. Low conversion. The manager says &quot;keep going.&quot;<br/><span style={{ color: "#64748b" }}>The AI says &quot;change the approach.&quot;</span></div></Fade>
          </div>
        )}

        {show("signal-volume") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Gmail + HubSpot" icon="&#x1F4E7;" color="#3b82f6" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Response rate<br/><span style={{ color: "#ef4444" }}>declining every week</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Alex is sending more emails but getting fewer replies. The response rate dropped from 12% to 3% over 4 weeks. The approach is wearing out, not warming up.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={300}>
                <div style={{ display: "flex", gap: 3, marginLeft: 80, marginBottom: 6 }}>
                  {["W1", "W2", "W3", "W4"].map((w, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>{w}</div>
                  ))}
                </div>
              </Fade>
              <WeekBar label="Sent" values={[24, 31, 35, 37]} maxVal={40} color="#3b82f6" show delay={600} />
              <WeekBar label="Opened" values={[14, 12, 9, 8]} maxVal={40} color="#f59e0b" show delay={900} />
              <WeekBar label="Replied" values={[3, 3, 1, 1]} maxVal={40} color="#ef4444" show delay={1200} />
              <Fade show delay={2000} duration={400}>
                <div style={{ marginLeft: 80, marginTop: 12, display: "flex", gap: 16, fontSize: 17, fontFamily: "'JetBrains Mono'" }}>
                  <span style={{ color: "#64748b" }}>Reply rate:</span>
                  <span style={{ color: "#f59e0b" }}>W1: 12%</span>
                  <span style={{ color: "#ef4444" }}>→ W4: 3%</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("signal-pattern") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={600}>
                <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>Content analysis — 127 sent emails</div>
                  {[
                    { label: "Same template used", pct: 89, color: "#ef4444" },
                    { label: "Mentions pricing", pct: 92, color: "#ef4444" },
                    { label: "Mentions integration", pct: 12, color: "#4a5568" },
                    { label: "Personalized opening", pct: 8, color: "#4a5568" },
                  ].map((s, i) => (
                    <Fade key={i} show delay={700 + i * 350} duration={400}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 17, color: "#94a3b8" }}>{s.label}</span>
                          <span style={{ fontSize: 17, color: s.color, fontWeight: 600, fontFamily: "'JetBrains Mono'" }}>{s.pct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: "#1e1e3a" }}>
                          <div style={{ height: "100%", width: `${s.pct}%`, borderRadius: 3, background: s.color, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Gmail — Content Analysis" icon="&#x1F50D;" color="#a855f7" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Same template.<br/><span style={{ color: "#ef4444" }}>Every single time.</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>89% of outreach uses the same template. It leads with pricing. It barely mentions integrations. Zero personalization. The pitch is about us, not about them.</div></Fade>
            </div>
          </div>
        )}

        {show("signal-replies") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Gmail — Reply Analysis" icon="&#x1F4AC;" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>The replies tell you<br/><span style={{ color: "#22c55e" }}>what they actually want</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Of the 8 replies, 6 asked about the same thing: API integrations and data portability. The pitch doesn&apos;t mention either. The market is telling you what it wants.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>What prospects actually asked about:</div></Fade>
              <ReplyCard prospect="CTO @ DataFlow" question="Does this integrate with our existing Postgres setup?" show delay={700} />
              <ReplyCard prospect="VP Eng @ Cloudnine" question="How does data export work? We need portability." show delay={1100} />
              <ReplyCard prospect="Head of Ops @ ScaleUp" question="Can this connect to our internal APIs?" show delay={1500} />
              <ReplyCard prospect="CTO @ Buildright" question="What&apos;s the integration story? We have 12 internal tools." show delay={1900} />
              <Fade show delay={2600} duration={400}>
                <div style={{ padding: "8px 14px", background: "#22c55e08", border: "1px solid #22c55e18", borderRadius: 8, marginTop: 8, textAlign: "center" }}>
                  <span style={{ fontSize: 18, color: "#22c55e", fontWeight: 600 }}>6 of 8 replies mention integrations. The pitch doesn&apos;t.</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera identifies the mismatch</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 46, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>The problem isn&apos;t volume.<br/><span style={{ color: "#3b82f6" }}>The message is wrong.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#3b82f608", border: "1px solid #3b82f620", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#3b82f6" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>STRATEGY: Outbound approach misaligned with market interest</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Reply rate declined from 12% to 3% over 4 weeks. 89% of emails use identical template leading with pricing. 75% of replies ask about integrations — a topic absent from the pitch. Increasing volume will accelerate the decline, not reverse it.
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>A CRM shows pipeline metrics. Qorpera reads the actual conversations.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Fix the message,<br/>not the volume</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The market is telling you what resonates. The AI surfaces the pattern and proposes a strategic shift.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Share reply analysis with Sales lead", tool: "Slack" },
                { step: "2", action: "Draft integration-led email template", tool: "Drive" },
                { step: "3", action: "Pause current campaign, switch template", tool: "HubSpot" },
                { step: "4", action: "Schedule pitch strategy session", tool: "Calendar" },
              ].map((s, i) => (
                <Fade key={i} show delay={500 + i * 500} duration={400}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: "#a855f718", border: "1px solid #a855f730", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#a855f7", fontWeight: 700 }}>{s.step}</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 500 }}>{s.action}</div><div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>via {s.tool}</div></div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {show("close") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>CRMs measure activity.<br/><span style={{ color: "#a855f7" }}>Qorpera measures effectiveness.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>Sending more of the wrong message doesn&apos;t work. Activity intelligence reads the replies, spots the pattern, and tells you what to change.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (<button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>)}
        {currentSceneIndex === SCENES.length - 1 ? (<a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera →</a>) : (<button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next →</button>)}
      </div>

      {playing && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>}
      {playing && <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} &bull; {Math.ceil((TOTAL - elapsed) / 1000)}s</div>}
    </div>
  );
}
