import Link from "next/link";
import {
  CalendarCheck, ClipboardCheck, GraduationCap, MessageCircle, Network, PhoneCall, Send, ShoppingBag, UserPlus, Users,
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
    <ol className="grid gap-2.5 md:grid-cols-3">
      {areas.map((a, i) => {
        const info = FOCUS[a.key];
        const cat = categoryOf(info.academy);
        const related = courses.filter((c) => c.category === info.academy).slice(0, 1);
        return (
          <li key={a.key} className="flex flex-col rounded-[22px] bg-bg p-5 ring-1 ring-border">
            <div className="min-w-0">
              <p className="text-sm text-fg-subtle tabular-nums">{i + 1}</p>
              <h3 className="mt-1 font-medium leading-snug">{info.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{info.why(a, who)}</p>
            </div>
            {!compact && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {info.tips.map((t) => (
                  <li key={t} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />{t}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto flex flex-col items-start gap-1 pt-4 text-sm">
              {related.map((c) => (
                <Link key={c.slug} href={`/academy/${c.slug}`} className="inline-flex min-h-8 items-center gap-1.5 font-medium text-primary hover:underline">
                  <GraduationCap className="size-4" aria-hidden />{c.title}
                </Link>
              ))}
              {related.length === 0 && (
                <Link href={`/academy#cat-${cat.key}`} className="inline-flex min-h-8 items-center gap-1.5 font-medium text-primary hover:underline">
                  <GraduationCap className="size-4" aria-hidden />{cat.label}
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
        <p className="text-sm font-medium text-fg-subtle">{who === "You" ? "You brought in" : "Brought in"}</p>
        <div className="mt-1.5 flex gap-1.5" role="img" aria-label={`${focus.directs} direct recruits; goal at least ${target}`}>
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className={cn("size-4 rounded-full",
              i < focus.duplicated ? "bg-brand-green" : i < focus.directs ? "bg-brand-blue" : "border-2 border-dashed border-border")} aria-hidden />
          ))}
          {focus.directs > 12 && <span className="text-xs font-semibold text-fg-muted">+{focus.directs - 12}</span>}
        </div>
      </div>
      <dl className="flex gap-6 text-sm text-fg-muted">
        <div><dt>Brought in</dt><dd className="text-lg font-medium text-fg tabular-nums">{focus.directs}</dd></div>
        <div><dt>Duplicating</dt><dd className="text-lg font-medium text-fg tabular-nums">{focus.duplicated}</dd></div>
        <div><dt>Whole team</dt><dd className="text-lg font-medium text-fg tabular-nums">{focus.team_size}</dd></div>
      </dl>
    </div>
  );
}
