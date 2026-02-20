import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "News Factory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          background: "radial-gradient(ellipse at center, #111113 0%, #09090b 70%)",
        }}
      >
        <svg width="72" height="72" viewBox="0 0 32 32">
          <title>News Factory</title>
          <rect width="32" height="32" rx="8" fill="#18181b" />
          <path d="M8 25V7h3l10 13V7h3v18h-3L11 12v13H8z" fill="white" />
        </svg>

        <div
          style={{
            display: "flex",
            fontSize: 52,
            fontWeight: 300,
            color: "white",
            letterSpacing: "0.3em",
            marginTop: 40,
          }}
        >
          NEWS FACTORY
        </div>

        <div
          style={{
            display: "flex",
            width: 120,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.12)",
            marginTop: 24,
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.15em",
            marginTop: 20,
          }}
        >
          AI NEWS PLATFORM
        </div>
      </div>
    ),
    { ...size },
  );
}
