import { LifeBuoy } from "lucide-react";
import { ComplaintForm } from "@/components/complaint-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { COMPLAINT_CATEGORIES } from "@/lib/support";

export const metadata = { title: "Help & complaints" };

const STATUS = { open: { label: "Received", tone: "blue" }, in_progress: { label: "Being handled", tone: "amber" }, resolved: { label: "Resolved", tone: "green" } } as const;

export default async function SupportPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("id, category, message, status, admin_note, created_at")
    .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <PageHeader eyebrow="Help" title="Help & complaints" description="Tell the admin team about a problem. You'll get a notification when they respond." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader title="Make a complaint" icon={<LifeBuoy className="size-4" />} />
          <CardBody><ComplaintForm page="/support" /></CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Your complaints" />
          <CardBody>
            {(data ?? []).length === 0 ? <p className="text-sm text-fg-muted">You haven&apos;t sent any complaints.</p> : (
              <ul className="space-y-3">
                {(data ?? []).map((t) => {
                  const st = STATUS[t.status as keyof typeof STATUS];
                  return (
                    <li key={t.id as string} className="rounded-2xl border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <span className="text-xs text-fg-subtle">{COMPLAINT_CATEGORIES.find((c) => c.value === t.category)?.label} · {formatRelative(t.created_at as string)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line">{t.message as string}</p>
                      {t.admin_note && <p className="mt-2 rounded-xl bg-success-soft px-3 py-2 text-success">Admin: {t.admin_note as string}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
