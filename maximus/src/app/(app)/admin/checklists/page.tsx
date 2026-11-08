import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { formatMinutes } from "@/lib/checklists";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/utils";

export const metadata = { title: "Pushed checklists" };

type Row = { id: string; title: string; due_at: string | null; audience: string; created_at: string;
  pushed_checklist_items: { minutes: number }[]; pushed_checklist_recipients: { user_id: string }[] };

export default async function ChecklistsPage() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const { data } = await supabase.from("pushed_checklists")
    .select("id, title, due_at, audience, created_at, pushed_checklist_items(minutes), pushed_checklist_recipients(user_id)")
    .order("created_at", { ascending: false }).limit(50).returns<Row[]>();
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Pushed checklists" action={<LinkButton href="/admin/checklists/new"><Plus className="size-4" aria-hidden /> Push a checklist</LinkButton>} />
      {rows.length ? (
        <ul className="space-y-2.5">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/checklists/${c.id}`} className="flex items-center gap-4 rounded-[22px] bg-surface px-5 py-4 transition-colors hover:bg-surface-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl leading-tight">{c.title}</span>
                  <span className="mt-1 block text-sm text-fg-muted">
                    {c.pushed_checklist_items.length} items, {formatMinutes(c.pushed_checklist_items.reduce((s, i) => s + i.minutes, 0))}
                    {" · "}{c.audience === "everyone" ? "Everyone" : `${c.pushed_checklist_recipients.length} people`}
                    {" · "}pushed {formatRelative(c.created_at)}
                    {c.due_at ? ` · due ${formatDate(c.due_at, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[22px] bg-surface">
          <EmptyState art="tasks" title="No checklists pushed yet"
            description="Send a timed checklist to everyone, or to the people you pick."
            action={<LinkButton href="/admin/checklists/new"><Plus className="size-4" aria-hidden /> Push a checklist</LinkButton>} />
        </div>
      )}
    </>
  );
}
