import { CalendarCheck, Target, Trophy, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { companyFromCookie, type CompanyBrand } from "@/lib/company-brand";

/** A Premium company's mark on its members' sign-in pages (no Maximus). */
function CompanyMark({ c, large = false }: { c: CompanyBrand; large?: boolean }) {
  return c.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.logo} alt={c.name} className={large ? "h-14 w-auto max-w-[220px] self-start object-contain" : "h-10 w-auto max-w-[180px] object-contain"} />
  ) : (
    <span className="flex items-center gap-3 self-start">
      <span className="grid size-11 place-items-center rounded-2xl bg-white/15 text-xl font-bold">{c.name.slice(0, 1).toUpperCase()}</span>
      <span className="text-2xl font-bold tracking-tight">{c.name}</span>
    </span>
  );
}

const highlights = [
  { icon: Users, title: "Grow your team", text: "See your downlines, support them and celebrate wins together." },
  { icon: CalendarCheck, title: "Show up consistently", text: "Smart office check-ins and attendance streaks." },
  { icon: Target, title: "Set goals that stick", text: "Monthly goals, five-day evaluations and sponsor feedback." },
  { icon: Trophy, title: "Rise to the top", text: "Track progress, earn recognition and lead with confidence." },
];

export async function generateMetadata() {
  const c = await companyFromCookie();
  return c?.full ? { title: { template: `%s · ${c.name}`, default: c.name } } : {};
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const company = await companyFromCookie();
  const brand = company?.full ? company : null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside style={brand?.primary ? { background: brand.primary } : undefined} className="auth-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        {brand ? <CompanyMark c={brand} large /> : <Logo variant="full" className="h-14 w-auto self-start" />}
        <div className="relative z-10 my-auto max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-lime">{brand ? brand.name : "Fulfilment in maximized potential"}</p>
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
        {!brand && <Logo variant="mark" mono className="pointer-events-none absolute -bottom-24 -right-24 h-[26rem] w-auto text-white/[0.04]" title="" />}
        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} {brand ? brand.name : "Maximus"}. All rights reserved.</p>
      </aside>
      <main className="flex min-h-dvh flex-col bg-bg">
        <div style={brand?.primary ? { background: brand.primary } : undefined} className="auth-gradient px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))] text-white lg:hidden">
          {brand ? <CompanyMark c={brand} /> : <Logo variant="full" className="h-10 w-auto" />}
        </div>
        <div className="-mt-6 flex flex-1 items-start justify-center rounded-t-3xl bg-bg px-5 py-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none">
          <div className="w-full max-w-md animate-rise">{children}</div>
        </div>
      </main>
    </div>
  );
}
