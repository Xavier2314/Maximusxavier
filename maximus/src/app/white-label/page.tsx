import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, Palette, Smartphone, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = {
  title: "Your own branded team app",
  description: "Get your company's own branded app for goals, attendance, teams, payments and more. Pay once and start today.",
};

const FEATURES = [
  { icon: Palette, title: "Your brand", text: "Your company name and colours. No “Powered by”." },
  { icon: Users, title: "Your team", text: "Team tree, sponsors, goals, evaluations and leaderboards." },
  { icon: Building2, title: "Your office", text: "QR check-in, attendance reports, announcements and calls." },
  { icon: Smartphone, title: "Works everywhere", text: "Phone, tablet and laptop. Installs like an app." },
];

/** Public, shareable page: a company pays and gets its own branded space automatically. */
export default async function WhiteLabelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: fees } = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await createAdminClient().from("app_settings").select("key, value").in("key", ["company_whitelabel_fee", "company_whitelabel_premium_fee"])
    : { data: null };
  const feeOf = (k: string, d: number) => Number(((fees ?? []).find((f) => f.key === k)?.value as { amount?: number } | undefined)?.amount ?? d);
  const prices = { standard: feeOf("company_whitelabel_fee", 5000), premium: feeOf("company_whitelabel_premium_fee", 10000) };

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/"><Logo className="h-8 w-auto" /></Link>
        {!user && <Link href="/login?next=/white-label" className="text-sm font-medium text-primary hover:underline">Sign in</Link>}
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-4 pb-16 pt-6 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <section>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary"><BadgeCheck className="size-3.5" aria-hidden />WHITE-LABEL</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Your own branded team app, ready today.</h1>
          <p className="mt-4 max-w-xl text-lg text-fg-muted">Run your team on a complete team app under your own name. Pay once and it&apos;s set up automatically. Then share your join link with your members.</p>
          <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-border">
              <p className="text-sm font-bold text-fg-muted">STANDARD</p>
              <p className="text-3xl font-extrabold">₦{prices.standard.toLocaleString()}</p>
              <p className="mt-1 text-sm text-fg-muted">Your name, logo and colours inside the app. No “Powered by”.</p>
            </div>
            <div className="rounded-2xl bg-brand-navy p-4 text-white shadow-[var(--shadow-card)] ring-2 ring-brand-lime">
              <p className="text-sm font-bold text-brand-lime">PREMIUM</p>
              <p className="text-3xl font-extrabold">₦{prices.premium.toLocaleString()}</p>
              <p className="mt-1 text-sm text-white/80">Everything in Standard, plus <b>no Maximus anywhere</b>: your own company link, branded sign-in and sign-up pages, and your name on the assistant and menus.</p>
            </div>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><f.icon className="size-5" aria-hidden /></span>
                <span><b className="block">{f.title}</b><span className="text-sm text-fg-muted">{f.text}</span></span>
              </li>
            ))}
          </ul>
          <ol className="mt-8 space-y-2 text-sm text-fg-muted">
            <li><b className="text-fg">1.</b> Fill in your company details and create your admin login.</li>
            <li><b className="text-fg">2.</b> Pay securely with card, transfer or USSD (Flutterwave).</li>
            <li><b className="text-fg">3.</b> Your branded app is created instantly. Add your logo and share your join link.</li>
          </ol>
        </section>
        <section className="card h-fit p-5 sm:p-6">
          <h2 className="text-lg font-bold">Set up your company</h2>
          <p className="mb-4 text-sm text-fg-muted">{user ? "You're signed in. Your account becomes the company admin." : "You'll be the company's admin."}</p>
          <CompanyForm signedIn={Boolean(user)} prices={prices} />
        </section>
      </main>
    </div>
  );
}
