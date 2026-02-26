type AgentCharacterFigureProps = {
  variant: "advisor" | "assistant" | "manager";
  tone?: "blue" | "teal" | "amber";
  size?: "sm" | "lg";
  pose?: "wave" | "rest";
};

type C = { shell: string; panel: string; accent: string; soft: string };

const PALETTE: Record<"blue" | "teal" | "amber", C> = {
  blue:  { shell: "#1A2B44", panel: "#1E3A6E", accent: "#7EC3FF", soft: "rgba(126,195,255,0.3)"  },
  teal:  { shell: "#123534", panel: "#165E52", accent: "#3DDFD2", soft: "rgba(61,223,210,0.3)"   },
  amber: { shell: "#2A1C0A", panel: "#48300E", accent: "#FFC14A", soft: "rgba(255,193,74,0.3)"   },
};

export function AgentCharacterFigure({
  variant,
  tone = "blue",
  size = "lg",
  pose = "rest",
}: AgentCharacterFigureProps) {
  const height = size === "lg" ? "h-[240px]" : "h-[180px]";
  const scale  = size === "lg" ? "scale-100" : "scale-[0.8]";
  const c = PALETTE[tone];
  const f = `eye-glow-${variant}`;

  return (
    <div className={`relative mx-auto w-[160px] ${height}`}>
      <div className={`absolute inset-0 origin-bottom ${scale}`}>
        <svg
          viewBox="0 0 160 240"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="xMidYMax meet"
          aria-hidden="true"
        >
          <defs>
            <filter id={f} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <RobotFigure c={c} f={f} pose={pose} />
        </svg>
      </div>
    </div>
  );
}

/* All agents share the same headset robot design — only color differs.
   pose="rest"  → both arms hang at sides  (hired / roster view)
   pose="wave"  → right arm raised          (catalog / available view) */
function RobotFigure({ c, f, pose }: { c: C; f: string; pose: "wave" | "rest" }) {
  return (
    <g>
      {/* Base plate */}
      <rect x="38" y="193" width="84" height="9" rx="4.5" fill={c.shell} opacity="0.7" />

      {/* Headset band (behind head) */}
      <path d="M44 64 Q50 34 80 32 Q110 34 116 64" stroke={c.shell} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Ear cups (behind head) */}
      <rect x="36"  y="52" width="17" height="25" rx="8" fill={c.shell} />
      <rect x="40"  y="57" width="9"  height="15" rx="5" fill={c.accent} opacity="0.75" filter={`url(#${f})`} />
      <rect x="107" y="52" width="17" height="25" rx="8" fill={c.shell} />
      <rect x="111" y="57" width="9"  height="15" rx="5" fill={c.accent} opacity="0.75" filter={`url(#${f})`} />

      {/* Left arm — always at rest */}
      <rect x="28" y="116" width="16" height="58" rx="9" fill={c.shell} />
      <rect x="27" y="171" width="18" height="17" rx="9" fill={c.shell} />

      {/* Right arm */}
      {pose === "wave" ? (
        <>
          <path d="M117 118 Q138 100 142 76" stroke={c.shell} strokeWidth="16" fill="none" strokeLinecap="round" />
          <rect x="134" y="66" width="18" height="18" rx="10" fill={c.shell} />
        </>
      ) : (
        <>
          <rect x="116" y="116" width="16" height="58" rx="9" fill={c.shell} />
          <rect x="115" y="171" width="18" height="17" rx="9" fill={c.shell} />
        </>
      )}

      {/* Body */}
      <rect x="46" y="110" width="68" height="82" rx="20" fill={c.shell} stroke={c.accent} strokeOpacity="0.12" strokeWidth="1.5" />
      <rect x="54" y="124" width="52" height="50" rx="14" fill={c.panel} />

      {/* Chest: dot grid */}
      <circle cx="67" cy="136" r="4.5" fill={c.accent} opacity="0.92" filter={`url(#${f})`} />
      <circle cx="80" cy="136" r="4.5" fill={c.accent} opacity="0.5" />
      <circle cx="93" cy="136" r="4.5" fill={c.accent} opacity="0.2" />

      <circle cx="67" cy="151" r="4.5" fill={c.accent} opacity="0.55" />
      <circle cx="80" cy="151" r="4.5" fill={c.accent} opacity="0.95" filter={`url(#${f})`} />
      <circle cx="93" cy="151" r="4.5" fill={c.accent} opacity="0.72" />

      <circle cx="67" cy="166" r="4.5" fill={c.accent} opacity="0.18" />
      <circle cx="80" cy="166" r="4.5" fill={c.accent} opacity="0.42" />
      <circle cx="93" cy="166" r="4.5" fill={c.accent} opacity="0.68" />

      {/* Neck */}
      <rect x="72" y="96" width="16" height="14" rx="7" fill={c.shell} />

      {/* Head (on top of ear cups) */}
      <rect x="50" y="38" width="60" height="58" rx="22" fill={c.shell} stroke={c.accent} strokeOpacity="0.18" strokeWidth="1.5" />
      {/* Face plate */}
      <rect x="55" y="43" width="50" height="48" rx="16" fill={c.panel} />

      {/* Cheek glow */}
      <circle cx="60" cy="71" r="10" fill={c.soft} />
      <circle cx="100" cy="71" r="10" fill={c.soft} />

      {/* Eyes */}
      <ellipse cx="69" cy="61" rx="10" ry="8" fill={c.accent} filter={`url(#${f})`} />
      <ellipse cx="91" cy="61" rx="10" ry="8" fill={c.accent} filter={`url(#${f})`} />

      {/* Smile */}
      <path d="M67 76 Q80 86 93 76" stroke={c.accent} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.8" />

      {/* Mic boom + capsule */}
      <path d="M44 71 Q36 80 36 91" stroke={c.shell} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="31" y="88" width="10" height="8" rx="3.5" fill={c.shell} />
      <circle cx="36" cy="92" r="3" fill={c.accent} opacity="0.95" filter={`url(#${f})`} />
    </g>
  );
}
