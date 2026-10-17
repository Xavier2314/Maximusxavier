import { ArrowDownLeft, ArrowUpRight, Clock, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import type { FinancialTransaction } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const KIND_LABEL: Record<FinancialTransaction["kind"], string> = {
  deposit: "Savings deposit", contribution: "Contribution", withdrawal: "Withdrawal", adjustment: "Adjustment", reversal: "Reversal",
};

export function LedgerTable({ rows }: { rows: (FinancialTransaction & { account_kind?: string })[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <caption className="sr-only">Ledger entries, most recent first</caption>
        <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Entry</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-border/60 last:border-0">
              <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{formatDate(t.occurred_on)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.direction === 1 ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                    {t.direction === 1 ? <ArrowDownLeft className="size-4" aria-label="Credit" /> : <ArrowUpRight className="size-4" aria-label="Debit" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{KIND_LABEL[t.kind]}{t.account_kind ? <span className="font-normal text-fg-subtle"> · {t.account_kind}</span> : null}</p>
                    {t.note && <p className="max-w-xs truncate text-xs text-fg-subtle">{t.note}</p>}
                  </div>
                  {t.receipt_path && (
                    <a href={`/api/receipts?path=${encodeURIComponent(t.receipt_path)}`} target="_blank" rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline" aria-label="View receipt">
                      <Paperclip className="size-3.5" aria-hidden /> Receipt
                    </a>
                  )}
                </div>
              </td>
              <td className={cn("whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums", t.status === "rejected" && "text-fg-subtle line-through")}>
                {t.direction === 1 ? "+" : "−"}{formatMoney(t.amount)}
              </td>
              <td className="px-4 py-3">
                {t.status === "confirmed" && <Badge tone="green">Confirmed</Badge>}
                {t.status === "pending" && <Badge tone="blue"><Clock className="size-3" aria-hidden /> Pending</Badge>}
                {t.status === "rejected" && <Badge tone="red">Rejected</Badge>}
                {t.source === "self_reported" && t.status !== "confirmed" && <span className="ml-1 text-xs text-fg-subtle">self-reported</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
