"use client";
import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, label, summary, select, [role='button'], input[type='checkbox'], input[type='radio'], input[type='file']";

/**
 * Desktop-only cursor effects: a glowing dot with a trailing ring that grows over links and
 * buttons, a burst where you click, and a ripple inside buttons. The normal cursor stays
 * visible. Nothing runs on touch screens or when "reduce motion" is on.
 */
export function CursorEffects() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Ripple inside buttons works for touch and mouse.
    const ripple = (e: PointerEvent) => {
      if (reduce) return;
      const btn = (e.target as Element | null)?.closest?.(".btn") as HTMLElement | null;
      if (!btn || (btn as HTMLButtonElement).disabled) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px`;
      btn.appendChild(s);
      setTimeout(() => s.remove(), 700);
    };
    window.addEventListener("pointerdown", ripple);
    if (!fine || reduce) return () => window.removeEventListener("pointerdown", ripple);

    const root = document.documentElement;
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0;

    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      root.classList.add("cursor-on");
      ring.current?.classList.toggle("is-hover", Boolean((e.target as Element | null)?.closest?.(INTERACTIVE)));
    };
    const leave = () => root.classList.remove("cursor-on");
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ring.current?.classList.add("is-down");
      const b = document.createElement("span");
      b.className = "click-burst";
      b.style.left = `${e.clientX}px`;
      b.style.top = `${e.clientY}px`;
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 650);
    };
    const up = () => ring.current?.classList.remove("is-down");

    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", ripple);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("mouseleave", leave);
      root.classList.remove("cursor-on");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
