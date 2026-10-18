import Link from "next/link";
import { Bot, MessageCircle, Phone, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { STAGES, type Prospect } from "@/lib/prospects";
import { createClient } from "@/lib/supabase/server";
import { cn, formatRelative } from "@/lib/utils";
import { AddProspect } from "./add-prospect";
import { StageMenu } from "./stage-menu";

export const metadata = { title: "Prospects" };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const viewer = await requireViewer();
  const { member } = await searchParams;
  const ownerId = member && /^[0-9a-f-]{36}$/.test(member) ? member : viewer.id;
  const readOnly = ownerId !== viewer.id;
  const supabase = await createClient();
  const [{ data }, { data: owner }] = await Promise.all([
    supabase.from("prospects").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false }).returns<Prospect[]>(),
    readOnly ? supabase.from("profiles").select("full_name").eq("id", ownerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const prospects = data ?? [];
  const active = prospects.filter((p) => !["joined", "customer", "not_now"].includes(p.stage)).length;
  const won = prospects.filter((p) => p.stage === "joined" || p.stage === "customer").length;
  const auto = prospects.filter((p) => p.autopilot).length;
  const due = prospects.filter((p) => p.next_follow_up_at && new Date(p.next_follow_up_at) <= new Date()).length;

  return (
    <>
      <PageHeader eyebrow="Prospecting" title={readOnly ? `${owner?.full_name ?? "Member"}'s prospects` : "My prospects"}
        description={readOnly ? "Read-only view of your team member's pipeline, so you can coach their follow-ups."
          : "Everyone you're talking to, stage by stage. Let Maximus AI follow up for you."}
        action={!readOnly && <AddProspect />} />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Pipeline summary">
        <StatCard label="In progress" value={active} icon={<MessageCircle className="size-4" />} />
        <StatCard label="Joined or bought" value={won} icon={<UserPlus className="size-4" />} tone="green" />
        <StatCard label="On AI follow-up" value={auto} icon={<Bot className="size-4" />} tone="navy" />
        <StatCard label="Follow-ups due" value={due} icon={<Phone className="size-4" />} tone="lime" />
      </section>

      {prospects.length === 0 ? (
        <Card>
          <EmptyState icon={<UserPlus className="size-6" />} title={readOnly ? "No prospects yet" : "Add your first prospect"}
            description={readOnly ? "This member hasn't added anyone yet." : "Add someone you met: their name, number and a note about them. Maximus AI can then write and send your follow-ups."}
            action={!readOnly && <AddProspect />} />
        </Card>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-4">
            {STAGES.map((s) => {
              const list = prospects.filter((p) => p.stage === s.key);
              return (
                <section key={s.key} className="w-[270px] shrink-0 rounded-2xl bg-surface-muted/60 p-2.5" aria-labelledby={`stage-${s.key}`}>
                  <h2 id={`stage-${s.key}`} className="mb-2 flex items-center gap-2 px-1.5 text-sm font-semibold">
                    <span className={cn("size-2.5 rounded-full", s.dot)} aria-hidden />{s.label}
                    <span className="ml-auto rounded-full bg-surface px-2 text-xs text-fg-muted">{list.length}</span>
                  </h2>
                  <ul className="space-y-2">
                    {list.map((p) => (
                      <li key={p.id} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <Avatar name={p.full_name} size={34} />
                          <Link href={`/prospects/${p.id}`} className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold hover:text-primary">{p.full_name}</span>
                            <span className="block truncate text-xs text-fg-subtle">
                              {p.last_reply_at ? `Replied ${formatRelative(p.last_reply_at)}` : p.last_contacted_at ? `Contacted ${formatRelative(p.last_contacted_at)}` : `Added ${formatRelative(p.created_at)}`}
                            </span>
                          </Link>
                          {!readOnly && <StageMenu id={p.id} stage={p.stage} />}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.autopilot && <Badge tone="blue"><Bot className="size-3" aria-hidden />AI following up</Badge>}
                          {p.opted_out && <Badge tone="red">Opted out</Badge>}
                          {p.notes && <span className="line-clamp-2 text-xs text-fg-muted">{p.notes}</span>}
                        </div>
                      </li>
                    ))}
                    {list.length === 0 && <li className="px-1.5 py-4 text-center text-xs text-fg-subtle">Nobody here</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
