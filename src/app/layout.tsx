import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { Providers } from "./providers";
import { RegisterSW } from "./RegisterSW";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SariHub",
  description: "Palengke-on-Wheels para sa mga sari-sari store.",
  applicationName: "SariHub",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF7F2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tl" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
