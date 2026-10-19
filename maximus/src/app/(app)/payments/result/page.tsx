import { CircleCheckBig, Clock, XCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Payment" };

export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ ref?: string; cancelled?: string }> }) {
  const viewer = await requireViewer();
  const { ref, cancelled } = await searchParams;
  const supabase = await createClient();
  const { data: p } = ref
    ? await supabase.from("online_payments").select("purpose, amount, status").eq("tx_ref", ref).maybeSingle()
    : { data: null };
  const company = p?.purpose === "company_whitelabel" && ref
    ? (await supabase.from("company_signups").select("company_name, office_id, status").eq("tx_ref", ref).maybeSingle()).data : null;
  const joinLink = company?.office_id ? `${env.siteUrl}/register?office=${company.office_id}&ref=${encodeURIComponent(viewer.profile.referral_code)}` : null;
  const back = p?.purpose === "company_whitelabel" ? { href: "/office/brand", label: "Add your logo" }
    : p?.purpose === "white_label" ? { href: "/office/brand", label: "Back to branding" }
    : p?.purpose === "upwork_analyser" ? { href: "/tools/upwork", label: "Open the Upwork Analyser" }
    : { href: "/finance", label: "Back to savings & payments" };
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
              ? p.purpose === "company_whitelabel" ? `${company?.company_name ?? "Your company"} is ready! Add your logo, then share your join link with your members.`
                : p.purpose === "white_label" ? "White-label is unlocked. You can now remove “Powered by”."
                : p.purpose === "upwork_analyser" ? "The Upwork Account Analyser is unlocked. Analyse your profile now." : `${formatMoney(p.amount)} has been added to your ${p.purpose}.`
              : failed ? "No money was taken, or it didn't match. You can try again." : "Bank transfers can take a few minutes. We'll update this and notify you as soon as Flutterwave confirms it."}
          </p>
          {ok && joinLink && (
            <div className="mt-5 w-full rounded-2xl bg-surface-muted p-3 text-left">
              <p className="text-xs font-semibold text-fg-muted">Your members join with this link</p>
              <p className="mt-1 break-all font-mono text-sm">{joinLink}</p>
            </div>
          )}
          <LinkButton href={back.href} className="mt-6">{back.label}</LinkButton>
        </CardBody>
      </Card>
    </div>
  );
}
