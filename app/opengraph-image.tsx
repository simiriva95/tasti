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
            "radial-gradient(120% 70% at 50% 0%, #4a3818, transparent), linear-gradient(180deg, #1a1512, #0f0c0a)",
          color: "#f0e9db",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 500, letterSpacing: -2, color: "#f0e9db" }}>
          Tasti
        </div>
        <div style={{ fontSize: 38, color: "#d9a95a", marginTop: 14 }}>
          Vedi quali tasti suonare
        </div>
      </div>
    ),
    { ...size }
  );
}
