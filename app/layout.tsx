import type { Metadata, Viewport } from "next";
import {
  Archivo_Black,
  Geist,
  Geist_Mono,
  Russo_One,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rigidDisplay = Russo_One({
  variable: "--font-rigid-display",
  subsets: ["latin"],
  weight: "400",
});

const drukWide = Archivo_Black({
  variable: "--font-druk-wide",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "NEXUS AI — Predictive Personal Intelligence",
    template: "%s · NEXUS AI",
  },
  description:
    "An intelligent personal layer that connects routines, understands context and acts before interruptions happen.",
  icons: {
    icon: "/nexus-logo.svg?v=1",
    shortcut: "/nexus-logo.svg?v=1",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080a0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rigidDisplay.variable} ${drukWide.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
