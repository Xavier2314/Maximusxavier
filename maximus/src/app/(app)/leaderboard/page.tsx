import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatMoney } from "@/lib/utils";

export const metadata = { title: "Leaderboard" };

type Row = { rank: number; member: string; full_name: string; avatar_url: string | null; office_name: string | null; earnings: number | null; prospects: number; is_me: boolean };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; office?: string }> }) {
  await requireViewer();
  const sp = await searchParams;
  const period = sp.period === "week" ? "week" : "month";
  const office = sp.office && /^[0-9a-f-]{36}$/.test(sp.office) ? sp.office : null;
  const supabase = await createClient();
  const [{ data }, { data: offices }] = await Promise.all([
    supabase.rpc("earnings_leaderboard", { p_period: period, p_office: office, p_limit: 50 }),
    supabase.from("offices").select("id, name").eq("is_active", true).order("name"),
  ]);
  const rows = (data as Row[] | null) ?? [];
  const podium = rows.slice(0, 3);
  const href = (p: string, o: string | null) => `/leaderboard?period=${p}${o ? `&office=${o}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Recognition" title="Earnings leaderboard"
        description="Celebrating who is moving. Based on earnings entered in 5-day evaluations." />
      <div className="mb-6 flex flex-wrap gap-2">
        {(["week", "month"] as const).map((p) => (
          <Link key={p} href={href(p, office)} className={cn("rounded-full px-4 py-2 text-sm font-medium", period === p ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted")}>
            This {p}
          </Link>
        ))}
        <span className="mx-1 w-px bg-border" aria-hidden />
        <Link href={href(period, null)} className={cn("rounded-full px-4 py-2 text-sm", !office ? "bg-brand-navy text-white dark:bg-surface-muted" : "bg-surface-muted text-fg-muted")}>All offices</Link>
        {(offices ?? []).map((o) => (
          <Link key={o.id as string} href={href(period, o.id as string)} className={cn("rounded-full px-4 py-2 text-sm", office === o.id ? "bg-brand-navy text-white dark:bg-surface-muted" : "bg-surface-muted text-fg-muted")}>{o.name as string}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Trophy className="size-6" />} title="No earnings logged yet" description="Earnings appear here as members complete their 5-day evaluations." /></Card>
      ) : (
        <>
          <section className="hero-gradient mb-6 grid grid-cols-3 items-end gap-3 rounded-2xl p-5 text-white sm:p-8" aria-label="Top three">
            {[podium[1], podium[0], podium[2]].map((r, i) => r && (
              <div key={r.member} className="flex flex-col items-center text-center">
                <span className="relative">
                  <Avatar name={r.full_name} src={r.avatar_url} size={i === 1 ? 84 : 64} className="ring-4 ring-white/20" />
                  <span className={cn("absolute -bottom-2 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full text-sm font-bold",
                    r.rank === 1 ? "bg-brand-lime text-brand-navy" : "bg-white text-brand-navy")}>{r.rank}</span>
                </span>
                <p className="mt-4 line-clamp-1 text-sm font-semibold">{r.full_name}</p>
                <p className="text-xs text-white/70">{r.earnings !== null ? formatMoney(r.earnings) : `${r.prospects} prospects`}</p>
              </div>
            ))}
          </section>
          <Card>
            <CardHeader title={`Top earners this ${period}`} icon={<Medal className="size-4" />} />
            <CardBody className="pt-2">
              <ol className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.member} className={cn("flex items-center gap-3 py-3", r.is_me && "-mx-2 rounded-xl bg-primary-soft/60 px-2")}>
                    <span className="w-7 text-center text-sm font-bold tabular-nums text-fg-muted">{r.rank}</span>
                    <Avatar name={r.full_name} src={r.avatar_url} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.full_name}{r.is_me && " (you)"}</span>
                      <span className="text-xs text-fg-subtle">{r.office_name ?? "No office"} · {r.prospects} prospects</span>
                    </span>
                    <span className="font-semibold tabular-nums">{r.earnings !== null ? formatMoney(r.earnings) : "—"}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
