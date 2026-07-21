import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Display: high-contrast didone, concert-poster elegance. Body: warm, quiet humanist sans.
const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Hanken_Grotesk({
  variable: "--font-sans-hd",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tasti — vedi quali tasti suonare",
    template: "%s · Tasti",
  },
  description:
    "Carica un file MIDI, uno spartito MusicXML o un PDF e scopri, sulla tastiera del pianoforte, quali tasti premere per ogni accordo. Senza teoria musicale.",
  keywords: [
    "pianoforte",
    "imparare piano",
    "spartito",
    "MIDI",
    "MusicXML",
    "accordi pianoforte",
    "synthesia",
    "quali tasti suonare",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Tasti",
    title: "Tasti — vedi quali tasti suonare",
    description:
      "Carica MIDI, MusicXML o PDF e guarda quali tasti del pianoforte premere. Note stile Synthesia, accordi riconosciuti.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tasti — vedi quali tasti suonare",
    description:
      "Carica MIDI, MusicXML o PDF e guarda quali tasti del pianoforte premere.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
