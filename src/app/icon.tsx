import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, display: "flex" }}>
        <svg
          viewBox="0 0 100 100"
          width="32"
          height="32"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          {/* Core */}
          <rect x="41" y="41" width="18" height="18" rx="2" fill="#111118" />

          {/* Top T-fork */}
          <path d="M50 41 L50 20 L33 9" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 41 L50 20 L67 9" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="33" cy="9" r="4.5" fill="#111118" />
          <circle cx="67" cy="9" r="4.5" fill="#111118" />

          {/* Right T-fork */}
          <path d="M59 50 L80 50 L91 35" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M59 50 L80 50 L91 65" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="91" cy="35" r="4.5" fill="#111118" />
          <circle cx="91" cy="65" r="4.5" fill="#111118" />

          {/* Bottom T-fork */}
          <path d="M50 59 L50 80 L33 91" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 59 L50 80 L67 91" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="33" cy="91" r="4.5" fill="#111118" />
          <circle cx="67" cy="91" r="4.5" fill="#111118" />

          {/* Left T-fork */}
          <path d="M41 50 L20 50 L9 35" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M41 50 L20 50 L9 65" stroke="#111118" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="9" cy="35" r="4.5" fill="#111118" />
          <circle cx="9" cy="65" r="4.5" fill="#111118" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
