import Link from "next/link";
import { Compass, Network, Trophy } from "lucide-react";
import { DuplicationSummary, FOCUS_ICONS, FocusList, coursesForFocus } from "@/components/growth-focus";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { FOCUS, topFocus, type FocusKey, type GrowthFocus } from "@/lib/growth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Growth focus" };

export default async function GrowthPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data }, { data: directs }, { data: teamFocus }] = await Promise.all([
    supabase.rpc("growth_focus"),
    supabase.from("profiles").select("id, full_name, avatar_url, member_id").eq("sponsor_id", viewer.id).neq("status", "deactivated").order("joined_at"),
    supabase.rpc("team_focus", { p_root: viewer.id }),
  ]);
  const focus = data as GrowthFocus | null;
  const top = topFocus(focus);
  const rest = (focus?.areas ?? []).slice(3).filter((a) => a.key in FOCUS);
  const courses = await coursesForFocus(supabase, top);
  const focusById = new Map(((teamFocus ?? []) as { member: string; focus: FocusKey[] }[]).map((t) => [t.member, t.focus]));

  // Recruit counts for each direct downline (their own direct recruits).
  const ids = (directs ?? []).map((d) => d.id as string);
  const { data: grand } = ids.length
    ? await supabase.from("profiles").select("sponsor_id").in("sponsor_id", ids).neq("status", "deactivated")
    : { data: [] as { sponsor_id: string }[] };
  const recruits = new Map<string, number>();
  for (const g of grand ?? []) recruits.set(g.sponsor_id as string, (recruits.get(g.sponsor_id as string) ?? 0) + 1);
  const target = focus?.duplication_target ?? 3;

  return (
    <>
      <PageHeader eyebrow="Growth" title="Your growth focus"
        description="Based on your last 30 days: the areas that will grow you and your team the most right now." />

      {focus && (
        <Card className="mb-6">
          <CardHeader title="Duplication" icon={<Network className="size-4" />}
            description={`Bring in at least ${target} (there's no limit), help each of them bring in ${target}+, and never stop inviting.`} />
          <CardBody><DuplicationSummary focus={focus} /></CardBody>
        </Card>
      )}

      <section aria-labelledby="top-focus" className="mb-8">
        <h2 id="top-focus" className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Compass className="size-5 text-primary" aria-hidden /> Work on these first
        </h2>
        {top.length > 0 ? <FocusList areas={top} courses={courses} /> : (
          <Card><EmptyState icon={<Trophy className="size-6" />} title="You're on target everywhere"
            description="Great work. Keep supporting your team so they reach their targets too." /></Card>
        )}
        {rest.length > 0 && (
          <p className="mt-4 text-sm text-fg-muted">
            Also worth watching: {rest.map((a) => FOCUS[a.key].title).join(", ")}.
          </p>
        )}
      </section>

      {(directs ?? []).length > 0 && (
        <Card>
          <CardHeader title="Your direct downlines" icon={<Network className="size-4" />}
            description={`Who has reached their first ${target}, and what each person should work on`} />
          <CardBody>
            <ul className="divide-y divide-border">
              {(directs ?? []).map((d) => {
                const n = recruits.get(d.id as string) ?? 0;
                const f = focusById.get(d.id as string) ?? [];
                return (
                  <li key={d.id as string}>
                    <Link href={`/team/${d.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:opacity-90">
                      <Avatar name={d.full_name as string} src={d.avatar_url as string | null} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.full_name as string}</span>
                        <span className="text-xs text-fg-subtle">{d.member_id as string}</span>
                      </span>
                      <Badge tone={n >= target ? "green" : n > 0 ? "blue" : "amber"}>{n >= target ? `${n} brought in ✓` : `${n}/${target} brought in`}</Badge>
                      <span className="flex flex-wrap gap-1">
                        {f.slice(0, 2).map((k) => {
                          const Icon = FOCUS_ICONS[k];
                          return Icon ? <Badge key={k} tone="neutral"><Icon className="size-3" aria-hidden />{FOCUS[k].short}</Badge> : null;
                        })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

    </>
  );
}
