"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { ProposalReview, type ProposalRecord } from "@/components/ProposalReview";
import { useApi } from "@/lib/client/api";
import type { CategoryRow } from "@/lib/types";

export default function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, mutate } = useApi<{ proposal: ProposalRecord }>(`/api/proposals/${id}`);
  const { data: cats } = useApi<{ categories: CategoryRow[] }>("/api/categories");
  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (!data || !cats) return <Skeleton className="h-96" />;
  return (
    <div>
      <PageHeader title={data.proposal.title} subtitle="Review the suggested changes. Nothing changes until you approve." />
      <ProposalReview proposal={data.proposal} categories={cats.categories} onDone={(applied) => { mutate(); if (applied) router.push("/"); }} />
    </div>
  );
}
