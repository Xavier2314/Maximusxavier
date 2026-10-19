"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitFunnelLeadAction } from "@/app/f/actions";
import type { FunnelBlock } from "@/lib/funnels";

type FormBlock = Extract<FunnelBlock, { type: "lead_form" | "order_form" }>;

const field = "w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-3 text-[15px] text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-2 focus:outline-offset-1";

/** Lead / order form on a public funnel page. In the editor (`preview`) it looks real but sends nothing. */
export function FunnelForm({
  block, slug, pageId, nextHref, whatsapp, accent, onAccent, preview,
}: { block: FormBlock; slug: string; pageId: string; nextHref?: string; whatsapp?: string; accent: string; onAccent: string; preview?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ name: string; qty: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOrder = block.type === "order_form";

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
    const wa = whatsapp && isOrder
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I just ordered ${(block as Extract<FormBlock, { type: "order_form" }>).productName || "your product"} (x${done.qty}). My name is ${done.name}.`)}`
      : null;
    return (
      <div role="status" className="rounded-2xl bg-[#ecfdf5] p-5 text-[#065f46]">
        <p className="font-semibold">{block.successMessage || "Thank you!"}</p>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: accent, color: onAccent }}>Message us on WhatsApp</a>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      {/* Honeypot: real people never fill this in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" required maxLength={120} placeholder="Your name" autoComplete="name" className={field} style={{ outlineColor: accent }} />
      {isOrder ? (
        <>
          <input name="phone" required maxLength={40} placeholder="Phone / WhatsApp number" autoComplete="tel" inputMode="tel" className={field} style={{ outlineColor: accent }} />
          <input name="email" type="email" maxLength={254} placeholder="Email (optional)" autoComplete="email" className={field} style={{ outlineColor: accent }} />
          <textarea name="message" rows={2} maxLength={600} placeholder="Delivery address and any notes" className={field} style={{ outlineColor: accent }} />
          <label className="flex items-center gap-3 text-sm text-[#475569]">Quantity
            <input name="quantity" type="number" min={1} max={99} defaultValue={1} className={`${field} !w-24`} style={{ outlineColor: accent }} />
          </label>
        </>
      ) : (
        <>
          <input name="email" type="email" required maxLength={254} placeholder="Email address" autoComplete="email" className={field} style={{ outlineColor: accent }} />
          {(block as Extract<FormBlock, { type: "lead_form" }>).askPhone && <input name="phone" maxLength={40} placeholder="Phone / WhatsApp number" autoComplete="tel" inputMode="tel" className={field} style={{ outlineColor: accent }} />}
          {(block as Extract<FormBlock, { type: "lead_form" }>).askMessage && <textarea name="message" rows={3} maxLength={600} placeholder="Message" className={field} style={{ outlineColor: accent }} />}
        </>
      )}
      {error && <p role="alert" className="text-sm text-[#b91c1c]">{error}</p>}
      <button type="submit" disabled={pending} className="h-13 w-full rounded-xl px-5 py-3.5 text-base font-semibold transition-opacity disabled:opacity-60" style={{ background: accent, color: onAccent }}>
        {pending ? "Sending…" : block.buttonText || (isOrder ? "Order now" : "Send")}
      </button>
    </form>
  );
}

/** Counts down to a date the owner picked. Shows nothing if no date is set. */
export function Countdown({ label, endsAt, accent }: { label: string; endsAt: string; accent: string }) {
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!Number.isFinite(end)) return <p className="text-center text-sm text-[#64748b]">Pick an end date to show the countdown.</p>;
  const left = Math.max(0, end - (now ?? Date.now()));
  const parts = [["Days", Math.floor(left / 86_400_000)], ["Hours", Math.floor(left / 3_600_000) % 24], ["Min", Math.floor(left / 60_000) % 60], ["Sec", Math.floor(left / 1000) % 60]] as const;
  return (
    <div className="text-center">
      {label && <p className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-80">{label}</p>}
      {left === 0 && now !== null ? <p className="text-lg font-bold">This offer has ended.</p> : (
        <div className="flex justify-center gap-3">
          {parts.map(([k, v]) => (
            <div key={k} className="min-w-16 rounded-2xl px-3 py-3 text-white" style={{ background: accent }}>
              <div className="text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
              <div className="text-[11px] uppercase tracking-wide opacity-80">{k}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
