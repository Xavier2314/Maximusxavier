"use client";

import { useEffect } from "react";

const editable = (el: Element | null) =>
  !!el && (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable ||
    (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "range", "submit", "file", "color"].includes(el.type)));

/**
 * Keeps bottom bars on the real bottom of the screen. iPhone browsers can leave
 * fixed elements floating mid-screen after the keyboard closes; this measures
 * the visible area and nudges them back, and hides them while typing.
 */
export function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const h = root.clientHeight;
        const typing = editable(document.activeElement) && h - vv.height > 120;
        root.toggleAttribute("data-typing", typing);
        const zoomed = Math.abs(vv.scale - 1) > 0.01;
        const shift = typing || zoomed ? 0 : Math.round(vv.offsetTop + vv.height - h);
        root.style.setProperty("--vv-shift", `${Math.abs(shift) < 2 ? 0 : shift}px`);
      });
    };
    // After the keyboard closes, a no-op scroll makes the browser re-place fixed bars.
    const onBlur = () => setTimeout(() => { window.scrollTo(window.scrollX, window.scrollY); update(); }, 60);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("scroll", update, { passive: true });
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", onBlur);
    update();
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);
  return null;
}
