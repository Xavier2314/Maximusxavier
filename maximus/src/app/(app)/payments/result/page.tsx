import { CircleCheckBig, Clock, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Payment" };

export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ ref?: string; cancelled?: string }> }) {
  await requireViewer();
  const { ref, cancelled } = await searchParams;
  const supabase = await createClient();
  const { data: p } = ref
    ? await supabase.from("online_payments").select("purpose, amount, status").eq("tx_ref", ref).maybeSingle()
    : { data: null };
  const back = p?.purpose === "white_label" ? { href: "/office/brand", label: "Back to branding" } : { href: "/finance", label: "Back to savings & payments" };
  const ok = p?.status === "successful";
  const failed = p?.status === "failed" || cancelled;
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardBody className="flex flex-col items-center py-10 text-center">
          {ok ? <CircleCheckBig className="size-14 text-success" aria-hidden /> : failed ? <XCircle className="size-14 text-danger" aria-hidden /> : <Clock className="size-14 text-warning" aria-hidden />}
          <h1 className="mt-4 text-2xl font-bold">{ok ? "Payment received" : failed ? (cancelled ? "Payment cancelled" : "Payment not completed") : "Payment processing"}</h1>
          <p className="mt-2 text-fg-muted">
            {!p ? "We couldn't find this payment." : ok
              ? p.purpose === "white_label" ? "White-label is unlocked. You can now remove “Powered by”." : `${formatMoney(p.amount)} has been added to your ${p.purpose}.`
              : failed ? "No money was taken, or it didn't match. You can try again." : "Bank transfers can take a few minutes. We'll update this and notify you as soon as Flutterwave confirms it."}
          </p>
          <LinkButton href={back.href} className="mt-6">{back.label}</LinkButton>
        </CardBody>
      </Card>
    </div>
  );
}
