import { LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/form";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatRelative } from "@/lib/utils";
import { COMPLAINT_CATEGORIES } from "@/lib/support";
import { updateTicketAction } from "../../support/actions";

export const metadata = { title: "Support tickets" };

type Ticket = { id: string; category: string; message: string; page: string | null; status: string; admin_note: string | null; created_at: string;
  profiles: { full_name: string; avatar_url: string | null; member_id: string } | null };

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("view_org_analytics");
  const status = (await searchParams).status ?? "open";
  const supabase = await createClient();
  let q = supabase.from("support_tickets")
    .select("id, category, message, page, status, admin_note, created_at, profiles!support_tickets_user_id_fkey(full_name, avatar_url, member_id)")
    .order("created_at", { ascending: false }).limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q.returns<Ticket[]>();
  const tabs = [["open", "Open"], ["in_progress", "Being handled"], ["resolved", "Resolved"], ["all", "All"]];
  return (
    <>
      <PageHeader eyebrow="Administration" title="Support tickets" description="Complaints and problems members sent from the chat bubble or Help page." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <a key={k} href={`/admin/support?status=${k}`} className={cn("rounded-full px-4 py-2 text-sm font-medium", status === k ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted")}>{l}</a>
        ))}
      </div>
      {(data ?? []).length === 0 ? <Card><EmptyState icon={<LifeBuoy className="size-6" />} title="Nothing here" description="No tickets in this list." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(data ?? []).map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={t.profiles?.full_name ?? "?"} src={t.profiles?.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.profiles?.full_name} <span className="font-normal text-fg-subtle">· {t.profiles?.member_id}</span></p>
                  <p className="text-xs text-fg-subtle">{COMPLAINT_CATEGORIES.find((c) => c.value === t.category)?.label} · {formatRelative(t.created_at)}{t.page ? ` · from ${t.page}` : ""}</p>
                </div>
                <Badge tone={t.status === "resolved" ? "green" : t.status === "in_progress" ? "amber" : "blue"}>{t.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{t.message}</p>
              <form action={updateTicketAction} className="mt-4 space-y-2 border-t border-border pt-4">
                <input type="hidden" name="id" value={t.id} />
                <Textarea name="admin_note" rows={2} maxLength={2000} defaultValue={t.admin_note ?? ""} placeholder="Reply to the member (they get notified)" aria-label="Reply" />
                <div className="flex gap-2">
                  <Select name="status" defaultValue={t.status} aria-label="Status" className="flex-1">
                    <option value="open">Open</option><option value="in_progress">Being handled</option><option value="resolved">Resolved</option>
                  </Select>
                  <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
                </div>
              </form>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
