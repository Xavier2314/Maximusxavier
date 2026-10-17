import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMonths, formatDate, monthStart, todayIn } from "@/lib/utils";
import { GoalForm } from "../goal-form";

export const metadata = { title: "Set goals" };

export default async function NewGoalPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const viewer = await requireViewer();
  const thisMonth = monthStart(todayIn(viewer.profile.timezone));
  const months = [0, 1].map((n) => addMonths(thisMonth, n)).map((m) => ({ value: m, label: formatDate(m, { month: "long", year: "numeric" }) }));
  const { month } = await searchParams;
  const selected = months.some((m) => m.value === month) ? month! : thisMonth;

  // If goals already exist for that month, open them instead.
  const supabase = await createClient();
  const { data: existing } = await supabase.from("monthly_goals").select("id").eq("user_id", viewer.id).eq("month", selected).maybeSingle();
  if (existing) redirect(`/goals/${existing.id}`);

  return (
    <>
      <Link href="/goals" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Goals</Link>
      <PageHeader title="Set your monthly goals" description="Only fill the targets that matter to you this month. Progress updates automatically from your evaluations, orders and confirmed savings." />
      <Card className="max-w-3xl"><CardBody className="sm:p-8"><GoalForm months={months} defaultMonth={selected} /></CardBody></Card>
    </>
  );
}
