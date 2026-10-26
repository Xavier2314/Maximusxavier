import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?app=my-rhythm",
    name: "MY RHYTHM",
    short_name: "My Rhythm",
    description: "Structure Your Days. Build Your Future.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f9fd",
    theme_color: "#1d3fae",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quick Add", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Ask AI", url: "/assistant", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Reminder Center", url: "/reminders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
