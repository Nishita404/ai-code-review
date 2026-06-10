import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Code Review Platform",
  description: "Paste code, detect the language, and prepare AI-powered code reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(255,195,113,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(110,231,183,0.16),_transparent_24%),linear-gradient(180deg,_#fffdf8_0%,_#f7f3eb_48%,_#f1efe8_100%)] text-slate-950">
        {children}
      </body>
    </html>
  );
}