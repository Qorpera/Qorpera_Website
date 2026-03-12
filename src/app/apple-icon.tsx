import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex" }}>
        <svg
          viewBox="0 0 220 220"
          width="180"
          height="180"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <circle cx="110" cy="110" r="108" fill="#111118" />

          {/* Core */}
          <rect x="93" y="93" width="34" height="34" rx="3" stroke="white" strokeWidth="6" fill="none" />
          <rect x="101" y="101" width="18" height="18" rx="2" fill="white" />

          {/* Top T-fork */}
          <path d="M110 93 L110 51 L72 29" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M110 93 L110 51 L148 29" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <rect x="62" y="21" width="20" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />
          <rect x="138" y="21" width="20" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />

          {/* Right T-fork */}
          <path d="M127 110 L169 110 L191 78" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M127 110 L169 110 L191 142" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <rect x="183" y="70" width="16" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />
          <rect x="183" y="134" width="16" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />

          {/* Bottom T-fork */}
          <path d="M110 127 L110 169 L72 191" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M110 127 L110 169 L148 191" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <rect x="62" y="183" width="20" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />
          <rect x="138" y="183" width="20" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />

          {/* Left T-fork */}
          <path d="M93 110 L51 110 L29 78" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <path d="M93 110 L51 110 L29 142" stroke="white" strokeWidth="6" strokeLinecap="round" />
          <rect x="21" y="70" width="16" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />
          <rect x="21" y="134" width="16" height="16" rx="5" stroke="white" strokeWidth="5" fill="none" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
