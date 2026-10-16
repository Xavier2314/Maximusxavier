import { db, dbConfigured } from "@/lib/db";
import { toggleMessageHandled } from "@/lib/admin-actions";
import { formatLagos } from "@/lib/tickets";

type Msg = { id: string; name: string; email: string; phone: string | null; topic: string; message: string; handled: boolean; created_at: string };

export default async function Messages() {
  let rows: Msg[] = [];
  if (dbConfigured()) {
    const { data } = await db().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(300);
    rows = (data as Msg[]) ?? [];
  }
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Messages</h1>
      <ul className="mt-8 space-y-3">
        {rows.map((m) => (
          <li key={m.id} className={`bg-white p-5 ${m.handled ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-semibold text-navy">{m.name} <span className="font-normal text-slate">&lt;{m.email}&gt; {m.phone}</span></p>
              <p className="text-xs text-slate">{m.topic} · {formatLagos(m.created_at)}</p>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
            <form action={toggleMessageHandled} className="mt-4"><input type="hidden" name="id" value={m.id} />{!m.handled && <input type="hidden" name="handled" value="on" />}<button className="text-sm font-semibold text-royal underline">{m.handled ? "Mark as open" : "Mark as handled"}</button></form>
          </li>
        ))}
        {!rows.length && <li className="bg-white p-10 text-center text-slate">No messages yet.</li>}
      </ul>
    </>
  );
}
