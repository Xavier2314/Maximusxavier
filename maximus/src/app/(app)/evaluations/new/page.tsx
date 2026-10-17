import Link from "next/link";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMonths, evaluationDates, formatDate, monthStart, todayIn } from "@/lib/utils";
import { EvaluationForm } from "../evaluation-form";

export const metadata = { title: "New evaluation" };

export default async function NewEvaluationPage() {
  const viewer = await requireViewer();
  const today = todayIn(viewer.profile.timezone);
  const thisMonth = monthStart(today);
  // Periods from the last two months up to today; late submissions are allowed.
  const candidates = [...evaluationDates(addMonths(thisMonth, -1)), ...evaluationDates(today)].filter((d) => d <= today).reverse();
  const supabase = await createClient();
  const { data: done } = await supabase.from("evaluations").select("period_date").eq("user_id", viewer.id).in("period_date", candidates);
  const submitted = new Set((done ?? []).map((d) => d.period_date as string));
  const open = candidates.filter((d) => !submitted.has(d)).slice(0, 4);

  return (
    <>
      <Link href="/evaluations" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Evaluations</Link>
      <PageHeader title="Five-day evaluation" description="Ten quick questions. Be honest — this is how your sponsor knows how to help." />
      <Card className="max-w-3xl">
        {open.length === 0 ? (
          <EmptyState icon={<CircleCheck className="size-6" />} title="You're up to date"
            description="All recent evaluations are submitted. The next one opens on the next evaluation date."
            action={<LinkButton href="/evaluations" variant="outline">View history</LinkButton>} />
        ) : (
          <CardBody className="sm:p-8">
            <EvaluationForm periods={open.map((d, i) => ({
              value: d,
              label: `${formatDate(d, { weekday: "short", day: "numeric", month: "long" })}${i === 0 && d === candidates[0] ? " (current)" : " (late)"}`,
            }))} />
          </CardBody>
        )}
      </Card>
    </>
  );
}
