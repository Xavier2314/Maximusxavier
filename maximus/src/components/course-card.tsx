import Image from "next/image";
import Link from "next/link";
import { GraduationCap, Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge, Progress } from "@/components/ui/misc";
import { categoryOf } from "@/lib/academy";
import { cn } from "@/lib/utils";

export type CourseCardData = {
  slug: string; title: string; description: string | null; category: string; status: string;
  thumbnail_url: string | null; level: string | null; lessons: number; completed: number;
};

export function CourseCard({ c }: { c: CourseCardData }) {
  const cat = categoryOf(c.category);
  const soon = c.status !== "published";
  const pct = c.lessons ? Math.round((c.completed / c.lessons) * 100) : 0;
  const body = (
    <>
      <div className={cn("relative aspect-[16/9] overflow-hidden bg-gradient-to-br", cat.gradient)}>
        {c.thumbnail_url ? (
          <Image src={c.thumbnail_url} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
        ) : (
          <>
            <div className="wedge absolute -right-3 -top-1 h-[74px] w-[100px] scale-150 bg-white/15" aria-hidden />
            <Logo variant="mark" mono className="absolute bottom-3 left-4 h-10 w-auto text-white/30" title="" />
          </>
        )}
        {soon && (
          <span className="absolute inset-0 grid place-items-center bg-brand-navy/40 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-navy"><Lock className="size-3" aria-hidden /> Coming soon</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-primary">{cat.label}</p>
        <h3 className="mt-1 font-semibold leading-snug">{c.title}</h3>
        {c.description && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{c.description}</p>}
        <div className="mt-auto pt-4">
          {soon ? (
            <Badge>Not yet available</Badge>
          ) : (
            <>
              <div className="mb-1.5 flex justify-between text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1"><GraduationCap className="size-3.5" aria-hidden /> {c.lessons} lessons</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} tone={pct === 100 ? "green" : "blue"} label={`${c.title} progress`} />
            </>
          )}
        </div>
      </div>
    </>
  );
  const cls = "card flex flex-col overflow-hidden transition-all";
  return soon
    ? <div className={cn(cls, "opacity-90")} aria-disabled>{body}</div>
    : <Link href={`/academy/${c.slug}`} className={cn(cls, "hover:-translate-y-0.5 hover:shadow-xl")}>{body}</Link>;
}
