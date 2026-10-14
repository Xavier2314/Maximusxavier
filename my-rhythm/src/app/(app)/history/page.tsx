"use client";
import Link from "next/link";
import { DateTime } from "luxon";
import { RotateCcw } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";

interface H { id: string; batch_id: string; proposal_id: string | null; entity: string; action: string; description: string; undone_at: string | null; created_at: string }

export default function HistoryPage() {
  const { data, error, mutate } = useApi<{ history: H[] }>("/api/history");
  const toast = useToast();
  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-96" />;
  const batches = new Map<string, H[]>();
  for (const h of data.history) batches.set(h.batch_id, [...(batches.get(h.batch_id) ?? []), h]);
  return (
    <div>
      <PageHeader title="Change history" subtitle="Every schedule change is recorded. Undo any batch." />
      {batches.size === 0 ? <EmptyState title="No changes yet" body="Edits, approvals and moves will appear here." /> : (
        <div className="space-y-3">
          {[...batches.entries()].map(([batch, rows]) => {
            const undone = rows.every((r) => r.undone_at);
            return (
              <Card key={batch} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{DateTime.fromISO(rows[0].created_at).toFormat("ccc d LLL yyyy, h:mm a")}{rows[0].proposal_id && <> · <Link className="text-lavender" href={`/proposals/${rows[0].proposal_id}`}>from proposal</Link></>}</p>
                    <ul className="mt-1 space-y-0.5">{rows.map((r) => <li key={r.id} className={undone ? "text-muted line-through" : ""}>{r.description}</li>)}</ul>
                  </div>
                  {undone ? <Badge>Undone</Badge> : (
                    <Button size="sm" variant="secondary" onClick={async () => {
                      try { await api("/api/history/undo", { body: { batchId: batch } }); toast.show("success", "Undone. Reminders updated."); mutate(); }
                      catch (e) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
                    }}><RotateCcw className="h-4 w-4" /> Undo</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
