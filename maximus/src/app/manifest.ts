import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Maximus — Fulfilment in maximized potential",
    short_name: "Maximus",
    description: "Team growth, attendance, goals, evaluations and leadership for the Maximus organisation.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    shortcuts: [
      { name: "Check in", url: "/attendance", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Daily planner", url: "/planner", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Maximus Bank", url: "/bank", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tools", url: "/tools", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
