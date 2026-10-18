import { ListChecks, Quote } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Badge, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayIn } from "@/lib/utils";
import { addChecklistItemAction, addThoughtAction, toggleChecklistItemAction } from "./actions";

export const metadata = { title: "Daily checklist & thoughts" };

export default async function DailyAdminPage() {
  const viewer = await requirePermission("manage_content");
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const [{ data: items }, { data: thoughts }] = await Promise.all([
    supabase.from("checklist_items").select("id, title, is_active").order("sort_order"),
    supabase.from("daily_thoughts").select("id, body, author, show_on").gte("show_on", today).order("show_on").limit(14),
  ]);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Daily checklist & thoughts" description="What every member sees on their dashboard each day." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Daily checklist" icon={<ListChecks className="size-4" />} />
          <CardBody className="space-y-4">
            <ul className="divide-y divide-border">
              {(items ?? []).map((it) => (
                <li key={it.id as string} className="flex items-center gap-3 py-2.5">
                  <span className={it.is_active ? "flex-1" : "flex-1 text-fg-subtle line-through"}>{it.title as string}</span>
                  <form action={toggleChecklistItemAction}>
                    <input type="hidden" name="id" value={it.id as string} />
                    <input type="hidden" name="active" value={it.is_active ? "false" : "true"} />
                    <SubmitButton size="sm" variant="ghost">{it.is_active ? "Hide" : "Show"}</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
            <form action={addChecklistItemAction} className="flex gap-2">
              <Input name="title" placeholder="e.g. Post on your WhatsApp status" aria-label="New checklist item" required minLength={2} maxLength={120} />
              <SubmitButton>Add</SubmitButton>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Thought of the day" icon={<Quote className="size-4" />} description="Schedule quotes ahead. One per day." />
          <CardBody className="space-y-4">
            <form action={addThoughtAction} className="space-y-3">
              <Field label="Quote" htmlFor="body"><Textarea id="body" name="body" required minLength={5} maxLength={500} rows={2} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Author" htmlFor="author" optional><Input id="author" name="author" maxLength={120} /></Field>
                <Field label="Show on" htmlFor="show_on"><Input id="show_on" name="show_on" type="date" min={today} defaultValue={today} required /></Field>
              </div>
              <SubmitButton>Save thought</SubmitButton>
            </form>
            <ul className="space-y-2 border-t border-border pt-4">
              {(thoughts ?? []).map((t) => (
                <li key={t.id as string} className="text-sm">
                  <Badge tone={t.show_on === today ? "green" : "neutral"}>{t.show_on === today ? "Today" : formatDate(t.show_on as string, { weekday: "short", day: "numeric", month: "short" })}</Badge>
                  <p className="mt-1">“{t.body as string}”{t.author ? ` — ${t.author as string}` : ""}</p>
                </li>
              ))}
              {(thoughts ?? []).length === 0 && <li className="text-sm text-fg-muted">Nothing scheduled. Members will keep seeing the most recent thought.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
