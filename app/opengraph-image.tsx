import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tasti — vedi quali tasti del pianoforte suonare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background:
            "radial-gradient(120% 70% at 50% 0%, #5a2d7a, transparent), linear-gradient(180deg, #1a1030, #0c0718)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>Tasti</div>
        <div style={{ fontSize: 40, color: "#d8c8ff", marginTop: 12 }}>
          Vedi quali tasti suonare
        </div>
      </div>
    ),
    { ...size }
  );
}
