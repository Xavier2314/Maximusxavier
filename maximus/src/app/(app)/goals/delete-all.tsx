"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FormMessage } from "@/components/ui/form";
import { deleteAllDraftsAction } from "./actions";
import { deleteAllPeriodGoalsAction, type Period } from "./period-actions";

/** "Delete all": clears this week's or today's goals, or all monthly drafts, after a confirmation. */
export function DeleteAllGoals({ period, count }: { period: Period | "monthly"; count: number }) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (!count && !notice) return null;
  const what = period === "monthly" ? `all ${count} monthly ${count === 1 ? "draft" : "drafts"}` : `all ${count} of ${period === "weekly" ? "this week's" : "today's"} goals`;
  return (
    <div className="space-y-2">
      {count > 0 && (
        <button type="button" disabled={pending}
          onClick={() => {
            if (!confirm(`Delete ${what}? This can't be undone.`)) return;
            start(async () => {
              const r = period === "monthly" ? await deleteAllDraftsAction() : await deleteAllPeriodGoalsAction(period);
              setNotice(r);
              router.refresh();
            });
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft">
          <Trash2 className="size-4" aria-hidden />{pending ? "Deleting…" : period === "monthly" ? "Delete all drafts" : "Delete all and start over"}
        </button>
      )}
      <FormMessage state={notice} />
    </div>
  );
}
