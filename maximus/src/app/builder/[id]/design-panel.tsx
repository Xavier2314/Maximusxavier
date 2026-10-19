"use client";

import { Check, Moon, Sun } from "lucide-react";
import { StyleThumb } from "@/components/funnels/style-thumb";
import { STYLES } from "@/lib/funnel-styles";
import { STYLE_KEYS, type FunnelPage, type FunnelTheme } from "@/lib/funnels";

const SWATCHES = ["#2563eb", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#d97706", "#16a34a", "#0d9488", "#0891b2", "#0f172a"];

export function DesignPanel({ theme, page, onTheme }: { theme: FunnelTheme; page: FunnelPage; onTheme: (t: FunnelTheme) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold">Choose a look</p>
        <p className="mt-0.5 text-xs text-fg-subtle">Your words stay the same. Only the design changes, so try them all.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {STYLE_KEYS.map((k) => {
            const on = theme.style === k;
            return (
              <button key={k} type="button" onClick={() => onTheme({ style: k, accent: STYLES[k].accent, mode: STYLES[k].mode })}
                className={`overflow-hidden rounded-2xl border-2 text-left transition ${on ? "border-primary shadow-md" : "border-border hover:border-fg-subtle"}`}>
                <StyleThumb styleKey={k} page={page} />
                <div className="flex items-start justify-between gap-2 border-t border-border bg-surface p-2.5">
                  <span><span className="block text-sm font-semibold">{STYLES[k].name}</span><span className="line-clamp-2 text-[11px] text-fg-subtle">{STYLES[k].blurb}</span></span>
                  {on && <Check className="size-4 shrink-0 text-primary" aria-label="Selected" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold">Your brand colour</p>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={`Use colour ${c}`} onClick={() => onTheme({ ...theme, accent: c })}
              className="size-8 rounded-full border-2" style={{ background: c, borderColor: theme.accent.toLowerCase() === c ? "var(--fg)" : "transparent" }} />
          ))}
          <label className="inline-flex items-center gap-2 text-xs text-fg-muted">Custom
            <input type="color" value={theme.accent} onChange={(e) => onTheme({ ...theme, accent: e.target.value })} className="h-8 w-10 cursor-pointer rounded-lg border border-border" />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold">Light or dark</p>
        <div className="inline-flex rounded-xl bg-surface-muted p-1 text-sm">
          {([["light", "Light", Sun], ["dark", "Dark", Moon]] as const).map(([m, l, Icon]) => (
            <button key={m} type="button" onClick={() => onTheme({ ...theme, mode: m })} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${theme.mode === m ? "bg-surface shadow-sm" : "text-fg-muted"}`}><Icon className="size-4" />{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
