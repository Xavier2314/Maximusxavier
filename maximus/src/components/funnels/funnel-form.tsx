"use client";

import { useEffect, useState, useTransition, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitFunnelLeadAction } from "@/app/f/actions";
import type { FunnelBlock } from "@/lib/funnels";

type FormBlock = Extract<FunnelBlock, { type: "lead_form" | "order_form" }>;

/** Colours and shapes the funnel style gives the form (so it matches the page in every look). */
export type FormUi = {
  inputBg: string; text: string; border: string; accent: string; btnBg: string; btnText: string; btnStyle: CSSProperties; mute: string; radius: number; neo: boolean;
};

/** Lead / order form on a public funnel page. In the builder (`preview`) it looks real but sends nothing. */
export function FunnelForm({
  block, slug, pageId, nextHref, whatsapp, ui, preview, editLabels,
}: {
  block: FormBlock; slug: string; pageId: string; nextHref?: string; whatsapp?: string; ui: FormUi; preview?: boolean;
  /** Builder only: lets the seller retype the button and success message on the page. */
  editLabels?: { onText: (path: (string | number)[], value: string) => void };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ name: string; qty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOrder = block.type === "order_form";
  const order = block.type === "order_form" ? block : null;
  const lead = block.type === "lead_form" ? block : null;

  const field: CSSProperties = { width: "100%", background: ui.inputBg, color: ui.text, border: `${ui.neo ? 2 : 1}px solid ${ui.border}`, borderRadius: ui.radius, padding: "0.8rem 1rem", fontSize: 15, outlineColor: ui.accent };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) { setError("Preview only. Publish the funnel to take real orders."); return; }
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await submitFunnelLeadAction(slug, pageId, block.id, fd);
      if (!res.ok) { setError(res.message); return; }
      form.reset();
      if (nextHref) { router.push(nextHref); return; }
      setDone({ name: String(fd.get("name") ?? ""), qty: Number(fd.get("quantity") ?? 1) || 1 });
    });
  }

  if (done) {
    const wa = whatsapp && order
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I just ordered ${order.productName || "your product"} (x${done.qty}). My name is ${done.name}.`)}`
      : null;
    return (
      <div role="status" className="rounded-2xl p-5" style={{ background: "#ecfdf5", color: "#065f46" }}>
        <p className="font-semibold">{block.successMessage || "Thank you!"}</p>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#16a34a", color: "#fff" }}>Message us on WhatsApp</a>}
      </div>
    );
  }

  const label = block.buttonText || (isOrder ? "Order now" : "Send");
  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      {/* Honeypot: real people never fill this in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" required maxLength={120} placeholder="Your name" autoComplete="name" style={field} />
      {order ? (
        <>
          <input name="phone" required maxLength={40} placeholder="Phone / WhatsApp number" autoComplete="tel" inputMode="tel" style={field} />
          <input name="email" type="email" maxLength={254} placeholder="Email (optional)" autoComplete="email" style={field} />
          <textarea name="message" rows={2} maxLength={600} placeholder="Delivery address and any notes" style={field} />
          <label className="flex items-center gap-3 text-sm" style={{ color: ui.mute }}>Quantity
            <input name="quantity" type="number" min={1} max={99} defaultValue={1} style={{ ...field, width: 96 }} />
          </label>
          {order.bumpText && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3.5 text-sm" style={{ border: `2px dashed ${ui.accent}`, background: ui.inputBg, color: ui.text, borderRadius: ui.radius }}>
              <input type="checkbox" name="bump" className="mt-1 size-5 shrink-0" style={{ accentColor: ui.accent }} />
              <span><strong>Yes, add this to my order{order.bumpPrice ? ` (${order.bumpPrice})` : ""}.</strong><br />{order.bumpText}</span>
            </label>
          )}
        </>
      ) : (
        <>
          <input name="email" type="email" required maxLength={254} placeholder="Email address" autoComplete="email" style={field} />
          {lead?.askPhone && <input name="phone" maxLength={40} placeholder="Phone / WhatsApp number" autoComplete="tel" inputMode="tel" style={field} />}
          {lead?.askMessage && <textarea name="message" rows={3} maxLength={600} placeholder="Tell us a little about you" style={field} />}
        </>
      )}
      {error && <p role="alert" className="text-sm" style={{ color: "#dc2626" }}>{error}</p>}
      {editLabels ? (
        <div role="presentation" className="w-full" style={{ ...ui.btnStyle, width: "100%" }}>
          <span contentEditable suppressContentEditableWarning spellCheck data-ph="Button text" className="cursor-text outline-none empty:before:opacity-50 empty:before:content-[attr(data-ph)]"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
            onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v !== block.buttonText) editLabels.onText(["buttonText"], v); }}>{label}</span>
        </div>
      ) : (
        <button type="submit" disabled={pending} className="w-full transition-opacity disabled:opacity-60" style={{ ...ui.btnStyle, width: "100%" }}>{pending ? "Sending…" : label}</button>
      )}
    </form>
  );
}

/** Counts down to a date the owner picked. */
export function Countdown({ label, endsAt, bg, color, radius, text }: { label: string; endsAt: string; bg: string; color: string; radius: number; text: string }) {
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!Number.isFinite(end)) return <p className="text-center text-sm opacity-70" style={{ color: text }}>Pick an end date in the settings panel to show the countdown.</p>;
  const left = Math.max(0, end - (now ?? Date.now()));
  const parts = [["Days", Math.floor(left / 86_400_000)], ["Hours", Math.floor(left / 3_600_000) % 24], ["Min", Math.floor(left / 60_000) % 60], ["Sec", Math.floor(left / 1000) % 60]] as const;
  return (
    <div className="text-center" style={{ color: text }}>
      {label && <p className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-80">{label}</p>}
      {left === 0 && now !== null ? <p className="text-lg font-bold">This offer has ended.</p> : (
        <div className="flex justify-center gap-3">
          {parts.map(([k, v]) => (
            <div key={k} className="min-w-16 px-3 py-3" style={{ background: bg, color, borderRadius: radius }}>
              <div className="text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
              <div className="text-[11px] uppercase tracking-wide opacity-80">{k}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A date shown in the visitor's own time zone (rendered after load so server and browser agree). */
export function LocalDate({ iso }: { iso: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    if (Number.isFinite(d.getTime())) setText(d.toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }));
  }, [iso]);
  return <span suppressHydrationWarning>{text || " "}</span>;
}
