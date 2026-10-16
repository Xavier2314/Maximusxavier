import type { Metadata, Viewport } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", style: ["normal", "italic"] });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Accelerating people. Building leaders.`, template: `%s | ${site.name}` },
  description: site.shortDescription,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_NG", title: site.name, description: site.shortDescription },
  twitter: { card: "summary_large_image", title: site.name, description: site.shortDescription },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0B1E3F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${playfair.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
