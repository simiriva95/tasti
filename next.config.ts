import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Soundfont CDNs used by smplr (audio samples). GitHub OAuth is a full-page
// redirect (no iframe/XHR), so it needs no CSP host beyond avatar images.
const SOUND_CDN = "https://gleitz.github.io https://smpldsnds.github.io https://goldst.dev";

const csp = [
  `default-src 'self'`,
  // Next.js needs inline runtime; dev also needs eval. wasm for audio libs.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://avatars.githubusercontent.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${SOUND_CDN}`,
  `media-src 'self' blob: data: ${SOUND_CDN}`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Keep pdfjs out of the server bundle (used only by the dev-only local OMR
  // fallback in lib/omrLocal.ts; its worker resolves from node_modules).
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
