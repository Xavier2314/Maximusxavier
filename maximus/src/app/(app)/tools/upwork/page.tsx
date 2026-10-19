import Link from "next/link";
import { ArrowLeft, Briefcase, CheckCircle2, ExternalLink, History, KeyRound, Lock, Trophy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { rankLabel } from "@/lib/ranks";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UpworkInput, UpworkReport } from "@/lib/upwork";
import { formatRelative } from "@/lib/utils";
import { PayOnline } from "../../payments/pay-online";
import { AnalyserForm, ReportView, UnlockMemberForm } from "./upwork-ui";

export const metadata = { title: "Upwork Account Analyser" };
export const maxDuration = 60;

type Leader = { full_name: string; avatar_url: string | null; business_rank: string | null; member_id: string; orders: number; in_progress: number; completed: number; matched: boolean };
type Row = { id: string; score: number | null; created_at: string; input: UpworkInput; report: UpworkReport };

export default async function UpworkAnalyserPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const viewer = await requireViewer();
  const { r } = await searchParams;
  const supabase = await createClient();
  const [{ data: allowed }, { data: price }] = await Promise.all([
    supabase.rpc("has_tool_access", { p_tool: "upwork_analyser" }),
    supabase.from("app_settings").select("value").eq("key", "upwork_analyser_price").maybeSingle(),
  ]);
  const amount = Number((price?.value as { amount?: number } | null)?.amount ?? 1000);
  const payLink = (price?.value as { payment_link?: string } | null)?.payment_link ?? null;
  const canUnlock = viewer.roles.includes("super_admin") || viewer.can("approve_financial_transactions");

  const header = (
    <>
      <Link href="/tools" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Tools</Link>
      <PageHeader eyebrow="Freelance tools" title="Upwork Account Analyser"
        description="Paste your Upwork profile and get a score out of 100, exactly what to fix, a rewritten title and overview, and a 7-day action plan." />
    </>
  );
  const unlockCard = canUnlock && (
    <Card className="h-fit">
      <CardHeader title="Unlock a member" icon={<KeyRound className="size-4" />} description="For people who paid on the Flutterwave payment link." />
      <CardBody><UnlockMemberForm /></CardBody>
    </Card>
  );

  if (!allowed) {
    return (
      <>
        {header}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardBody className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success"><Briefcase className="size-6" aria-hidden /></span>
                <div>
                  <p className="text-lg font-bold">Is your Upwork profile costing you jobs?</p>
                  <p className="text-sm text-fg-muted">One-time payment of ₦{amount.toLocaleString()}. Use it any time after.</p>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {["Score out of 100, section by section", "Exact fixes for your title, overview, skills, rate and portfolio",
                  "A rewritten title and overview you can copy", "Skill tags clients search for", "Rate advice for your niche", "A 7-day action plan"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{t}</li>
                ))}
              </ul>
              <div className="rounded-2xl bg-surface-muted p-4">
                <p className="mb-3 flex items-center gap-2 font-semibold"><Lock className="size-4" aria-hidden />Unlock the analyser</p>
                <PayOnline purpose="upwork_analyser" fixedAmount={amount} />
              </div>
              {payLink && (
                <p className="text-sm text-fg-muted">
                  Prefer our payment page? <a href={payLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Pay on Flutterwave<ExternalLink className="size-3.5" aria-hidden /></a>, then send your receipt and member ID <b>{viewer.profile.member_id}</b> to an admin to unlock it.
                </p>
              )}
            </CardBody>
          </Card>
          {unlockCard}
        </div>
      </>
    );
  }

  const { data } = await supabase.from("upwork_analyses").select("id, score, created_at, input, report")
    .order("created_at", { ascending: false }).limit(20).returns<Row[]>();
  const rows = data ?? [];
  const current = rows.find((x) => x.id === r) ?? null;
  const basis = current?.input ?? rows[0]?.input ?? null;
  const niche = basis ? [basis.niche, basis.title].filter(Boolean).join(" ") : "";
  const { data: leaderRows } = await supabase.rpc("upwork_niche_leaders", { p_niche: niche, p_limit: 10 });
  const leaders = (leaderRows as Leader[] | null) ?? [];

  return (
    <>
      {header}
      {current && <div className="mb-6"><ReportView report={current.report} createdAt={current.created_at} /></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={current ? "Analyse again after your changes" : "Paste your profile"} icon={<Briefcase className="size-4" />}
            description="Copy each part from your Upwork profile. The more you paste, the better the advice." />
          <CardBody><AnalyserForm last={rows[0]?.input ?? null} /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader title="Past reports" icon={<History className="size-4" />} />
            <CardBody>
              {rows.length === 0 ? <p className="text-sm text-fg-muted">Your reports will appear here.</p> : (
                <ul className="space-y-1">
                  {rows.map((x) => (
                    <li key={x.id}>
                      <Link href={`/tools/upwork?r=${x.id}`} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted ${x.id === r ? "bg-primary-soft" : ""}`}>
                        <span className="truncate">{x.input.title}</span>
                        <span className="shrink-0 font-bold tabular-nums">{x.score ?? "–"}/100</span>
                      </Link>
                      <p className="px-3 text-xs text-fg-subtle">{formatRelative(x.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card className="h-fit">
            <CardHeader title={leaders[0]?.matched ? "Top in your niche" : "Top Upwork earners"} icon={<Trophy className="size-4" />}
              description={leaders[0]?.matched ? `Members getting the most Upwork orders for “${basis?.niche || basis?.title}” (last 90 days, including orders in progress).` : "Members getting the most Upwork orders (last 90 days, including orders in progress)."} />
            <CardBody>
              {leaders.length === 0 ? <p className="text-sm text-fg-muted">No Upwork orders recorded yet. Record yours in Orders to show up here.</p> : (
                <ol className="space-y-2">
                  {leaders.map((l, i) => (
                    <li key={l.member_id} className="flex items-center gap-3">
                      <span className="w-5 text-center text-sm font-bold text-fg-subtle">{i + 1}</span>
                      <Avatar name={l.full_name} src={l.avatar_url} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{l.full_name}</span>
                        <span className="block text-xs text-fg-subtle">{rankLabel(l.business_rank) ?? l.member_id}</span>
                      </span>
                      <span className="text-right text-xs">
                        <b className="block text-sm tabular-nums">{l.orders} order{l.orders === 1 ? "" : "s"}</b>
                        <span className="text-fg-subtle">{l.in_progress} in progress</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-xs text-fg-subtle">Learn from them: send a message and ask what&apos;s working.</p>
            </CardBody>
          </Card>
          {unlockCard}
        </div>
      </div>
    </>
  );
}
