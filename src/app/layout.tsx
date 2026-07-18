import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { getServerLocale } from "~/lib/i18n/server";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <Providers initialLocale={locale}>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
