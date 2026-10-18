import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock, MapPin, Megaphone, Medal, UserCheck, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRelative } from "@/lib/utils";

export const metadata = { title: "My office" };

type Summary = { members: number; checked_in_today: number; leaders: { name: string; avatar: string | null; member_id: string; whatsapp: string | null }[] };
type Office = { id: string; name: string; address: string | null; latitude: number | null; longitude: number | null; schedule: Record<string, { open?: string; close?: string }> };
type Post = { id: string; title: string; body: string; published_at: string };
type Row = { rank: number; member: string; full_name: string; avatar_url: string | null; earnings: number; is_me: boolean };

const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;

/** Read-only office page for every member: general facts only, nobody's private records. */
export default async function MyOfficePage() {
  const viewer = await requireViewer();
  const officeId = viewer.profile.office_id;
  if (!officeId) redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: office }, { data: summary }, { data: posts }, { data: board }] = await Promise.all([
    supabase.from("offices").select("id, name, address, latitude, longitude, schedule").eq("id", officeId).maybeSingle<Office>(),
    supabase.rpc("office_public_summary", { p_office: officeId }),
    supabase.from("announcements").select("id, title, body, published_at").eq("office_id", officeId)
      .in("kind", ["announcement", "training"]).order("published_at", { ascending: false }).limit(5).returns<Post[]>(),
    supabase.rpc("earnings_leaderboard", { p_period: "month", p_office: officeId, p_limit: 5 }),
  ]);
  if (!office) redirect("/dashboard");
  const s = (summary as Summary | null) ?? { members: 0, checked_in_today: 0, leaders: [] };
  const top = (board as Row[] | null) ?? [];
  const hours = DAYS.filter(([k]) => office.schedule?.[k]?.open);
  const map = office.latitude != null && office.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${office.latitude},${office.longitude}`
    : office.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}` : null;

  return (
    <>
      <PageHeader eyebrow="Office view" title={office.name} description="Your office at a glance. Members' personal records stay private." />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Office numbers">
        <StatCard label="Members" value={s.members} icon={<Users className="size-4" />} />
        <StatCard label="Checked in today" value={s.checked_in_today} icon={<UserCheck className="size-4" />} tone="green" />
        <StatCard label="Leaders" value={s.leaders.length} icon={<Building2 className="size-4" />} tone="navy" />
        <StatCard label="Office posts" value={(posts ?? []).length} icon={<Megaphone className="size-4" />} tone="lime" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Office news" icon={<Megaphone className="size-4" />}
              action={<Link href="/announcements" className="text-sm font-medium text-primary hover:underline">All announcements</Link>} />
            <CardBody className="space-y-4">
              {(posts ?? []).length === 0 && <EmptyState icon={<Megaphone className="size-6" />} title="No office posts yet" description="Announcements for your office will show here." />}
              {(posts ?? []).map((p) => (
                <div key={p.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-fg-subtle">{formatRelative(p.published_at)}</p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-fg-muted">{p.body}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Top earners this month" icon={<Medal className="size-4" />}
              action={<Link href="/leaderboard" className="text-sm font-medium text-primary hover:underline">Full leaderboard</Link>} />
            <CardBody>
              {top.length === 0 ? <p className="text-sm text-fg-muted">No earnings recorded in this office yet this month.</p> : (
                <ol className="space-y-2">
                  {top.map((r) => (
                    <li key={r.member} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${r.is_me ? "bg-primary-soft" : ""}`}>
                      <span className="w-6 text-center text-sm font-bold text-fg-subtle">{r.rank}</span>
                      <Avatar name={r.full_name} src={r.avatar_url} size={34} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.full_name}{r.is_me && " (you)"}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(Number(r.earnings))}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Where & when" icon={<MapPin className="size-4" />} />
            <CardBody className="space-y-4 text-sm">
              <div>
                <p className="font-medium">{office.address || "Address not set yet"}</p>
                {map && <a href={map} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open in Google Maps</a>}
              </div>
              {hours.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1.5 font-semibold"><Clock className="size-4" aria-hidden />Opening hours</p>
                  <ul className="space-y-0.5 text-fg-muted">
                    {hours.map(([k, label]) => (
                      <li key={k} className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{office.schedule[k].open} – {office.schedule[k].close ?? ""}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              <Link href="/attendance" className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-fg hover:bg-primary-hover">Check in</Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Office leaders" icon={<Building2 className="size-4" />} />
            <CardBody className="space-y-3">
              {s.leaders.length === 0 && <p className="text-sm text-fg-muted">No office leader set yet.</p>}
              {s.leaders.map((l) => (
                <div key={l.member_id} className="flex items-center gap-3">
                  <Avatar name={l.name} src={l.avatar} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.name}</p>
                    <p className="text-xs text-fg-subtle">{l.member_id}</p>
                  </div>
                  {l.whatsapp && (
                    <a href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">WhatsApp</a>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
