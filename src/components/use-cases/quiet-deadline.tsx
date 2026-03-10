"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const SCENES = [
  { id: "title", duration: 7875 },
  { id: "surface", duration: 9625 },
  { id: "signal-docs", duration: 9625 },
  { id: "signal-slack", duration: 9625 },
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
  const [vis, setVis] = useState(false);
  useEffect(() => { if (show) { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); } setVis(false); }, [show, delay]);
  const d = { up:[0,distance], down:[0,-distance], left:[distance,0], right:[-distance,0], none:[0,0] }[direction]||[0,0];
  return <div style={{ opacity:vis?1:0, transform:vis?"translate(0,0)":`translate(${d[0]}px,${d[1]}px)`, transition:`opacity ${duration}ms cubic-bezier(.22,1,.36,1), transform ${duration}ms cubic-bezier(.22,1,.36,1)`, ...style }}>{children}</div>;
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
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 18, color, fontWeight: 500 }}>{name}</span>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}60` }} />
    </div>
  </Fade>
);

interface ActivityBarProps {
  label: string;
  weeks: number[];
  color: string;
  show: boolean;
  delay: number;
}

const ActivityBar = ({ label, weeks, color, show, delay }: ActivityBarProps) => (
  <Fade show={show} delay={delay} duration={500} style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 80, fontSize: 17, color: "#94a3b8", textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {weeks.map((v, i) => (
          <div key={i} style={{
            flex: 1, height: 30, borderRadius: 4,
            background: v === 0 ? "#1a1a2e" : `${color}${Math.round(Math.min(v / 20, 1) * 180 + 30).toString(16).padStart(2, "0")}`,
            border: `1px solid ${v === 0 ? "#2a2a4a" : color + "30"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: v > 10 ? "#fff" : "#64748b", fontFamily: "'JetBrains Mono', monospace",
          }}>{v || "\u2014"}</div>
        ))}
      </div>
    </div>
  </Fade>
);

interface StatusPillProps {
  label: string;
  color: string;
  icon: string;
}

const StatusPill = ({ label, color, icon }: StatusPillProps) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 6, fontSize: 14, color }}>
    <span>{icon}</span> {label}
  </div>
);

