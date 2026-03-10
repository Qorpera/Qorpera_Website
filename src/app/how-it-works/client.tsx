"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ================================================================== */
/*  Architecture Explainer — animated walkthrough                      */
/* ================================================================== */

const SCENES = [
  { id: "intro", duration: 6300 },
  { id: "layer1-events", duration: 10500 },
  { id: "layer2-graph", duration: 11200 },
  { id: "layer3-situations", duration: 11200 },
  { id: "layer4-reasoning", duration: 9800 },
  { id: "layer5-learning", duration: 9800 },
  { id: "fullstack", duration: 8400 },
  { id: "cta", duration: 5600 },
];
const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

const Fade = ({
  show,
  delay = 0,
  duration = 600,
  direction = "up",
  distance = 24,
  children,
  style = {},
}: {
  show: boolean;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => setV(true), delay);
      return () => clearTimeout(t);
    }
    setV(false);
  }, [show, delay]);
  const d =
    {
      up: [0, distance],
      down: [0, -distance],
      left: [distance, 0],
      right: [-distance, 0],
      none: [0, 0],
    }[direction] || [0, 0];
  return (
    <div
      style={{
        opacity: v ? 1 : 0,
        transform: v ? "translate(0,0)" : `translate(${d[0]}px,${d[1]}px)`,
        transition: `all ${duration}ms cubic-bezier(.22,1,.36,1)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const LayerLabel = ({
  number,
  name,
  color,
}: {
  number: string;
  name: string;
  color: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    }}
  >
    <div
      style={{
        width: 43,
        height: 43,
        borderRadius: 12,
        background: color + "15",
        border: `1px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {number}
    </div>
    <div
      style={{
        fontSize: 18,
        fontWeight: 600,
        color,
        textTransform: "uppercase",
        letterSpacing: 2,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {name}
    </div>
  </div>
);

const StreamLine = ({
  color,
  delay,
  show,
  label,
}: {
  color: string;
  delay: number;
  show: boolean;
  label: string;
}) => (
  <Fade show={show} delay={delay} duration={400} direction="left" distance={20}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
        }}
      />
      <div
        style={{
          flex: 1,
          height: 4,
          background: `linear-gradient(90deg, ${color}, ${color}20)`,
          borderRadius: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: "streamFlow 2s linear infinite",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 16,
          color: "#94a3b8",
          fontFamily: "'JetBrains Mono', monospace",
          width: 108,
        }}
      >
        {label}
      </div>
    </div>
  </Fade>
);

const EntityNode = ({
  name,
  color,
  show,
  delay,
  connections = 0,
}: {
  name: string;
  type: string;
  color: string;
  show: boolean;
  delay: number;
  connections?: number;
}) => (
  <Fade show={show} delay={delay} duration={400} direction="none">
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 20px",
        borderRadius: 28,
        background: color + "12",
        border: `1px solid ${color}30`,
        fontSize: 17,
        color: "#e2e8f0",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span>{name}</span>
      {connections > 0 && (
        <span
          style={{
            fontSize: 17,
            color: "#64748b",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ({connections})
        </span>
      )}
    </div>
  </Fade>
);

const MiniSituation = ({
  title,
  signals,
  severity,
  show,
  delay,
}: {
  title: string;
  signals: string;
  severity: "high" | "medium";
  show: boolean;
  delay: number;
}) => (
  <Fade show={show} delay={delay} duration={500}>
    <div
      style={{
        background: "#1a1a2e",
        border: `1px solid ${severity === "high" ? "#ef444430" : "#f59e0b30"}`,
        borderRadius: 14,
        padding: "20px 22px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: severity === "high" ? "#ef4444" : "#f59e0b",
          }}
        />
        <span style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0" }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
        {signals} signals combined
      </div>
    </div>
  </Fade>
);

const StackLayer = ({
  color,
  label,
  active,
  show,
  delay,
}: {
  color: string;
  label: string;
  active: boolean;
  y?: number;
  show: boolean;
  delay: number;
}) => (
  <Fade show={show} delay={delay} duration={500} direction="left" distance={30}>
    <div
      style={{
        height: 70,
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? color + "18" : "#12122a",
        border: `1px solid ${active ? color + "50" : "#2a2a4a"}`,
        transition: "all 0.6s ease",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: active ? color : "#64748b",
          letterSpacing: 1.5,
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  </Fade>
);

function ArchitectureExplainer() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPlayback = useCallback((fromElapsed: number = 0) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (loopTimerRef.current) { clearTimeout(loopTimerRef.current); loopTimerRef.current = null; }
    setElapsed(fromElapsed);
    setPlaying(true);
    startRef.current = Date.now() - fromElapsed;
  }, []);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const now = Date.now() - startRef.current;
    setElapsed(now);
    if (now < TOTAL) rafRef.current = requestAnimationFrame(tick);
    else {
      setPlaying(false);
      startRef.current = null;
      // Loop after 3 seconds
      loopTimerRef.current = setTimeout(() => startPlayback(), 3000);
    }
  }, [startPlayback]);

  // Autoplay on mount
  useEffect(() => {
    startPlayback();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [startPlayback]);

  // Drive animation frame loop when playing
  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);

  let acc = 0,
    currentScene = SCENES[SCENES.length - 1].id,
    currentSceneIndex = SCENES.length - 1;
  for (let i = 0; i < SCENES.length; i++) {
    if (elapsed < acc + SCENES[i].duration) {
      currentScene = SCENES[i].id;
      currentSceneIndex = i;
      break;
    }
    acc += SCENES[i].duration;
  }

  const goToScene = useCallback((index: number) => {
    let target = 0;
    for (let i = 0; i < index; i++) target += SCENES[i].duration;
    startPlayback(target);
  }, [startPlayback]);
  const show = (id: string) => currentScene === id;
  const progress = Math.min(elapsed / TOTAL, 1);

  const fullStackStart = SCENES.slice(0, 6).reduce(
    (a, s) => a + s.duration,
    0,
  );
  const fullStackLocal = elapsed - fullStackStart;
  const activeLayer = show("fullstack")
    ? Math.floor(fullStackLocal / 1000) % 5
    : -1;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#0a0a1a",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
        @keyframes streamFlow { 0% { transform:translateX(-100%); } 100% { transform:translateX(200%); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.025,
          backgroundImage:
            "linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          padding: "0 40px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        {/* INTRO */}
        {show("intro") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={600}>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  letterSpacing: 3,
                  color: "#a855f7",
                  textTransform: "uppercase",
                  marginBottom: 16,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Platform Architecture
              </div>
            </Fade>
            <Fade show delay={600} duration={800}>
              <div
                style={{
                  fontSize: 67,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: -1,
                  marginBottom: 20,
                  lineHeight: 1.15,
                }}
              >
                Five layers.
                <br />
                One intelligence.
              </div>
            </Fade>
            <Fade show delay={1200} duration={800}>
              <div
                style={{
                  fontSize: 24,
                  color: "#94a3b8",
                  maxWidth: 540,
                  margin: "0 auto",
                  lineHeight: 1.7,
                }}
              >
                From raw data ingestion through to autonomous action — a
                continuous loop that gets smarter with every decision.
              </div>
            </Fade>
          </div>
        )}

        {/* LAYER 1: EVENT STREAM */}
        {show("layer1-events") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 50,
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}>
                <LayerLabel number="1" name="Event Stream" color="#3b82f6" />
              </Fade>
              <Fade show delay={500} duration={800}>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  Every action, everywhere
                </div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div
                  style={{
                    fontSize: 22,
                    color: "#94a3b8",
                    lineHeight: 1.7,
                    marginBottom: 20,
                  }}
                >
                  Real-time ingestion from every connected tool. CRM changes,
                  emails, Slack messages, calendar events, payments, document
                  edits — all normalized into a unified event format.
                </div>
              </Fade>
              <Fade show delay={1600} duration={600}>
                <div
                  style={{
                    fontSize: 17,
                    color: "#3b82f6",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "6px 12px",
                    background: "#3b82f610",
                    borderRadius: 6,
                    display: "inline-block",
                  }}
                >
                  3 stream types: Outcomes · Content · Activity
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={500}>
                <div
                  style={{
                    background: "#0f0f24",
                    border: "1px solid #1e1e3a",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      color: "#475569",
                      marginBottom: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Live event streams
                  </div>
                  <StreamLine color="#ef4444" label="Gmail" show delay={800} />
                  <StreamLine color="#e879a0" label="Slack" show delay={1000} />
                  <StreamLine
                    color="#3b82f6"
                    label="HubSpot"
                    show
                    delay={1200}
                  />
                  <StreamLine color="#22c55e" label="Drive" show delay={1400} />
                  <StreamLine
                    color="#6366f1"
                    label="Stripe"
                    show
                    delay={1600}
                  />
                  <StreamLine
                    color="#f59e0b"
                    label="Calendar"
                    show
                    delay={1800}
                  />
                  <Fade show delay={2400} duration={400}>
                    <div
                      style={{
                        borderTop: "1px solid #1e1e3a",
                        marginTop: 12,
                        paddingTop: 10,
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: "#64748b",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        → Normalized → Tagged → Routed to departments
                      </span>
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* LAYER 2: KNOWLEDGE GRAPH */}
        {show("layer2-graph") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 50,
              width: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Fade show delay={400} duration={500}>
                <div
                  style={{
                    background: "#0f0f24",
                    border: "1px solid #1e1e3a",
                    borderRadius: 14,
                    padding: 20,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      color: "#475569",
                      marginBottom: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Entity resolution
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <EntityNode
                      name="Meridian Corp"
                      type="company"
                      color="#6366f1"
                      show
                      delay={800}
                      connections={12}
                    />
                    <EntityNode
                      name="Sarah Chen"
                      type="contact"
                      color="#3b82f6"
                      show
                      delay={1000}
                      connections={8}
                    />
                    <EntityNode
                      name="Deal #892"
                      type="deal"
                      color="#22c55e"
                      show
                      delay={1200}
                      connections={4}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    <EntityNode
                      name="INV-4821"
                      type="invoice"
                      color="#f59e0b"
                      show
                      delay={1400}
                      connections={3}
                    />
                    <EntityNode
                      name="Ticket P2-119"
                      type="ticket"
                      color="#ef4444"
                      show
                      delay={1600}
                      connections={2}
                    />
                  </div>
                  <Fade show delay={2200} duration={400}>
                    <div
                      style={{
                        borderTop: "1px solid #1e1e3a",
                        paddingTop: 10,
                        fontSize: 14,
                        color: "#64748b",
                        fontFamily: "'JetBrains Mono', monospace",
                        textAlign: "center",
                      }}
                    >
                      ML identity resolution • Cross-source merge • Auto-dedup
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}>
                <LayerLabel number="2" name="Knowledge Graph" color="#a855f7" />
              </Fade>
              <Fade show delay={500} duration={800}>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  One customer, everywhere
                </div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div
                  style={{
                    fontSize: 22,
                    color: "#94a3b8",
                    lineHeight: 1.7,
                    marginBottom: 20,
                  }}
                >
                  A HubSpot contact, a Stripe customer, a Gmail sender, and a
                  Slack mention merge into one entity. ML-powered identity
                  resolution connects records across every tool.
                </div>
              </Fade>
              <Fade show delay={1800} duration={600}>
                <div
                  style={{
                    fontSize: 17,
                    color: "#a855f7",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "6px 12px",
                    background: "#a855f710",
                    borderRadius: 6,
                    display: "inline-block",
                  }}
                >
                  Human-built structure · AI-filled data
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* LAYER 3: SITUATION ENGINE */}
        {show("layer3-situations") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 50,
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}>
                <LayerLabel
                  number="3"
                  name="Situation Engine"
                  color="#ef4444"
                />
              </Fade>
              <Fade show delay={500} duration={800}>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  Patterns humans miss
                </div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div
                  style={{
                    fontSize: 22,
                    color: "#94a3b8",
                    lineHeight: 1.7,
                    marginBottom: 20,
                  }}
                >
                  Not simple threshold alerts. Multi-signal, cross-tool
                  patterns: a deal going cold while the rep&apos;s calendar is
                  overloaded and the client&apos;s support tickets are
                  escalating. The kind of connection only a person tracking
                  everything would notice.
                </div>
              </Fade>
              <Fade show delay={2000} duration={600}>
                <div
                  style={{
                    fontSize: 17,
                    color: "#ef4444",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "6px 12px",
                    background: "#ef444410",
                    borderRadius: 6,
                    display: "inline-block",
                  }}
                >
                  Activity patterns · Communication signals · Entity state
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <MiniSituation
                title="Churn risk — Meridian Corp"
                signals="4"
                severity="high"
                show
                delay={800}
              />
              <MiniSituation
                title="Deal stall — Apex renewal"
                signals="3"
                severity="medium"
                show
                delay={1400}
              />
              <MiniSituation
                title="Invoice escalation — #4821"
                signals="2"
                severity="high"
                show
                delay={2000}
              />
              <Fade show delay={3000} duration={400}>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    color: "#64748b",
                    fontFamily: "'JetBrains Mono', monospace",
                    marginTop: 8,
                  }}
                >
                  Continuous scanning · Scored by urgency · Routed by department
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* LAYER 4: REASONING */}
        {show("layer4-reasoning") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 50,
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <Fade show delay={400} duration={500}>
                <div
                  style={{
                    background: "#0f0f24",
                    border: "1px solid #1e1e3a",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      color: "#475569",
                      marginBottom: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Reasoning trace — Meridian Corp
                  </div>
                  {[
                    {
                      step: "Context",
                      text: "Loaded 4 signals, 12 related entities, 3 email threads, meeting history",
                      delay: 800,
                    },
                    {
                      step: "Policy",
                      text: "Checked 2 rules → ALLOW with approval required (amount > $10K)",
                      delay: 1400,
                    },
                    {
                      step: "Action",
                      text: "Personalized outreach recommended — not template (active deals)",
                      delay: 2000,
                    },
                    {
                      step: "Channel",
                      text: "Email preferred — last 5 interactions were email (not phone)",
                      delay: 2600,
                    },
                  ].map((r, i) => (
                    <Fade
                      key={i}
                      show
                      delay={r.delay}
                      duration={400}
                      direction="left"
                      distance={15}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#a855f7",
                            fontFamily: "'JetBrains Mono', monospace",
                            width: 50,
                            flexShrink: 0,
                            paddingTop: 2,
                          }}
                        >
                          {r.step}
                        </div>
                        <div
                          style={{
                            fontSize: 17,
                            color: "#94a3b8",
                            lineHeight: 1.4,
                          }}
                        >
                          {r.text}
                        </div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}>
                <LayerLabel
                  number="4"
                  name="Reasoning Layer"
                  color="#f59e0b"
                />
              </Fade>
              <Fade show delay={500} duration={800}>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  Judgment, not automation
                </div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize: 22, color: "#94a3b8", lineHeight: 1.7 }}>
                  Every action is reasoned from full context — entity history,
                  communication patterns, policy constraints, prior outcomes. The
                  AI doesn&apos;t follow rules. It evaluates the situation and
                  decides.
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* LAYER 5: LEARNING LOOP */}
        {show("layer5-learning") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 50,
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={500}>
                <LayerLabel number="5" name="Learning Loop" color="#22c55e" />
              </Fade>
              <Fade show delay={500} duration={800}>
                <div
                  style={{
                    fontSize: 46,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 16,
                    lineHeight: 1.2,
                  }}
                >
                  Smarter every week
                </div>
              </Fade>
              <Fade show delay={900} duration={800}>
                <div style={{ fontSize: 22, color: "#94a3b8", lineHeight: 1.7 }}>
                  Every approval, rejection, and correction teaches the system.
                  Detection refines, reasoning improves, and trust grows. The
                  platform becomes more useful the longer you use it.
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              <Fade show delay={600} duration={500}>
                <div
                  style={{
                    background: "#0f0f24",
                    border: "1px solid #1e1e3a",
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      color: "#475569",
                      marginBottom: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Feedback loop — last 30 days
                  </div>
                  {[
                    {
                      label: "Situations detected",
                      val: "127",
                      color: "#3b82f6",
                    },
                    { label: "Approved", val: "94", color: "#22c55e" },
                    {
                      label: "Rejected with feedback",
                      val: "18",
                      color: "#ef4444",
                    },
                    {
                      label: "Auto-graduated",
                      val: "3 task types",
                      color: "#a855f7",
                    },
                  ].map((r, i) => (
                    <Fade
                      key={i}
                      show
                      delay={800 + i * 300}
                      duration={400}
                      direction="left"
                      distance={15}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                          padding: "6px 0",
                          borderBottom: "1px solid #1e1e3a",
                        }}
                      >
                        <span style={{ fontSize: 18, color: "#94a3b8" }}>
                          {r.label}
                        </span>
                        <span
                          style={{
                            fontSize: 19,
                            fontWeight: 600,
                            color: r.color,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {r.val}
                        </span>
                      </div>
                    </Fade>
                  ))}
                  <Fade show delay={2400} duration={400}>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 17,
                        color: "#22c55e",
                        marginTop: 8,
                      }}
                    >
                      ↑ Detection accuracy improved 12% this month
                    </div>
                  </Fade>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* FULL STACK */}
        {show("fullstack") && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 60,
              width: "100%",
            }}
          >
            <div style={{ flex: 1 }}>
              <Fade show delay={200} duration={800}>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontFamily: "'Space Grotesk', sans-serif",
                    marginBottom: 20,
                    lineHeight: 1.2,
                  }}
                >
                  One continuous
                  <br />
                  <span style={{ color: "#a855f7" }}>intelligence loop</span>
                </div>
              </Fade>
              <Fade show delay={800} duration={800}>
                <div style={{ fontSize: 22, color: "#94a3b8", lineHeight: 1.7 }}>
                  Data flows in. Knowledge builds. Situations surface. Actions
                  execute. Feedback loops back. Every cycle makes the system
                  smarter.
                </div>
              </Fade>
            </div>
            <div style={{ flex: 1 }}>
              {[
                { label: "Event Stream", color: "#3b82f6" },
                { label: "Knowledge Graph", color: "#a855f7" },
                { label: "Situation Engine", color: "#ef4444" },
                { label: "Reasoning Layer", color: "#f59e0b" },
                { label: "Learning Loop", color: "#22c55e" },
              ].map((l, i) => (
                <StackLayer
                  key={i}
                  label={l.label}
                  color={l.color}
                  active={activeLayer === i}
                  show
                  delay={200 + i * 200}
                />
              ))}
              <Fade show delay={1400} duration={400}>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 22,
                      color: "#a855f7",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  >
                    ↻
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        )}

        {/* CTA */}
        {show("cta") && (
          <div style={{ textAlign: "center" }}>
            <Fade show delay={200} duration={800}>
              <div
                style={{
                  fontSize: 55,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  fontFamily: "'Space Grotesk', sans-serif",
                  marginBottom: 20,
                }}
              >
                Explore the platform
              </div>
            </Fade>
            <Fade show delay={800} duration={600}>
              <div style={{ fontSize: 24, color: "#94a3b8", marginBottom: 36 }}>
                Read the full documentation at qorpera.com/documents
              </div>
            </Fade>
            <Fade show delay={1400} duration={600}>
              <a
                href="/documents"
                style={{
                  display: "inline-block",
                  padding: "12px 36px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Read Documentation
              </a>
            </Fade>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {/* Navigation buttons */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, alignItems: "center", zIndex: 10 }}>
        {currentSceneIndex > 0 && (
          <button onClick={() => goToScene(currentSceneIndex - 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "#1a1a2e", border: "1px solid #2a2a4a", color: "#94a3b8", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            ← Back
          </button>
        )}
        {currentSceneIndex === SCENES.length - 1 ? (
          <a href="/contact" style={{ display: "inline-block", padding: "8px 24px", borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
            Get Qorpera →
          </a>
        ) : (
          <button onClick={() => goToScene(currentSceneIndex + 1)} style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Next →
          </button>
        )}
      </div>

      {playing && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "#1a1a2e",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #a855f7, #6366f1)",
              width: `${progress * 100}%`,
              transition: "width 0.1s linear",
            }}
          />
        </div>
      )}

      {/* Scene indicator */}
      {playing && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            fontSize: 14,
            color: "#2a2a4a",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {currentScene} • {Math.ceil((TOTAL - elapsed) / 1000)}s
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Exported page content                                              */
/* ================================================================== */

export function HowItWorksClient() {
  return <ArchitectureExplainer />;
}
