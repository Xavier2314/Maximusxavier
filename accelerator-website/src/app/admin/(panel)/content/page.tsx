import { getAwards, getContests, getSpeakers, type Award, type Contest, type Speaker } from "@/lib/content";
import { deleteItem, saveItem } from "@/lib/admin-actions";
import { isoToLagosLocal } from "@/lib/tickets";

function T({ name, label, v, rows }: { name: string; label: string; v?: string | number | null; rows?: number }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {rows ? <textarea name={name} rows={rows} defaultValue={v ?? ""} className="field" /> : <input name={name} defaultValue={v ?? ""} className="field" />}
    </div>
  );
}
function Common({ order, published }: { order?: number; published?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <div className="w-28"><label className="field-label">Order</label><input name="sort_order" type="number" defaultValue={order ?? 0} className="field" /></div>
      <label className="flex items-center gap-3 pb-3 text-sm"><input type="checkbox" name="published" defaultChecked={published} className="h-5 w-5" /> Published on site</label>
    </div>
  );
}
function Del({ table, id }: { table: string; id: string }) {
  return <form action={deleteItem}><input type="hidden" name="_table" value={table} /><input type="hidden" name="id" value={id} /><button className="text-sm font-semibold text-red underline">Delete</button></form>;
}

function SpeakerForm({ s }: { s?: Speaker }) {
  return (
    <form action={saveItem} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="_table" value="speakers" />{s && <input type="hidden" name="id" value={s.id} />}
      <T name="name" label="Full name *" v={s?.name} /><T name="title" label="Professional title" v={s?.title} />
      <T name="topic" label="Session topic" v={s?.topic} /><T name="photo_url" label="Photo URL (/images/... or https://...)" v={s?.photo_url} />
      <div className="md:col-span-2"><T name="bio" label="Short biography" v={s?.bio} rows={3} /></div>
      <div className="md:col-span-2"><Common order={s?.sort_order} published={s?.published} /></div>
      <button className="btn btn-navy md:col-span-2 md:w-fit">{s ? "Save speaker" : "Add speaker"}</button>
    </form>
  );
}
function AwardForm({ a }: { a?: Award }) {
  return (
    <form action={saveItem} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="_table" value="awards" />{a && <input type="hidden" name="id" value={a.id} />}
      <T name="title" label="Award category *" v={a?.title} /><T name="winners" label="Winner(s)" v={a?.winners} />
      <div className="md:col-span-2"><T name="description" label="Description" v={a?.description} rows={2} /></div>
      <div className="md:col-span-2"><T name="nominees" label="Nominees" v={a?.nominees} rows={2} /></div>
      <div className="md:col-span-2"><Common order={a?.sort_order} published={a?.published} /></div>
      <button className="btn btn-navy md:col-span-2 md:w-fit">{a ? "Save award" : "Add award"}</button>
    </form>
  );
}
function ContestForm({ c }: { c?: Contest }) {
  return (
    <form action={saveItem} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="_table" value="contests" />{c && <input type="hidden" name="id" value={c.id} />}
      <T name="title" label="Contest title *" v={c?.title} />
      <div><label className="field-label">Status</label><select name="status" defaultValue={c?.status ?? "coming_soon"} className="field"><option value="coming_soon">Coming soon</option><option value="open">Open</option><option value="closed">Closed</option><option value="winners_announced">Winners announced</option></select></div>
      <div><label className="field-label">Start (Lagos time)</label><input type="datetime-local" name="starts_at" defaultValue={isoToLagosLocal(c?.starts_at ?? null)} className="field" /></div>
      <div><label className="field-label">Submission deadline (Lagos time)</label><input type="datetime-local" name="deadline" defaultValue={isoToLagosLocal(c?.deadline ?? null)} className="field" /></div>
      <T name="prize" label="Prize" v={c?.prize} /><T name="submission_url" label="Submission link (form or upload page)" v={c?.submission_url} />
      <div className="md:col-span-2"><T name="description" label="Description" v={c?.description} rows={2} /></div>
      <div className="md:col-span-2"><T name="requirements" label="Entry requirements" v={c?.requirements} rows={3} /></div>
      <div className="md:col-span-2"><T name="rules" label="Rules" v={c?.rules} rows={3} /></div>
      <div className="md:col-span-2"><T name="winners" label="Winners (shown when status is Winners announced)" v={c?.winners} rows={2} /></div>
      <div className="md:col-span-2"><Common order={c?.sort_order} published={c?.published} /></div>
      <button className="btn btn-navy md:col-span-2 md:w-fit">{c ? "Save contest" : "Add contest"}</button>
    </form>
  );
}

function Group<X extends { id: string }>({ title, items, label, render, table, NewForm }: { title: string; items: X[]; label: (x: X) => string; render: (x: X) => React.ReactNode; table: string; NewForm: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl text-navy">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((x) => (
          <details key={x.id} className="bg-white p-5">
            <summary className="cursor-pointer font-semibold text-navy">{label(x)}</summary>
            <div className="mt-5 space-y-4">{render(x)}<Del table={table} id={x.id} /></div>
          </details>
        ))}
        <details className="border-2 border-dashed border-sand p-5"><summary className="cursor-pointer font-semibold text-royal">+ Add new</summary><div className="mt-5">{NewForm}</div></details>
      </div>
    </section>
  );
}

export default async function ContentPage() {
  const [speakers, awards, contests] = await Promise.all([getSpeakers(true), getAwards(true), getContests(true)]);
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Speakers, awards &amp; contests</h1>
      <p className="mt-2 text-sm text-slate">Unpublished items stay hidden from the public site. When a list has no published items, the site shows a tasteful &ldquo;Coming soon&rdquo; section.</p>
      <Group title="Speakers & trainers" table="speakers" items={speakers} label={(s) => `${s.name}${s.published ? "" : " (draft)"}`} render={(s) => <SpeakerForm s={s} />} NewForm={<SpeakerForm />} />
      <Group title="Award categories" table="awards" items={awards} label={(a) => `${a.title}${a.published ? "" : " (draft)"}`} render={(a) => <AwardForm a={a} />} NewForm={<AwardForm />} />
      <Group title="Video competitions" table="contests" items={contests} label={(c) => `${c.title} · ${c.status.replace("_", " ")}${c.published ? "" : " (draft)"}`} render={(c) => <ContestForm c={c} />} NewForm={<ContestForm />} />
    </>
  );
}
