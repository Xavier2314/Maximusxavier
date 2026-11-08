import type { Metadata, Viewport } from "next";
import { Inter, Manjari } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import "./globals.css";

// Inter for reading text; Manjari, round and soft, for headings and big figures.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manjari = Manjari({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-manjari", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Maximus", template: "%s · Maximus" },
  description: "Fulfilment in maximized potential — team growth, attendance, goals and leadership in one place.",
  applicationName: "Maximus",
  appleWebApp: { capable: true, title: "Maximus", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/brand/logo-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Light is the default; members can switch to dark with the toggle. Applied before first paint.
const themeScript = `(function(){try{var t=localStorage.getItem('mx-theme-v3');var d=t==='dark';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manjari.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
