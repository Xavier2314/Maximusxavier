"use client";
import Link from "next/link";
import { DateTime } from "luxon";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/client/api";

export default function ProposalsPage() {
  const { data, error } = useApi<{ proposals: { id: string; title: string; summary: string | null; status: string; created_at: string }[] }>("/api/proposals");
  if (error) return <ErrorState error={error} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div>
      <PageHeader title="Proposals" subtitle="Schedule suggestions waiting for — or decided by — you." />
      {data.proposals.length === 0 ? <EmptyState title="No proposals yet" /> : (
        <Card className="divide-y divide-line">
          {data.proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.title}</p><p className="truncate text-sm text-muted">{p.summary}</p></div>
              <div className="text-right"><Badge color={p.status === "pending" ? "#8b7fd6" : p.status === "rejected" ? "#66718a" : "#6f9a7c"}>{p.status.replace("_", " ")}</Badge><p className="mt-1 text-xs text-muted">{DateTime.fromISO(p.created_at).toRelative()}</p></div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
