import Link from "next/link";
import { CalendarCheck, GraduationCap, Network, Target, Wallet, Bot } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProductPreview } from "@/components/brand/product-preview";
import { buttonClass } from "@/components/ui/button";

const features = [
  { icon: Network, title: "Your team, as it really is", text: "Your sponsor line and every downline, with who brought in whom." },
  { icon: CalendarCheck, title: "Office check-ins", text: "Check in by location or the office QR poster, and keep your streak." },
  { icon: Target, title: "Goals and evaluations", text: "Monthly targets and five-day check-ins, with feedback from your sponsor." },
  { icon: Wallet, title: "Savings and contributions", text: "A ledger with approvals and receipts, so every naira is accounted for." },
  { icon: Bot, title: "Maximus AI", text: "Ask for a plan for the week or help following up with a prospect." },
  { icon: GraduationCap, title: "Academy", text: "Short courses on prospecting, sales and leading a team." },
];

export default function Landing() {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <Logo className="h-8 w-auto" />
        <nav className="flex items-center gap-1">
          <Link href="/login" className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium text-fg-muted hover:text-fg">Sign in</Link>
          <Link href="/register" className={buttonClass("primary", "sm")}>Join Maximus</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
            Run your team&apos;s day from one place
          </h1>
          <p className="mt-5 max-w-lg text-lg text-fg-muted">
            Maximus is where members check in, plan the day, follow up with prospects and track the month&apos;s goals, and where leaders see how the whole team is doing.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonClass("primary", "lg")}>Create your account</Link>
            <Link href="/login" className="inline-flex h-12 items-center px-2 font-medium text-primary hover:underline">I already have an account</Link>
          </div>
        </div>
        <ProductPreview className="mx-auto w-full max-w-md lg:max-w-none" />
      </section>

      <section aria-labelledby="features" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 id="features" className="text-2xl font-semibold tracking-tight">Everything a member and a leader needs</h2>
          <ul className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden />
                <div>
                  <h3 className="font-medium">{title}</h3>
                  <p className="mt-1 text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-fg-subtle sm:px-8">© {new Date().getFullYear()} Maximus. Built for the Maximus organisation.</footer>
    </main>
  );
}
