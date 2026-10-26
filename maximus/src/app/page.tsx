import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, GraduationCap, Sparkles, Target, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const features = [
  { icon: Users, title: "Team hierarchy", text: "See your sponsor line and downlines as a living network." },
  { icon: CalendarCheck, title: "Smart attendance", text: "Location-aware office check-ins and streaks." },
  { icon: Target, title: "Goals & evaluations", text: "Monthly goals and five-day check-ins with sponsor feedback." },
  { icon: Wallet, title: "Savings & contributions", text: "An auditable ledger with approvals and receipts." },
  { icon: Sparkles, title: "Maximus AI", text: "A personal growth coach trained on approved materials." },
  { icon: GraduationCap, title: "Maximus Academy", text: "Courses for prospecting, sales and leadership." },
];

export default function Landing() {
  return (
    <main className="auth-gradient min-h-dvh text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Logo className="h-9 w-auto" />
        <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">Sign in</Link>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-lime">Fulfilment in maximized potential</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          The growth platform for leaders who <span className="text-brand-lime">build winning teams.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">
          Attendance, goals, evaluations, finances and leadership development — measurable, accountable and in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-lime px-6 font-semibold text-brand-navy hover:brightness-95">
            Join Maximus <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/login" className="inline-flex h-12 items-center rounded-2xl px-6 font-semibold ring-1 ring-white/25 hover:bg-white/10">
            I already have an account
          </Link>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 backdrop-blur">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-blue text-white"><Icon className="size-5" aria-hidden /></span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-white/60">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-16 flex items-center gap-2 text-xs text-white/60"><BarChart3 className="size-3.5" aria-hidden /> Built for the Maximus organisation.</p>
      </section>
    </main>
  );
}
