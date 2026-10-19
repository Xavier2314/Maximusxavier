"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Play, X } from "lucide-react";
import { providerName, videoEmbedUrl, videoThumbUrl, videoWatchUrl, type FeaturedVideo } from "@/lib/featured";

const OPEN_EVENT = "maximus:featured";
const seenKey = (v: FeaturedVideo) => `maximus-featured-${v.video_id}-${v.updated_at}`;

/** Opens the featured video pop-up from anywhere (sidebar box, Home card). */
export const openFeatured = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Pop-up with the featured video. Shows once per new video if the admin turned pop-up on. */
export function FeaturedPopup({ video }: { video: FeaturedVideo }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!video.popup || pathname.startsWith("/calls")) return;
    let seen = false;
    try { seen = Boolean(localStorage.getItem(seenKey(video))); } catch { /* storage blocked */ }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [video, pathname]);

  function close() {
    setOpen(false);
    try { localStorage.setItem(seenKey(video), "1"); } catch { /* storage blocked */ }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-black/70 p-3 backdrop-blur-sm animate-fade" onClick={close} role="dialog" aria-modal="true" aria-label={video.title}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-brand-navy text-white shadow-2xl ring-1 ring-white/10 animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 truncate font-semibold">{video.title}</p>
          <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" aria-hidden /></button>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe src={videoEmbedUrl(video, true)} title={video.title} className="size-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {video.message && <p className="min-w-0 flex-1 text-sm text-white/80">{video.message}</p>}
          <a href={videoWatchUrl(video)} target="_blank" rel="noopener noreferrer"
            className={`ml-auto inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white hover:opacity-90 ${video.provider === "loom" ? "bg-[#625df5]" : "bg-[#ff0000]"}`}>
            <ExternalLink className="size-4" aria-hidden />Open on {providerName(video)}
          </a>
        </div>
      </div>
    </div>
  );
}

/** Small box in the laptop sidebar. */
export function FeaturedSideBox({ video }: { video: FeaturedVideo }) {
  return (
    <button type="button" onClick={openFeatured} className="group mb-3 block w-full overflow-hidden rounded-2xl bg-white/5 text-left ring-1 ring-white/10 hover:ring-brand-lime/60">
      <span className="relative block aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoThumbUrl(video)} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="size-full object-cover opacity-90 group-hover:opacity-100" />
        <span className="absolute inset-0 grid place-items-center"><span className="grid size-10 place-items-center rounded-full bg-[#ff0000] text-white shadow-lg"><Play className="size-5 translate-x-px" aria-hidden /></span></span>
      </span>
      <span className="block truncate px-3 py-2 text-xs font-semibold text-white/85">▶ {video.title}</span>
    </button>
  );
}

/** The rectangular video box on Home: plays right there, or opens on YouTube. */
export function FeaturedHomeCard({ video }: { video: FeaturedVideo }) {
  const [playing, setPlaying] = useState(false);
  return (
    <section aria-label="Featured video" className="overflow-hidden rounded-[1.5rem] bg-brand-navy text-white shadow-[var(--shadow-card)] ring-1 ring-white/10">
      <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative aspect-video bg-black">
          {playing ? (
            <iframe src={videoEmbedUrl(video, true)} title={video.title} className="absolute inset-0 size-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`Play ${video.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={videoThumbUrl(video)} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="size-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/25 group-hover:bg-black/10">
                <span className="grid size-16 place-items-center rounded-full bg-[#ff0000] text-white shadow-xl"><Play className="size-8 translate-x-0.5" aria-hidden /></span>
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-5">
          <span className="w-fit rounded-full bg-brand-lime px-2.5 py-1 text-xs font-bold text-brand-navy">FEATURED VIDEO</span>
          <p className="text-xl font-bold leading-snug">{video.title}</p>
          {video.message && <p className="text-sm text-white/75">{video.message}</p>}
          <div className="flex flex-wrap gap-2">
            {!playing && <button type="button" onClick={() => setPlaying(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-navy"><Play className="size-4" aria-hidden />Watch here</button>}
            <a href={videoWatchUrl(video)} target="_blank" rel="noopener noreferrer"
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white ${video.provider === "loom" ? "bg-[#625df5]" : "bg-[#ff0000]"}`}><ExternalLink className="size-4" aria-hidden />Open on {providerName(video)}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
