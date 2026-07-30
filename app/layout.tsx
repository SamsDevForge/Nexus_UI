import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { getNexusPublicRuntimeConfig } from "@/lib/runtime/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtimeConfig = getNexusPublicRuntimeConfig();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider runtimeConfig={runtimeConfig}>{children}</AuthProvider>
      </body>
    </html>
  );
}