export default function QuietDeadline() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [finished, setFinished] = useState(false);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const now = Date.now() - startRef.current;
    setElapsed(now);
    if (now < TOTAL) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      startRef.current = null;
      setFinished(true);
    }
  }, []);

  const play = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    setElapsed(fromElapsed);
    setFinished(false);
    startRef.current = Date.now() - fromElapsed;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Auto-start on mount
  useEffect(() => {
    play();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [play]);

  // Auto-restart after 3s when finished
  useEffect(() => {
    if (finished) {
      restartTimerRef.current = setTimeout(() => {
        play();
      }, 3000);
      return () => {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      };
    }
  }, [finished, play]);

  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    play(target);
  }, [play]);

  let acc = 0, currentScene = SCENES[SCENES.length - 1].id, currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) { if (elapsed < acc + SCENES[i].duration) { currentScene = SCENES[i].id; currentSceneIndex = i; break; } acc += SCENES[i].duration; }
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  return (
    <div style={{ width: "100%", minHeight: "85vh", background: "#0a0a1a", overflow: "hidden", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.8)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
      <div style={{ position: "absolute", inset: 0, opacity: .02, backgroundImage: "linear-gradient(#a855f7 1px,transparent 1px),linear-gradient(90deg,#a855f7 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 1080, padding: "0 40px", minHeight: 400, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>

        {show("title") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#ef4444", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Use Case — Project Lead</div></Fade>
            <Fade show delay={500} duration={800}><div style={{ fontSize: 60, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.2 }}>The Quiet Deadline Miss</div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>The status board says &apos;on track.&apos;<br/>The activity says otherwise.</div></Fade>
            <Fade show delay={2200} duration={600}><div style={{ fontSize: 19, color: "#64748b", marginTop: 24, fontStyle: "italic" }}>When project tools lie, activity signals tell the truth.</div></Fade>
          </div>
        )}

        {show("surface") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 60px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#64748b", textTransform: "uppercase", marginBottom: 20, fontFamily: "'JetBrains Mono'" }}>What the project board shows</div></Fade>
            <Fade show delay={600} duration={700}>
              <div style={{ maxWidth: 520, margin: "0 auto", background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, padding: 24, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 25, fontWeight: 700, color: "#e2e8f0" }}>Platform Redesign v2</div>
                    <div style={{ fontSize: 18, color: "#64748b" }}>Sprint 4 of 6 &bull; Due: March 24</div>
                  </div>
                  <StatusPill label="On Track" color="#22c55e" icon="&#10003;" />
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  {[{ l: "Done", v: "14", c: "#22c55e" }, { l: "In Progress", v: "6", c: "#3b82f6" }, { l: "Blocked", v: "0", c: "#ef4444" }].map((s, i) => (
                    <div key={i}><div style={{ fontSize: 14, color: "#4a5568" }}>{s.l}</div><div style={{ fontSize: 23, fontWeight: 600, color: s.c }}>{s.v}</div></div>
                  ))}
                </div>
                <div style={{ height: 10, borderRadius: 4, background: "#1e1e3a", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "65%", borderRadius: 4, background: "linear-gradient(90deg, #22c55e, #22c55e80)" }} />
                </div>
                <div style={{ fontSize: 14, color: "#22c55e", marginTop: 8, fontFamily: "'JetBrains Mono'" }}>65% complete — 14 days remaining</div>
              </div>
            </Fade>
            <Fade show delay={2400} duration={700}><div style={{ fontSize: 22, color: "#94a3b8", marginTop: 24 }}>Zero blocked tickets. Progress looks healthy.<br/><span style={{ color: "#64748b" }}>But nobody is actually working on it.</span></div></Fade>
          </div>
        )}

        {show("signal-docs") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Google Drive" icon="&#128193;" color="#22c55e" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Deliverable docs<br/><span style={{ color: "#ef4444" }}>untouched for 10 days</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The technical spec, design system doc, and API reference haven&apos;t been edited since Sprint 3. The last editor on the spec was an intern.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>Edits per week</div></Fade>
              <Fade show delay={500} duration={300}>
                <div style={{ display: "flex", gap: 3, marginLeft: 90, marginBottom: 6 }}>
                  {["W-4", "W-3", "W-2", "W-1", "Now"].map((w, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 14, color: i === 4 ? "#e2e8f0" : "#4a5568", fontFamily: "'JetBrains Mono', monospace" }}>{w}</div>
                  ))}
                </div>
              </Fade>
              <ActivityBar label="Tech Spec" weeks={[14, 8, 1, 0, 0]} color="#ef4444" show delay={700} />
              <ActivityBar label="Design Sys" weeks={[9, 11, 3, 0, 0]} color="#ef4444" show delay={1000} />
              <ActivityBar label="API Ref" weeks={[6, 7, 2, 0, 0]} color="#ef4444" show delay={1300} />
              <Fade show delay={2000} duration={400}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 90, marginTop: 12, padding: "6px 12px", background: "#ef444412", border: "1px solid #ef444425", borderRadius: 8, width: "fit-content" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "blink 1.5s infinite" }} />
                  <span style={{ fontSize: 17, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>Last spec editor: Jake (intern) — 10 days ago</span>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {show("signal-slack") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={400}><div style={{ fontSize: 17, color: "#64748b", fontFamily: "'JetBrains Mono'", marginBottom: 10 }}>Messages per week in #platform-redesign</div></Fade>
              <ActivityBar label="Messages" weeks={[47, 52, 38, 12, 4]} color="#e879a0" show delay={700} />
              <ActivityBar label="Threads" weeks={[8, 9, 6, 2, 0]} color="#e879a0" show delay={1000} />
              {[
                { msg: "Emma: Anyone reviewed the API changes?", time: "5 days ago", replies: "0 replies" },
                { msg: "Jake: I updated some types in the spec, can someone check?", time: "10 days ago", replies: "0 replies" },
              ].map((m, i) => (
                <Fade key={i} show delay={1600 + i * 500} duration={400}>
                  <div style={{ padding: "10px 14px", marginTop: 8, borderRadius: 10, background: "#ef444408", border: "1px solid #ef444418" }}>
                    <div style={{ fontSize: 18, color: "#e2e8f0", marginBottom: 3 }}>{m.msg}</div>
                    <div style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'" }}>{m.time} &bull; {m.replies}</div>
                  </div>
                </Fade>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Slack" icon="&#128172;" color="#e879a0" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Project channel<br/><span style={{ color: "#e879a0" }}>went silent</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>Messages dropped from 50/week to 4. Two questions from team members got zero replies. The channel is essentially abandoned.</div></Fade>
            </div>
          </div>
        )}

        {show("signal-calendar") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <ToolBadge name="Calendar" icon="&#128197;" color="#f59e0b" show delay={200} />
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginTop: 20, marginBottom: 8, lineHeight: 1.3 }}>Key engineers<br/><span style={{ color: "#f59e0b" }}>pulled elsewhere</span></div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>The two senior engineers assigned to this project have been pulled into incident response and other project meetings all week. Their calendars are 90% non-redesign work.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { name: "Marcus (Sr. Engineer)", pct: 15, other: "Incident response, API migration" },
                { name: "Priya (Sr. Engineer)", pct: 10, other: "Client demo prep, hiring interviews" },
                { name: "Jake (Junior)", pct: 80, other: "Only active contributor" },
              ].map((p, i) => (
                <Fade key={i} show delay={600 + i * 500} duration={400}>
                  <div style={{ padding: "12px 16px", background: "#12122a", border: `1px solid ${p.pct < 30 ? "#ef444420" : "#1e1e3a"}`, borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 19, color: "#e2e8f0", fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 18, color: p.pct < 30 ? "#ef4444" : "#22c55e", fontWeight: 700, fontFamily: "'JetBrains Mono'" }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: "#1e1e3a", overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${p.pct}%`, borderRadius: 3, background: p.pct < 30 ? "#ef4444" : "#22c55e", transition: "width 0.8s ease" }} />
                    </div>
                    <div style={{ fontSize: 14, color: "#4a5568", fontFamily: "'JetBrains Mono'" }}>Elsewhere: {p.other}</div>
                  </div>
                </Fade>
              ))}
              <Fade show delay={2400} duration={400}><div style={{ fontSize: 14, color: "#ef4444", fontFamily: "'JetBrains Mono'", textAlign: "center", marginTop: 8 }}>% of calendar time on Platform Redesign this week</div></Fade>
            </div>
          </div>
        )}

        {show("detection") && (
          <div style={{ textAlign: "center", width: "100%", padding: "0 50px" }}>
            <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Qorpera detects the gap</div></Fade>
            <Fade show delay={600} duration={800}><div style={{ fontSize: 46, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 28, lineHeight: 1.3 }}>The board says on track.<br/><span style={{ color: "#ef4444" }}>The work stopped 10 days ago.</span></div></Fade>
            <Fade show delay={1400} duration={800}>
              <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 28px", background: "#ef444410", border: "1px solid #ef444425", borderRadius: 14, textAlign: "left", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>AT RISK: Platform Redesign v2 — likely to miss deadline</span>
                </div>
                <div style={{ fontSize: 19, color: "#cbd5e1", lineHeight: 1.7 }}>
                  Deliverable docs untouched 10 days. Slack channel activity dropped 92%. Senior engineers reassigned (85-90% of calendar on other projects). Only contributor is a junior engineer. 14 days to deadline with 35% remaining.
                </div>
              </div>
            </Fade>
            <Fade show delay={3200} duration={600}><div style={{ fontSize: 18, color: "#64748b", marginTop: 8, fontFamily: "'JetBrains Mono'" }}>The project board had zero blocked tickets. The AI saw zero active contributors.</div></Fade>
          </div>
        )}

        {show("action") && (
          <div style={{ display: "flex", alignItems: "center", gap: 50, width: "100%", padding: "0 60px" }}>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={600}><div style={{ fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#a855f7", textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono'" }}>Proposed Action</div></Fade>
              <Fade show delay={600} duration={700}><div style={{ fontSize: 41, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 12, lineHeight: 1.3 }}>Intervene before the<br/>deadline, not after</div></Fade>
              <Fade show delay={1200} duration={600}><div style={{ fontSize: 20, color: "#94a3b8", lineHeight: 1.7, maxWidth: 340 }}>14 days is enough to recover — if the problem is acknowledged now. In 7 days, it won&apos;t be.</div></Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { step: "1", action: "Alert Engineering lead to resource conflict", tool: "Slack" },
                { step: "2", action: "Flag Marcus and Priya's calendar conflicts", tool: "Calendar" },
                { step: "3", action: "Create scope risk assessment doc", tool: "Drive" },
                { step: "4", action: "Schedule emergency sprint review", tool: "Calendar" },
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
            <Fade show delay={200} duration={800}><div style={{ fontSize: 53, fontWeight: 700, color: "#f1f5f9", fontFamily: "'Space Grotesk'", marginBottom: 16, lineHeight: 1.3 }}>Status boards track tickets.<br/><span style={{ color: "#a855f7" }}>Qorpera tracks the work.</span></div></Fade>
            <Fade show delay={1000} duration={700}><div style={{ fontSize: 24, color: "#94a3b8", maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.7 }}>A project with zero blocked tickets can still be dying. Activity intelligence sees what boards can&apos;t — who&apos;s actually doing the work.</div></Fade>
            <Fade show delay={2400} duration={600}><div style={{ fontSize: 18, color: "#64748b", fontFamily: "'JetBrains Mono'" }}>qorpera.com</div></Fade>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (
          <button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>&larr; Back</button>
        )}
        {currentSceneIndex === SCENES.length - 1 ? (
          <a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Get Qorpera &rarr;</a>
        ) : (
          <button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next &rarr;</button>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a2e" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#a855f7,#6366f1)", width: `${progress * 100}%`, transition: "width 0.1s linear" }} /></div>
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 14, color: "#2a2a4a", fontFamily: "'JetBrains Mono'", letterSpacing: 1, textTransform: "uppercase" }}>{currentScene} &bull; {Math.ceil((TOTAL - elapsed) / 1000)}s</div>
    </div>
  );
}
