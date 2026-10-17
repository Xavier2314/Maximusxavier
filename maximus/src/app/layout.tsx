import type { Metadata, Viewport } from "next";
import { Jost } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import "./globals.css";

// Futura is the brand typeface (licensed). Jost is a free, near-identical
// geometric sans used on the web. Swap in Futura webfont files here if licensed.
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint to avoid a light/dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('mx-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jost.variable} suppressHydrationWarning>
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
