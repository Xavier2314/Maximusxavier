import { getEventSettings } from "@/lib/content";
import { updateEvent } from "@/lib/admin-actions";
import { isoToLagosLocal } from "@/lib/tickets";

export default async function EventSettingsPage() {
  const e = await getEventSettings();
  const f = (name: Exclude<keyof typeof e, "timeConfirmed">, label: string, type = "text") => (
    <div><label className="field-label" htmlFor={`e-${name}`}>{label}</label><input id={`e-${name}`} name={name} type={type} defaultValue={type === "datetime-local" ? isoToLagosLocal(e[name]) : (e[name] ?? "")} className="field" /></div>
  );
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Event details</h1>
      <p className="mt-2 text-sm text-slate">Only enter confirmed information. Empty fields show &ldquo;To be announced&rdquo; on the site. The countdown starts when a start date is set. Times are Lagos time.</p>
      <form action={updateEvent} className="mt-8 max-w-3xl space-y-5 bg-white p-6">
        {f("name", "Event name")}
        {f("theme", "Official theme")}
        {f("themeTagline", "Theme tagline")}
        <div className="grid gap-4 sm:grid-cols-2">{f("startsAt", "Starts", "datetime-local")}{f("endsAt", "Ends", "datetime-local")}</div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="timeConfirmed" defaultChecked={e.timeConfirmed} className="h-5 w-5" /> Start time is confirmed (otherwise only the date is shown)</label>
        {f("venueName", "Venue name")}
        <div className="grid gap-4 sm:grid-cols-2">{f("address", "Address")}{f("city", "City")}</div>
        <div><label className="field-label" htmlFor="e-summary">Event description</label><textarea id="e-summary" name="summary" rows={5} defaultValue={e.summary ?? ""} className="field" /></div>
        <button className="btn btn-navy">Save event details</button>
      </form>
    </>
  );
}
