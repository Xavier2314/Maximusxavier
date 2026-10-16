import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { logout } from "@/lib/admin-actions";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "Overview"], ["/admin/registrations", "Registrations"], ["/admin/tickets", "Tickets"], ["/admin/event", "Event details"],
  ["/admin/content", "Speakers, awards & contests"], ["/admin/messages", "Messages"], ["/admin/audit", "Audit log"],
] as const;

export default async function Panel({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[260px_1fr]">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link href="/admin"><Logo variant="horizontal-reversed" width={150} /></Link>
          <p className="text-xs text-mist lg:mt-4">Signed in as {me.actor} ({me.role})</p>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {links.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap px-3 py-2.5 text-sm text-white/85 hover:bg-white/10 hover:text-white">{label}</Link>)}
          <Link href="/" className="whitespace-nowrap px-3 py-2.5 text-sm text-white/60 hover:text-white">View site &rarr;</Link>
          <form action={logout}><button className="w-full whitespace-nowrap px-3 py-2.5 text-left text-sm text-red hover:bg-white/10">Sign out</button></form>
        </nav>
      </aside>
      <div className="min-w-0 p-5 md:p-10">
        {!dbConfigured() && (
          <p className="mb-8 border-l-4 border-gold bg-white p-4 text-sm text-ink">
            The database is not connected yet, so nothing can be saved. Connect Supabase (set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code>) and run <code>supabase/schema.sql</code>.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
