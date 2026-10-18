import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CHANNEL_LABELS, STAGES, type Prospect } from "@/lib/prospects";

type Errors = Record<string, string[] | undefined> | undefined;

/** Shared fields for adding and editing a prospect. */
export function ProspectFields({ p, errors }: { p?: Partial<Prospect>; errors: Errors }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor="full_name" error={errors?.full_name} className="sm:col-span-2">
        <Input id="full_name" name="full_name" required defaultValue={p?.full_name ?? ""} autoComplete="off" />
      </Field>
      <Field label="WhatsApp / phone" htmlFor="phone" error={errors?.phone} optional hint="e.g. 0803 123 4567">
        <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={p?.phone ?? ""} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors?.email} optional>
        <Input id="email" name="email" type="email" defaultValue={p?.email ?? ""} />
      </Field>
      <Field label="Where you met" htmlFor="source" error={errors?.source} optional hint="Church, school, Instagram…">
        <Input id="source" name="source" defaultValue={p?.source ?? ""} />
      </Field>
      <Field label="Follow up by" htmlFor="channel" error={errors?.channel}>
        <Select id="channel" name="channel" defaultValue={p?.channel ?? "whatsapp"}>
          {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      {p?.id && (
        <Field label="Stage" htmlFor="stage" error={errors?.stage}>
          <Select id="stage" name="stage" defaultValue={p.stage}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Notes for Maximus AI" htmlFor="notes" error={errors?.notes} optional className="sm:col-span-2"
        hint="What do you know about them? Interests, situation, what you talked about. The AI uses this to write better messages.">
        <Textarea id="notes" name="notes" rows={3} defaultValue={p?.notes ?? ""} />
      </Field>
    </div>
  );
}
