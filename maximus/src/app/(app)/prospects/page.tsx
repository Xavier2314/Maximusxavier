import Link from "next/link";
import { Bot, Download, LayoutGrid, List, MessageCircle, Phone, Search, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { STAGES, stageLabel, type Prospect } from "@/lib/prospects";
import { createClient } from "@/lib/supabase/server";
import { cn, formatRelative } from "@/lib/utils";
import { AddProspect } from "./add-prospect";
import { ImportContacts } from "./import-contacts";
import { StageMenu } from "./stage-menu";

export const metadata = { title: "Contacts" };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ member?: string; q?: string; tag?: string; view?: string }> }) {
  const viewer = await requireViewer();
  const { member, q: qRaw, tag: tagRaw, view: viewRaw } = await searchParams;
  const q = (qRaw ?? "").trim().slice(0, 80);
  const tag = (tagRaw ?? "").trim().slice(0, 30);
  const view = viewRaw === "list" ? "list" : "board";
  const ownerId = member && /^[0-9a-f-]{36}$/.test(member) ? member : viewer.id;
  const readOnly = ownerId !== viewer.id;
  const supabase = await createClient();
  const [{ data }, { data: owner }, { data: tagCounts }] = await Promise.all([
    supabase.from("prospects").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(5000).returns<Prospect[]>(),
    readOnly ? supabase.from("profiles").select("full_name").eq("id", ownerId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("contact_tag_counts", { p_user: ownerId }),
  ]);
  const everyone = data ?? [];
  const ql = q.toLowerCase();
  const prospects = everyone.filter((p) => (!tag || (p.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase()))
    && (!ql || [p.full_name, p.phone ?? "", p.email ?? "", p.source ?? "", p.notes ?? ""].some((x) => x.toLowerCase().includes(ql))));
  const filtering = Boolean(q || tag);
  const href = (patch: Record<string, string>) => { const n = new URLSearchParams({ ...(member ? { member } : {}), ...(q ? { q } : {}), ...(tag ? { tag } : {}), ...(view === "list" ? { view } : {}), ...patch }); for (const [k, v] of [...n]) if (!v) n.delete(k); const str = n.toString(); return `/prospects${str ? `?${str}` : ""}`; };
  const active = prospects.filter((p) => !["joined", "customer", "not_now"].includes(p.stage)).length;
  const won = prospects.filter((p) => p.stage === "joined" || p.stage === "customer").length;
  const auto = prospects.filter((p) => p.autopilot).length;
  const due = prospects.filter((p) => p.next_follow_up_at && new Date(p.next_follow_up_at) <= new Date()).length;

  return (
    <>
      <PageHeader eyebrow="Contacts" title={readOnly ? `${owner?.full_name ?? "Member"}'s contacts` : "My contacts"}
        description={readOnly ? "Read-only view of your team member's pipeline, so you can coach their follow-ups."
          : "Everyone you talk to or sell to, in one place: people you met, funnel leads, customers and survey answers. Tag them, search them, and let Maximus AI follow up."}
        action={!readOnly && <div className="flex flex-wrap gap-2"><a href="/prospects/export" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted"><Download className="size-4" aria-hidden />Export</a><ImportContacts /><AddProspect /></div>} />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Pipeline summary">
        <StatCard label="In progress" value={active} icon={<MessageCircle className="size-4" />} />
        <StatCard label="Joined or bought" value={won} icon={<UserPlus className="size-4" />} tone="green" />
        <StatCard label="On AI follow-up" value={auto} icon={<Bot className="size-4" />} tone="navy" />
        <StatCard label="Follow-ups due" value={due} icon={<Phone className="size-4" />} tone="lime" />
      </section>

      <div className="mb-4 space-y-3" role="search">
        <form action="/prospects" method="get" className="flex flex-wrap items-center gap-2">
          {member && <input type="hidden" name="member" value={member} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          {view === "list" && <input type="hidden" name="view" value="list" />}
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input name="q" defaultValue={q} placeholder="Search name, phone, email, notes" aria-label="Search contacts" className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm" />
          </div>
          <div className="inline-flex rounded-xl bg-surface-muted p-1" role="group" aria-label="View">
            <Link href={href({ view: "" })} aria-current={view === "board"} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", view === "board" ? "bg-surface shadow-sm" : "text-fg-muted")}><LayoutGrid className="size-4" aria-hidden />Board</Link>
            <Link href={href({ view: "list" })} aria-current={view === "list"} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", view === "list" ? "bg-surface shadow-sm" : "text-fg-muted")}><List className="size-4" aria-hidden />List</Link>
          </div>
          {filtering && <Link href={href({ q: "", tag: "" })} className="text-sm font-medium text-primary">Clear filters</Link>}
        </form>
        {(tagCounts ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Filter by tag">
            {(tagCounts as { tag: string; total: number }[]).map((t) => (
              <Link key={t.tag} href={href({ tag: tag.toLowerCase() === t.tag.toLowerCase() ? "" : t.tag })} aria-pressed={tag.toLowerCase() === t.tag.toLowerCase()} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", tag.toLowerCase() === t.tag.toLowerCase() ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-muted hover:bg-surface-muted")}>{t.tag} <span className="opacity-60">{t.total}</span></Link>
            ))}
          </div>
        )}
        {filtering && <p className="text-sm text-fg-muted" role="status">{prospects.length} of {everyone.length} contacts match.</p>}
      </div>

      {everyone.length > 0 && prospects.length === 0 ? (
        <Card><EmptyState icon={<Search className="size-6" />} title="No contacts match" description="Try a different search or clear the filters." action={<Link href={href({ q: "", tag: "" })} className="text-sm font-medium text-primary">Clear filters</Link>} /></Card>
      ) : prospects.length === 0 ? (
        <Card>
          <EmptyState icon={<UserPlus className="size-6" />} title={readOnly ? "No contacts yet" : "Add your first contact"}
            description={readOnly ? "This member hasn't added anyone yet." : "Add someone you met: their name, number and a note about them. Maximus AI can then write and send your follow-ups."}
            action={!readOnly && <AddProspect />} />
        </Card>
      ) : view === "list" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-fg-subtle"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Phone</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Stage</th><th className="px-4 py-3 font-semibold">Tags</th><th className="px-4 py-3 font-semibold">Source</th><th className="px-4 py-3 font-semibold">Added</th></tr></thead>
              <tbody className="divide-y divide-border">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3"><Link href={`/prospects/${p.id}`} className="flex items-center gap-2.5 font-semibold hover:text-primary"><Avatar name={p.full_name} size={28} />{p.full_name}</Link></td>
                    <td className="px-4 py-3 text-fg-muted">{p.phone ? `+${p.phone}` : "—"}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-fg-muted">{p.email ?? "—"}</td>
                    <td className="px-4 py-3"><Badge tone="blue">{stageLabel(p.stage)}</Badge></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(p.tags ?? []).slice(0, 4).map((t) => <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">{t}</span>)}</div></td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-fg-muted">{p.source ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-fg-subtle">{formatRelative(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                          {(p.tags ?? []).slice(0, 3).map((t) => <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">{t}</span>)}
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
