import Link from "next/link";
import {
  CalendarCheck, ClipboardCheck, GraduationCap, MessageCircle, Network, PhoneCall, Send, ShoppingBag, Bot, UserPlus, Users,
  type LucideIcon,
} from "lucide-react";
import { categoryOf } from "@/lib/academy";
import type { createClient } from "@/lib/supabase/server";
import { FOCUS, type FocusArea, type FocusKey, type GrowthFocus } from "@/lib/growth";
import { cn } from "@/lib/utils";

export const FOCUS_ICONS: Record<FocusKey, LucideIcon> = {
  recruiting: UserPlus,
  inviting: Send,
  duplication: Network,
  team_prospecting: Users,
  prospecting: PhoneCall,
  follow_up: MessageCircle,
  sales: ShoppingBag,
  consistency: CalendarCheck,
  accountability: ClipboardCheck,
};

export type CourseLink = { slug: string; title: string; category: string };

/** Published Academy courses for the categories behind the given focus areas. */
export async function coursesForFocus(supabase: Awaited<ReturnType<typeof createClient>>, areas: FocusArea[]): Promise<CourseLink[]> {
  const cats = [...new Set(areas.map((a) => FOCUS[a.key].academy))];
  if (cats.length === 0) return [];
  const { data } = await supabase.from("courses").select("slug, title, category")
    .in("category", cats).neq("status", "draft").order("sort_order").limit(20);
  return (data ?? []) as CourseLink[];
}

/** Numbered "work on this" cards: why it came up, tips, and where to learn more. */
export function FocusList({ areas, who = "You", courses = [], compact = false }: {
  areas: FocusArea[]; who?: string; courses?: CourseLink[]; compact?: boolean;
}) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {areas.map((a, i) => {
        const info = FOCUS[a.key];
        const Icon = FOCUS_ICONS[a.key];
        const cat = categoryOf(info.academy);
        const related = courses.filter((c) => c.category === info.academy).slice(0, 2);
        return (
          <li key={a.key} className="flex flex-col rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand-navy text-xs font-bold text-brand-lime ring-2 ring-surface dark:bg-brand-lime dark:text-brand-navy">{i + 1}</span>
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight">{info.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{info.why(a, who)}</p>
              </div>
            </div>
            {!compact && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {info.tips.map((t) => (
                  <li key={t} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green" aria-hidden />{t}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-4 text-sm">
              {related.map((c) => (
                <Link key={c.slug} href={`/academy/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-2.5 py-1.5 font-medium text-success hover:brightness-95">
                  <GraduationCap className="size-3.5" aria-hidden /> {c.title}
                </Link>
              ))}
              {related.length === 0 && (
                <Link href={`/academy#cat-${cat.key}`} className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-2.5 py-1.5 font-medium text-success hover:brightness-95">
                  <GraduationCap className="size-3.5" aria-hidden /> {cat.label}
                </Link>
              )}
              {who === "You" && (
                <Link href={`/ai?q=${encodeURIComponent(info.ask)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 font-medium text-primary hover:brightness-95">
                  <Bot className="size-3.5" aria-hidden /> Ask Maximus AI
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** "You brought in X of 3 — and Y of them duplicated" summary. */
export function DuplicationSummary({ focus, who = "You" }: { focus: GrowthFocus; who?: string }) {
  const target = focus.duplication_target;
  const slots = Math.min(Math.max(target, focus.directs), 12);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{who === "You" ? "You brought in" : "Brought in"}</p>
        <div className="mt-1.5 flex gap-1.5" role="img" aria-label={`${focus.directs} direct recruits; goal at least ${target}`}>
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className={cn("size-4 rounded-full",
              i < focus.duplicated ? "bg-brand-green" : i < focus.directs ? "bg-brand-blue" : "border-2 border-dashed border-border")} aria-hidden />
          ))}
          {focus.directs > 12 && <span className="text-xs font-semibold text-fg-muted">+{focus.directs - 12}</span>}
        </div>
      </div>
      <p className="text-sm text-fg-muted">
        <b className="text-fg">{focus.directs}</b> brought in directly ({focus.directs >= target ? `first ${target} reached, keep going: there's no limit` : `aim for at least ${target}, no limit`}) ·{" "}
        <b className="text-fg">{focus.duplicated}</b> of them have brought in {target}+ ·{" "}
        <b className="text-fg">{focus.team_size}</b> in the whole team
      </p>
    </div>
  );
}
