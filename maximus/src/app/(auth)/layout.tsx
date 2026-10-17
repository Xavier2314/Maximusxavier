import { CalendarCheck, Target, Trophy, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const highlights = [
  { icon: Users, title: "Grow your team", text: "See your downlines, support them and celebrate wins together." },
  { icon: CalendarCheck, title: "Show up consistently", text: "Smart office check-ins and attendance streaks." },
  { icon: Target, title: "Set goals that stick", text: "Monthly goals, five-day evaluations and sponsor feedback." },
  { icon: Trophy, title: "Rise to the top", text: "Track progress, earn recognition and lead with confidence." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="auth-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <Logo variant="full" className="h-14 w-auto self-start" />
        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-lime">Fulfilment in maximized potential</p>
          <h2 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight">
            Lead your team.<br />Measure your growth.<br /><span className="text-brand-lime">Win together.</span>
          </h2>
          <ul className="mt-10 grid gap-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-brand-lime ring-1 ring-white/10">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Logo variant="mark" mono className="pointer-events-none absolute -bottom-24 -right-24 h-[26rem] w-auto text-white/[0.04]" title="" />
        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Maximus. All rights reserved.</p>
      </aside>
      <main className="flex min-h-dvh flex-col bg-bg">
        <div className="auth-gradient px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-white lg:hidden">
          <Logo variant="full" className="h-10 w-auto" />
        </div>
        <div className="-mt-6 flex flex-1 items-start justify-center rounded-t-3xl bg-bg px-5 py-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none">
          <div className="w-full max-w-md animate-rise">{children}</div>
        </div>
      </main>
    </div>
  );
}
