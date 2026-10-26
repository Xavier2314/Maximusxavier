import { BadgeCheck, Building2, CalendarDays, Mail, Medal, UserRound } from "lucide-react";
import { rankLabel } from "@/lib/ranks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireViewer, ROLE_LABELS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { CopyReferral } from "../team/copy-referral";
import { AvatarUploader, BusinessForm, ProfileForm } from "./forms";

export const metadata = { title: "My profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const p = viewer.profile;
  const supabase = await createClient();
  const [{ data: office }, { data: priv }] = await Promise.all([
    p.office_id ? supabase.from("offices").select("name").eq("id", p.office_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("member_private").select("newlife_id").eq("user_id", p.id).maybeSingle(),
  ]);

  return (
    <>
      <section className="hero-gradient relative mb-6 overflow-hidden rounded-2xl p-6 text-white sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <AvatarUploader name={p.full_name} src={p.avatar_url} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{p.full_name}</h1>
            <p className="mt-1 font-mono text-brand-lime">{p.member_id}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {rankLabel(p.business_rank) && <span className="rounded-full bg-brand-lime px-2.5 py-0.5 text-xs font-semibold text-brand-navy">{rankLabel(p.business_rank)}</span>}
              {viewer.roles.map((r) => <span key={r} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs ring-1 ring-white/15">{ROLE_LABELS[r]}</span>)}
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Personal details" icon={<UserRound className="size-4" />} />
          <CardBody><ProfileForm profile={p} /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Business status" icon={<Medal className="size-4" />} description="Your rank in the business" />
            <CardBody><BusinessForm rank={p.business_rank ?? null} newlifeId={(priv?.newlife_id as string | undefined) ?? null} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Membership" icon={<BadgeCheck className="size-4" />} />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><Mail className="size-4 text-fg-subtle" aria-hidden /><dt className="sr-only">Email</dt><dd className="truncate">{p.email}</dd></div>
                <div className="flex items-center gap-3"><Building2 className="size-4 text-fg-subtle" aria-hidden /><dt className="sr-only">Office</dt><dd>{office?.name ?? "No office assigned"}</dd></div>
                <div className="flex items-center gap-3"><CalendarDays className="size-4 text-fg-subtle" aria-hidden /><dt className="sr-only">Joined</dt><dd>Member since {formatDate(p.joined_at, { month: "long", year: "numeric" })}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-fg-subtle">To change your email, office or sponsor, contact an administrator.</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Your referral code" />
            <CardBody><CopyReferral code={p.referral_code} memberId={p.member_id} /></CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
