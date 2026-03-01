import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e1418",
          borderRadius: 36,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="120"
          height="120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="38"
            cy="50"
            r="26"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeOpacity="0.9"
          />
          <polygon
            points="56,44 98,38 98,42 56,52"
            fill="white"
            fillOpacity="0.85"
          />
          <polygon
            points="52,38 95,28 95,30 52,42"
            fill="white"
            fillOpacity="0.4"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
