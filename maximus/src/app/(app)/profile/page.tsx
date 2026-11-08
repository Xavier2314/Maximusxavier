import { Building2, CalendarDays, Mail } from "lucide-react";
import { rankLabel } from "@/lib/ranks";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
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
      <section className="mb-8 border-b border-border pb-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <AvatarUploader name={p.full_name} src={p.avatar_url} />
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">{p.full_name}</h1>
            <p className="mt-1 text-fg-muted tabular-nums">Member {p.member_id}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rankLabel(p.business_rank) && <Badge tone="lime">{rankLabel(p.business_rank)}</Badge>}
              {viewer.roles.map((r) => <Badge key={r}>{ROLE_LABELS[r]}</Badge>)}
            </div>
          </div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Personal details" />
          <CardBody><ProfileForm profile={p} /></CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Business status" description="Your rank in the business" />
            <CardBody><BusinessForm rank={p.business_rank ?? null} newlifeId={(priv?.newlife_id as string | undefined) ?? null} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Membership" />
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
