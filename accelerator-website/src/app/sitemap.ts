import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/about", "/vision", "/founder", "/events", "/events/register", "/sponsorship", "/contact", "/privacy", "/terms", "/refunds"];
  return pages.map((p) => ({ url: `${site.url}${p}`, lastModified: new Date(), changeFrequency: p === "/events" ? "daily" : "monthly", priority: p === "" ? 1 : p === "/events" ? 0.9 : 0.6 }));
}
