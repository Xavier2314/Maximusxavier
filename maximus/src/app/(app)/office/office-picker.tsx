"use client";

import { usePathname, useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

/** Lets members who manage several offices choose which one to look at. */
export function OfficePicker({ offices, current }: { offices: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  if (offices.length < 2) return null;
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Office</span>
      <Building2 className="pointer-events-none absolute left-3 size-4 text-fg-subtle" aria-hidden />
      <select value={current} onChange={(e) => router.push(`${pathname}?office=${e.target.value}`)}
        className="h-10 appearance-none rounded-xl border border-border bg-surface pl-9 pr-8 text-sm font-medium hover:border-primary/40">
        {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
}
