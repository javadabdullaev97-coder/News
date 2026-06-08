import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "LEAP — Новости, которые опережают";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          padding: 80,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 180,
              height: 180,
              background: "#FF4D2E",
              borderRadius: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="140" height="140" viewBox="0 0 64 64">
              <path
                d="M 14 18 L 28 32 L 14 46"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 30 18 L 44 32 L 30 46"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <div
            style={{
              color: "white",
              fontSize: 180,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1,
            }}
          >
            LEAP
          </div>
        </div>
        <div
          style={{
            color: "#a3a3a3",
            fontSize: 44,
            letterSpacing: "-0.01em",
          }}
        >
          Новости, которые опережают
        </div>
      </div>
    ),
    size,
  );
}
