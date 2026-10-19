"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Anim } from "@/lib/funnels";

/** Fades/slides content in when it scrolls into view. Respects reduced-motion (CSS) and never hides content without JavaScript (noscript rule). */
export function Reveal({ anim, children }: { anim: Exclude<Anim, "none">; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVis(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVis(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`fv-a fv-a-${anim} ${vis ? "fv-vis" : ""}`}>{children}</div>;
}

/** Main product photo with a row of thumbnails to switch between all the photos. */
export function ProductGallery({ images, alt, radius, accent }: { images: string[]; alt: string; radius: number; accent: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [];
  const cur = list[Math.min(i, list.length - 1)];
  if (!cur) return null;
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cur} alt={alt} className="aspect-square w-full object-cover" style={{ borderRadius: radius }} />
      {list.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {list.map((u, n) => (
            <button key={u + n} type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i}
              className="overflow-hidden transition-opacity" style={{ borderRadius: Math.min(radius, 12), outline: n === i ? `2px solid ${accent}` : "none", outlineOffset: 2, opacity: n === i ? 1 : 0.65 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="aspect-square w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AD_KEY = "funnel-ad-source";

/** Remembers which ad brought the visitor (from the tagged link), so the order or lead can say so even after they move to another page. */
export function AdSourceCapture() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const src = q.get("utm_source");
      if (src) sessionStorage.setItem(AD_KEY, [src, q.get("utm_campaign") ?? "", q.get("utm_content") ?? ""].join("/").slice(0, 80));
    } catch { /* storage blocked: the lead is still saved, just without the ad tag */ }
  }, []);
  return null;
}

export function readAdSource(): string {
  try { return sessionStorage.getItem(AD_KEY) ?? ""; } catch { return ""; }
}
