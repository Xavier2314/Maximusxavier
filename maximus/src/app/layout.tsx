import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import "./globals.css";

// Jost, the web stand-in for the brand's Futura.
const jost = Jost({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

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
    { color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Dark is the default; members can switch to light with the toggle. Applied before first paint.
const themeScript = `(function(){try{var t=localStorage.getItem('mx-theme-v2');var d=t!=='light';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jost.variable} dark`} suppressHydrationWarning>
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
