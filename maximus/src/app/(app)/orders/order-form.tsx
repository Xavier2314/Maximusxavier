"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { AiFilledBanner, ModeTabs, TalkToAi, type FormMode } from "@/components/form-modes";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { VoiceTextarea } from "@/components/voice";
import { arrangeAction } from "../ai/arrange-actions";
import { recordOrderAction } from "./actions";

export const CATEGORIES = ["Wellness", "Nutrition", "Personal care", "Beauty", "Home care", "Accessories", "Other"];
export const PLATFORMS = [
  { value: "fiverr", label: "Fiverr" },
  { value: "upwork", label: "Upwork" },
  { value: "freelance_other", label: "Other freelance / client work" },
  { value: "product", label: "Product sale" },
  { value: "other", label: "Other" },
] as const;

export function OrderForm({ members, selfId, today, hasLeaders }: { members: { id: string; name: string }[]; selfId: string; today: string; hasLeaders: boolean }) {
  const [state, action] = useActionState(recordOrderAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const [platform, setPlatform] = useState("fiverr");
  const [fileName, setFileName] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<FormMode>("ai");
  const [prefill, setPrefill] = useState<Record<string, string | number> | null>(null);
  const e = state?.errors ?? {};
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setFileName(null); setPlatform("fiverr"); setPrefill(null); setRound((r) => r + 1); } }, [state]);
  const pv = (k: string, d = "") => String(prefill?.[k] ?? d);
  const full = mode === "form";

  return (
    <div className="space-y-4">
    <ModeTabs mode={mode} onChange={setMode} />
    {mode === "ai" ? (
      <TalkToAi arrange={(t) => arrangeAction("order", t)}
        placeholder="e.g. I got a 45k logo design job on Fiverr yesterday from a client called Tunde, already delivered…"
        onArranged={(data) => { setPrefill(data as Record<string, string | number>); if (data.platform) setPlatform(String(data.platform)); setRound((r) => r + 1); setMode("form"); }} />
    ) : (
    <form key={`${mode}-${round}`} ref={ref} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {prefill && full && <AiFilledBanner />}
      {members.length > 0 ? (
        <Field label="Attributed to" htmlFor="member_id" error={e.member_id}>
          <Select id="member_id" name="member_id" defaultValue={selfId}>
            <option value={selfId}>Me</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      ) : <input type="hidden" name="member_id" value={selfId} />}
      <Field label="Where is the order from?" htmlFor="platform" error={e.platform}>
        <Select id="platform" name="platform" value={platform} onChange={(ev) => setPlatform(ev.target.value)}>
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </Field>
      <Field label="Describe the order" htmlFor="description" error={e.description}
        hint="Type or tap Speak: the service or product, the client, anything worth knowing.">
        <VoiceTextarea id="description" name="description" rows={full ? 3 : 6} maxLength={2000} defaultValue={pv("description")}
          placeholder={platform === "product" ? "e.g. 2 packs of the detox tea for Mrs Ade" : "e.g. Logo design for a bakery in Lekki, 3 revisions, delivered in 2 days"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" htmlFor="amount" error={e.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0" className="pl-8" required defaultValue={pv("amount")} />
          </div>
        </Field>
        {full && <Field label="Client / customer" htmlFor="customer_name" optional>
          <Input id="customer_name" name="customer_name" placeholder="Name or username" maxLength={120} defaultValue={pv("customer_name")} />
        </Field>}
        {full && platform === "product" && (
          <>
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category" defaultValue="">
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Business volume" htmlFor="business_volume" optional error={e.business_volume}>
              <Input id="business_volume" name="business_volume" inputMode="decimal" placeholder="BV" />
            </Field>
          </>
        )}
        {!full && <input type="hidden" name="status" value="confirmed" />}
        {full && <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={pv("status", "confirmed")}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed / in progress</option>
            <option value="delivered">Delivered / completed</option>
          </Select>
        </Field>}
        <Field label="Order date" htmlFor="order_date" error={e.order_date}>
          <Input id="order_date" name="order_date" type="date" max={today} defaultValue={pv("order_date", today)} />
        </Field>
      </div>
      <Field label="Screenshot or file" htmlFor="attachment" optional error={e.attachment} hint="Screenshot of the order (JPG, PNG, WebP or PDF, up to 10 MB).">
        <label htmlFor="attachment" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-fg-muted hover:border-primary">
          <Paperclip className="size-4" aria-hidden /> {fileName ?? "Attach a screenshot"}
        </label>
        <input id="attachment" name="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
          onChange={(ev) => setFileName(ev.target.files?.[0]?.name ?? null)} />
      </Field>
      {hasLeaders && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send_to_leaders" value="1" defaultChecked className="size-4 accent-[var(--primary)]" />
          Send it to my sponsor and team leader
        </label>
      )}
      <SubmitButton className="w-full" pendingLabel="Saving…">Record order</SubmitButton>
    </form>
    )}
    </div>
  );
}
