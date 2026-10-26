import Link from "next/link";
import { Award, Cake, PartyPopper, Plus, Trophy } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TeamMemberStat } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { PostForm } from "../announcements/post-form";

export const metadata = { title: "Recognition" };

type Birthday = { member: string; full_name: string; avatar_url: string | null; office_name: string | null; birthday_month: number; birthday_day: number; days_until: number };
type Anniversary = { member: string; full_name: string; avatar_url: string | null; years: number; days_until: number };
type Post = { id: string; title: string; body: string; published_at: string;
  recipient: { full_name: string; avatar_url: string | null } | null; author: { full_name: string } | null };

const dayMonth = (m: number, d: number) => new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function RecognitionPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const canRecognise = viewer.can("view_team_dashboard");
  const [{ data: bdays }, { data: annivs }, { data: posts }, teamRes] = await Promise.all([
    supabase.rpc("upcoming_birthdays", { p_days: 30 }),
    supabase.rpc("upcoming_anniversaries", { p_days: 30 }),
    supabase.from("announcements").select("id, title, body, published_at, recipient:profiles!announcements_recipient_id_fkey(full_name, avatar_url), author:profiles!announcements_author_id_fkey(full_name)")
      .eq("kind", "recognition").order("published_at", { ascending: false }).limit(30).returns<Post[]>(),
    canRecognise ? supabase.rpc("team_member_stats", { p_root: viewer.id }) : Promise.resolve({ data: [] }),
  ]);
  const birthdays = (bdays as Birthday[] | null) ?? [];
  const today = birthdays.filter((b) => b.days_until === 0);
  const upcoming = birthdays.filter((b) => b.days_until > 0);
  const anniversaries = (annivs as Anniversary[] | null) ?? [];
  const team = ((teamRes.data as TeamMemberStat[] | null) ?? []).map((m) => ({ id: m.member, name: m.full_name }));

  return (
    <>
      <PageHeader eyebrow="Community" title="Recognition & celebrations" description="Celebrate birthdays, anniversaries and wins across the Maximus family." />

      {today.length > 0 && (
        <section className="mb-6 grid gap-4 md:grid-cols-2" aria-label="Today's birthdays">
          {today.map((b) => (
            // Birthday announcement card
            <article key={b.member} className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white">
              <div className="relative flex items-center gap-5">
                <Avatar name={b.full_name} src={b.avatar_url} size={84} className="ring-4 ring-brand-lime" />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.16em] text-brand-lime"><Cake className="size-4" aria-hidden /> Happy birthday</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">{b.full_name}</h2>
                  <p className="text-sm text-white/70">{dayMonth(b.birthday_month, b.birthday_day)}{b.office_name ? ` · ${b.office_name}` : ""}</p>
                </div>
              </div>
              <p className="relative mt-5 text-white/80">Wishing you a year of maximized potential, growth and victories. The whole Maximus family celebrates you today! 🎉</p>
              <Logo className="relative mt-5 h-6 w-auto text-white/70" />
            </article>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Recognition wall" icon={<Trophy className="size-4" />} />
            <CardBody className="pt-3">
              {(posts ?? []).length > 0 ? (
                <ul className="space-y-4">
                  {(posts ?? []).map((p) => (
                    <li key={p.id}>
                      <Link href={`/announcements/${p.id}`} className="flex gap-4 rounded-2xl border border-border p-4 transition-all hover:-translate-y-px hover:border-primary/40">
                        <Avatar name={p.recipient?.full_name ?? "Member"} src={p.recipient?.avatar_url} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold"><Award className="size-4 text-brand-green" aria-hidden />{p.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{p.body}</p>
                          <p className="mt-2 text-xs text-fg-subtle">By {p.author?.full_name ?? "a leader"} · {formatRelative(p.published_at)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon={<Trophy className="size-6" />} title="No recognition posts yet" description="Leaders can celebrate team wins here." />}
            </CardBody>
          </Card>
          {canRecognise && team.length > 0 && (
            <Card>
              <CardHeader title="Recognise a team member" icon={<Plus className="size-4" />} />
              <CardBody><PostForm mode="recognition" offices={[]} members={team} canOrgWide={false} /></CardBody>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Upcoming birthdays" icon={<Cake className="size-4" />} description="Members who chose to share" />
            <CardBody className="pt-3">
              {upcoming.length > 0 ? (
                <ul className="space-y-3">
                  {upcoming.map((b) => (
                    <li key={b.member} className="flex items-center gap-3">
                      <Avatar name={b.full_name} src={b.avatar_url} size={36} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{b.full_name}</span><span className="text-xs text-fg-subtle">{dayMonth(b.birthday_month, b.birthday_day)}</span></span>
                      <Badge>in {b.days_until}d</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">No birthdays in the next 30 days.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Anniversaries" icon={<PartyPopper className="size-4" />} />
            <CardBody className="pt-3">
              {anniversaries.length > 0 ? (
                <ul className="space-y-3">
                  {anniversaries.map((a) => (
                    <li key={a.member} className="flex items-center gap-3">
                      <Avatar name={a.full_name} src={a.avatar_url} size={36} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.full_name}</span><span className="text-xs text-fg-subtle">{a.years} year{a.years > 1 ? "s" : ""} with Maximus</span></span>
                      <Badge tone={a.days_until === 0 ? "lime" : "neutral"}>{a.days_until === 0 ? "Today" : `in ${a.days_until}d`}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">No anniversaries in the next 30 days.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
