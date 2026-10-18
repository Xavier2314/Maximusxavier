import Link from "next/link";
import { Phone, PhoneIncoming, PhoneOutgoing, Radio, Users, Video } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, NotConfigured, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { isDailyConfigured } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { GroupCallForm } from "./group-call-form";

export const metadata = { title: "Calls" };

type Row = { id: string; kind: "direct" | "group"; title: string | null; video: boolean; status: string; created_by: string; created_at: string; answered_at: string | null;
  offices: { name: string } | null; profiles: { full_name: string } | null };

export default async function CallsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("calls")
    .select("id, kind, title, video, status, created_by, created_at, answered_at, offices(name), profiles!calls_created_by_fkey(full_name)")
    .order("created_at", { ascending: false }).limit(30).returns<Row[]>();
  const rows = data ?? [];
  const live = rows.filter((c) => c.status !== "ended" && Date.now() - new Date(c.created_at).getTime() < 3 * 3600 * 1000);

  return (
    <>
      <PageHeader eyebrow="Connect" title="Calls" description="Voice and video calls with your partner, sponsor line and office. Start a 1-to-1 call from any chat." />
      {!isDailyConfigured() && (
        <div className="mb-6"><NotConfigured feature="Calls" envVars={["DAILY_API_KEY"]}>Create a free account at daily.co, copy its API key, and add it in Vercel.</NotConfigured></div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {live.length > 0 && (
            <Card className="border-brand-green/50">
              <CardHeader title="Live now" icon={<Radio className="size-4 text-success" />} />
              <CardBody className="space-y-2">
                {live.map((c) => (
                  <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center gap-3 rounded-xl bg-success-soft/60 p-3 hover:bg-success-soft">
                    <span className="grid size-10 place-items-center rounded-full bg-brand-green text-brand-navy">{c.video ? <Video className="size-5" /> : <Phone className="size-5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.kind === "group" ? (c.title ?? "Office call") : c.created_by === viewer.id ? "Your call" : `${c.profiles?.full_name ?? "Someone"} is calling`}</span>
                      <span className="block text-xs text-fg-muted">{c.kind === "group" ? c.offices?.name : "Private call"} · started {formatRelative(c.created_at)}</span>
                    </span>
                    <span className="rounded-full bg-brand-navy px-3 py-1.5 text-sm font-semibold text-white">Join</span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Recent calls" icon={<Phone className="size-4" />} />
            <CardBody>
              {rows.length === 0 ? (
                <EmptyState icon={<Phone className="size-6" />} title="No calls yet"
                  description={<>Open a chat in <Link href="/messages" className="text-primary hover:underline">Messages</Link> and tap 📞 or 🎥 to call.</>} />
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((c) => {
                    const mine = c.created_by === viewer.id;
                    const Icon = c.kind === "group" ? Users : mine ? PhoneOutgoing : PhoneIncoming;
                    const missed = c.kind === "direct" && !mine && !c.answered_at;
                    return (
                      <li key={c.id} className="flex items-center gap-3 py-3">
                        <Icon className={`size-5 ${missed ? "text-danger" : "text-fg-muted"}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {c.kind === "group" ? (c.title ?? "Office call") : mine ? "Outgoing call" : `From ${c.profiles?.full_name ?? "someone"}`}
                          </span>
                          <span className="block text-xs text-fg-subtle">{formatRelative(c.created_at)} · {c.video ? "Video" : "Voice"}</span>
                        </span>
                        {missed && <Badge tone="red">Missed</Badge>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
        {viewer.offices.length > 0 && (
          <Card className="h-fit">
            <CardHeader title="Start an office call" icon={<Users className="size-4" />} description="Everyone in the office gets a notification to join." />
            <CardBody><GroupCallForm offices={viewer.offices} /></CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
