import { ArrowDownLeft, ArrowUpRight, BadgeCheck, CreditCard, Landmark, PiggyBank, Receipt, Send, ShieldCheck, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { joinBankWaitlistAction, leaveBankWaitlistAction } from "./actions";

export const metadata = { title: "Maximus Bank" };

const FEATURES = [
  { key: "account", icon: Landmark, title: "Your own Naira account", text: "A real account number in your name to receive transfers from any Nigerian bank." },
  { key: "savings", icon: PiggyBank, title: "Savings vault", text: "Lock money towards a goal and watch it grow, linked to your monthly goals." },
  { key: "transfers", icon: Send, title: "Instant transfers", text: "Send Naira to any bank account or to other Maximus members in seconds." },
  { key: "commissions", icon: Users, title: "Earnings paid in-app", text: "Commissions and team payouts land straight in your Maximus account." },
  { key: "bills", icon: Receipt, title: "Airtime, data & bills", text: "Top up and pay bills without leaving the app." },
  { key: "cards", icon: CreditCard, title: "Maximus debit card", text: "Spend your balance anywhere with a Naira card." },
] as const;

export default async function BankPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: me }, { data: count }] = await Promise.all([
    supabase.from("bank_waitlist").select("interests, created_at").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("bank_waitlist_count"),
  ]);
  const joined = Boolean(me);

  return (
    <>
      <PageHeader eyebrow="Maximus Bank" title="Your money, in Naira" description="Banking built into Maximus. Coming soon." />

      <section className="hero-gradient relative mb-6 overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-8">
        <div className="wedge absolute -right-6 -top-4 h-[74px] w-[100px] scale-[2.4] bg-brand-green/25" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-navy">Coming soon</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Maximus Bank</h2>
            <p className="mt-2 max-w-md text-white/75">Receive, save and send Naira from the same app you run your business in. Naira (₦) only.</p>
            <p className="mt-4 text-sm text-white/60">{(count as number | null) ?? 0} member{count === 1 ? "" : "s"} on the waitlist</p>
          </div>
          {/* Preview of the account dashboard. No real balances are shown until launch. */}
          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur" aria-label="Preview of the Maximus Bank dashboard">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Available balance</span><span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">NGN</span>
            </div>
            <p className="mt-1 text-4xl font-bold tracking-tight">₦ ••••••</p>
            <p className="mt-1 text-xs text-white/50">Account number available at launch</p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              {[{ i: ArrowDownLeft, t: "Receive" }, { i: ArrowUpRight, t: "Send" }, { i: PiggyBank, t: "Save" }].map(({ i: I, t }) => (
                <span key={t} className="rounded-2xl bg-white/10 py-3 opacity-70"><I className="mx-auto mb-1 size-5" aria-hidden />{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="What you'll be able to do" icon={<Landmark className="size-4" />} />
          <CardBody>
            <ul className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.key} className="flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><f.icon className="size-5" aria-hidden /></span>
                  <span><span className="block font-semibold">{f.title}</span><span className="text-sm text-fg-muted">{f.text}</span></span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title={joined ? "You're on the list" : "Join the waitlist"} icon={<BadgeCheck className="size-4" />}
            description={joined ? "We'll notify you the moment Maximus Bank opens." : "Be first to get your account when we launch."} />
          <CardBody>
            {joined ? (
              <form action={leaveBankWaitlistAction} className="space-y-3">
                <div className="flex flex-wrap gap-1.5">{((me?.interests as string[] | null) ?? []).map((i) => <Badge key={i} tone="blue">{FEATURES.find((f) => f.key === i)?.title ?? i}</Badge>)}</div>
                <SubmitButton variant="ghost" size="sm" pendingLabel="Leaving…">Leave the waitlist</SubmitButton>
              </form>
            ) : (
              <form action={joinBankWaitlistAction} className="space-y-3">
                <p className="text-sm text-fg-muted">What would you use most?</p>
                {FEATURES.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="interests" value={f.key} className="size-4 accent-[var(--primary)]" /> {f.title}
                  </label>
                ))}
                <SubmitButton className="w-full" pendingLabel="Joining…">Join the waitlist</SubmitButton>
              </form>
            )}
            <p className="mt-4 flex gap-2 text-xs text-fg-subtle"><ShieldCheck className="size-4 shrink-0" aria-hidden />
              Maximus Bank will run with a CBN-licensed banking partner. Until launch, Maximus does not hold or move any money.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
