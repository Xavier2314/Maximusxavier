"use client";

import { useEffect, useRef, useState } from "react";
import { FunnelView } from "@/components/funnels/funnel-view";
import { STYLES } from "@/lib/funnel-styles";
import { newBlock, type FunnelBlock, type FunnelPage, type StyleKey } from "@/lib/funnels";

const FULL = 880; // width the page is laid out at before it is scaled down

/** A small live picture of a page in a style, so people choose by eye. */
export function StyleThumb({ styleKey, page, height = 176 }: { styleKey: StyleKey; page: FunnelPage; height?: number }) {
  const st = STYLES[styleKey];
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / FULL);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const blocks: FunnelBlock[] = page.blocks.filter((b) => ["hero", "benefits", "product", "cta"].includes(b.type)).slice(0, 3);
  const show = blocks.length ? blocks : [newBlock("hero"), newBlock("benefits")];
  return (
    <div ref={box} className="pointer-events-none relative w-full select-none overflow-hidden" style={{ height }} aria-hidden>
      <div style={{ width: FULL, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <FunnelView slug="preview" theme={{ style: styleKey, accent: st.accent, mode: st.mode }} page={{ ...page, blocks: show }} preview />
      </div>
    </div>
  );
}
