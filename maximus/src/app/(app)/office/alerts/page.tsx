import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, HeartHandshake, PartyPopper } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { ALERT_KINDS, groupAlerts, type Alert } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { OfficePicker } from "../office-picker";

export const metadata = { title: "Coaching alerts" };

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ office?: string; scope?: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.offices.length && !viewer.isLeader) redirect("/forbidden");
  const sp = await searchParams;
  const scope = viewer.offices.length && sp.scope !== "team" ? "office" : "team";
  const officeId = viewer.offices.find((o) => o.id === sp.office)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0]?.id;

  const supabase = await createClient();
  const { data } = await supabase.rpc("leadership_alerts", { p_office: scope === "office" ? officeId : null });
  const alerts = (data as Alert[] | null) ?? [];
  const concerns = groupAlerts(alerts.filter((a) => !a.positive));
  const wins = alerts.filter((a) => a.positive);

  return (
    <>
      <PageHeader eyebrow={viewer.offices.length ? "Office view" : "Team view"} title="Coaching alerts"
        description="Patterns worth a conversation. They're prompts to support someone, not judgements about them."
        action={scope === "office" && officeId ? <OfficePicker offices={viewer.offices} current={officeId} /> : undefined} />

      {viewer.offices.length > 0 && viewer.isLeader && (
        <nav aria-label="Scope" className="mb-6 flex w-fit gap-1 rounded-xl bg-surface-muted p-1 text-sm">
          {[{ k: "office", l: "Whole office" }, { k: "team", l: "My team" }].map((o) => (
            <Link key={o.k} href={`/office/alerts?scope=${o.k}${officeId ? `&office=${officeId}` : ""}`} aria-current={scope === o.k ? "page" : undefined}
              className={cn("rounded-lg px-3 py-1.5", scope === o.k ? "bg-surface font-medium shadow-sm" : "text-fg-muted")}>{o.l}</Link>
          ))}
        </nav>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {concerns.length === 0 ? (
            <Card><EmptyState icon={<HeartHandshake className="size-6" />} title="Nothing needs attention right now"
              description="Everyone is on track by the rules below. Keep encouraging them." /></Card>
          ) : concerns.map((g) => (
            <Card key={g.member}>
              <CardBody className="space-y-3">
                <Link href={`/team/${g.member}?view=team`} className="group flex items-center gap-3">
                  <Avatar name={g.full_name} src={g.avatar_url} size={40} />
                  <span className="flex-1 font-semibold group-hover:text-primary">{g.full_name}</span>
                  <Badge tone={g.items.length >= 3 ? "amber" : "neutral"}>{g.items.length} {g.items.length === 1 ? "thing" : "things"} to talk about</Badge>
                  <ArrowRight className="size-4 text-fg-subtle" aria-hidden />
                </Link>
                <ul className="space-y-2">
                  {g.items.map((a) => (
                    <li key={a.kind} className="rounded-xl bg-surface-muted/70 p-3">
                      <p className="text-sm"><b>{ALERT_KINDS[a.kind]?.label ?? a.kind}:</b> {a.detail}</p>
                      {ALERT_KINDS[a.kind] && <p className="mt-0.5 text-xs text-fg-muted">Try: {ALERT_KINDS[a.kind].tip}</p>}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Worth celebrating" icon={<PartyPopper className="size-4" />} description="Recognise progress out loud" />
            <CardBody className="pt-3">
              {wins.length > 0 ? (
                <ul className="space-y-2">
                  {wins.map((w) => (
                    <li key={w.member}>
                      <Link href={`/team/${w.member}?view=team`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                        <Avatar name={w.full_name} src={w.avatar_url} size={34} />
                        <span className="min-w-0"><span className="block truncate text-sm font-medium">{w.full_name}</span><span className="text-xs text-fg-muted">{w.detail}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">No big jumps this fortnight yet.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="How alerts work" />
            <CardBody className="space-y-1.5 pt-3 text-xs text-fg-muted">
              <p><b>Missing office days:</b> 5+ open days missed in a row.</p>
              <p><b>Stopped prospecting:</b> no prospect added or updated for 7+ days.</p>
              <p><b>No goals:</b> nothing submitted for this month by the 5th.</p>
              <p><b>Evaluations behind:</b> none in the last 10 days.</p>
              <p><b>Paused training:</b> did lessons before, none in 30 days.</p>
              <p><b>Big improvement:</b> 4+ office days in the last 2 weeks, at least double the 2 weeks before.</p>
              <p>Members who joined in the last 7 days are left out while they settle in.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
