import { getTickets } from "@/lib/content";
import { updateTicket } from "@/lib/admin-actions";
import { isoToLagosLocal, ticketStatus } from "@/lib/tickets";

export default async function Tickets() {
  const tickets = await getTickets();
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Tickets</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate">All dates and times are Lagos time (WAT). Checkout is allowed only while a ticket is enabled, inside its sales window and has a price. Changes take effect immediately, no redeploy needed.</p>
      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {tickets.map((t) => (
          <form key={t.id} action={updateTicket} className="space-y-5 bg-white p-6">
            <input type="hidden" name="id" value={t.id} />
            <div className="flex items-center justify-between"><h2 className="font-display text-2xl text-navy">{t.name}</h2><span className="text-xs font-semibold uppercase tracking-wider text-slate">{ticketStatus(t).replace("_", " ")}</span></div>
            <div><label className="field-label" htmlFor={`${t.id}-name`}>Display name</label><input id={`${t.id}-name`} name="name" defaultValue={t.name} className="field" /></div>
            <div><label className="field-label" htmlFor={`${t.id}-price`}>Price in naira (leave empty if not confirmed)</label><input id={`${t.id}-price`} name="price" inputMode="numeric" defaultValue={t.priceKobo ? String(t.priceKobo / 100) : ""} placeholder="e.g. 15000" className="field" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="field-label" htmlFor={`${t.id}-start`}>Sales start</label><input id={`${t.id}-start`} type="datetime-local" name="sales_start" defaultValue={isoToLagosLocal(t.salesStart)} className="field" /></div>
              <div><label className="field-label" htmlFor={`${t.id}-end`}>Sales end</label><input id={`${t.id}-end`} type="datetime-local" name="sales_end" defaultValue={isoToLagosLocal(t.salesEnd)} className="field" /></div>
            </div>
            <div><label className="field-label" htmlFor={`${t.id}-desc`}>Description</label><textarea id={`${t.id}-desc`} name="description" rows={2} defaultValue={t.description} className="field" /></div>
            <div><label className="field-label" htmlFor={`${t.id}-ben`}>Benefits (one per line)</label><textarea id={`${t.id}-ben`} name="benefits" rows={4} defaultValue={t.benefits.join("\n")} className="field" /></div>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="enabled" defaultChecked={t.enabled} className="h-5 w-5" /> Enabled</label>
            <button className="btn btn-navy">Save {t.name}</button>
          </form>
        ))}
      </div>
    </>
  );
}
