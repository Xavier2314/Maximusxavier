import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePermission } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rotateQrAction } from "../../actions";
import { PrintButton } from "./print-button";

export const metadata = { title: "Check-in QR poster" };

/** Printable poster: members scan it with their phone camera to check in. */
export default async function QrPosterPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("manage_office");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: office }, { data: code, error }] = await Promise.all([
    supabase.from("offices").select("id, name, address").eq("id", id).maybeSingle(),
    supabase.rpc("office_qr_code", { p_office: id }),
  ]);
  if (!office || error || !code) notFound();
  const url = `${env.siteUrl.replace(/\/$/, "")}/checkin/${code as string}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/offices" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Offices</Link>
        <div className="flex gap-2">
          <PrintButton />
          <form action={rotateQrAction}>
            <input type="hidden" name="office_id" value={office.id as string} />
            <SubmitButton variant="outline" pendingLabel="Changing…"><RefreshCw className="size-4" aria-hidden /> New code</SubmitButton>
          </form>
        </div>
      </div>
      <p className="mb-4 text-sm text-fg-muted print:hidden">Print this and put it on the wall at the entrance. If the code is shared outside the office, press “New code” and print again; the old poster stops working.</p>
      <article className="mx-auto max-w-[640px] rounded-[2rem] bg-white p-10 text-center text-[#0f172a] shadow-[var(--shadow-card)] print:max-w-none print:shadow-none">
        <div className="flex justify-center"><Logo className="h-12" /></div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Check in here</h1>
        <p className="mt-2 text-lg text-[#475569]">{office.name as string}</p>
        <div className="mx-auto mt-8 w-full max-w-[380px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <ol className="mx-auto mt-8 max-w-sm space-y-1 text-left text-base">
          <li>1. Open your phone camera</li>
          <li>2. Point it at the code</li>
          <li>3. Tap the link. You&apos;re checked in</li>
        </ol>
        <p className="mt-8 text-sm text-[#64748b]">Fulfilment in maximized potential</p>
      </article>
    </>
  );
}
