"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Expand } from "lucide-react";

type Photo = { src: string; width: number; height: number; alt: string; caption: string };

/** Editorial photo grid with an accessible lightbox (native <dialog>, keyboard arrows, Esc). */
export function Gallery({ photos }: { photos: Photo[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  const open = (i: number) => { setIndex(i); ref.current?.showModal(); };
  const close = () => { ref.current?.close(); setIndex(null); };
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const layout = ["md:col-span-7 md:row-span-2", "md:col-span-5", "md:col-span-5", "md:col-span-4", "md:col-span-4", "md:col-span-4", "md:col-span-6", "md:col-span-6"];

  return (
    <>
      <div className="grid auto-rows-[240px] gap-3 sm:grid-cols-2 md:grid-cols-12 md:auto-rows-[280px] md:grid-flow-dense">
        {photos.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => open(i)}
            className={`group relative overflow-hidden bg-navy text-left ${layout[i % layout.length]}`}
            aria-label={`Open photo: ${p.caption}`}
          >
            <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
            <span className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent opacity-80" />
            <span className="absolute bottom-0 left-0 flex w-full items-center justify-between p-5 text-white">
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">{p.caption}</span>
              <Expand size={18} aria-hidden="true" className="opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </button>
        ))}
      </div>

      <dialog
        ref={ref}
        onClose={() => setIndex(null)}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-navy-900/95 p-0 text-white backdrop:bg-black/70"
        aria-label="Photo viewer"
      >
        {index !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mist">{photos[index].caption} &nbsp;·&nbsp; {index + 1} / {photos.length}</p>
              <button type="button" onClick={close} className="inline-flex h-11 w-11 items-center justify-center hover:text-red" aria-label="Close photo viewer"><X size={26} /></button>
            </div>
            <div className="relative flex-1">
              <Image src={photos[index].src} alt={photos[index].alt} fill sizes="100vw" className="object-contain" />
            </div>
            <div className="flex justify-center gap-3 p-4 md:p-6">
              <button type="button" onClick={() => step(-1)} className="inline-flex h-12 w-12 items-center justify-center border border-white/30 hover:border-white" aria-label="Previous photo"><ChevronLeft /></button>
              <button type="button" onClick={() => step(1)} className="inline-flex h-12 w-12 items-center justify-center border border-white/30 hover:border-white" aria-label="Next photo"><ChevronRight /></button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
