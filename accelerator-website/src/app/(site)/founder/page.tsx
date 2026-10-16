import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, Quote } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
import { Logo } from "@/components/Logo";
import { Facets } from "@/components/Facets";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Chukwuemeka (Peter) Muoneke, Founder",
  description: "Meet Chukwuemeka (Peter) Muoneke, founder and CEO of the Accelerator Billionaires Team and founder of Accelerator Community.",
  alternates: { canonical: "/founder" },
};

function Block({ eyebrow, title, text, pending }: { eyebrow: string; title: string; text: string | null; pending: string }) {
  return (
    <Reveal className="border-t border-sand pt-10">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display-md mt-4 text-navy">{title}</h2>
      {text ? <p className="mt-6 text-lg leading-relaxed text-ink/80">{text}</p> : <Pending label={pending} className="mt-6 text-slate" />}
    </Reveal>
  );
}

export default function FounderPage() {
  const f = site.founder;
  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Facets side="left" className="pointer-events-none absolute -left-8 bottom-0 h-80 w-auto opacity-90" />
        <div className="container-x grid gap-12 pb-20 pt-32 md:grid-cols-12 md:items-end md:pb-28 md:pt-44">
          <div className="md:col-span-6">
            <Reveal>
              <p className="eyebrow">Meet the founder</p>
              <h1 className="display-lg mt-6">{f.name ?? <>Founder&rsquo;s name <span className="block text-2xl font-sans not-italic"><Pending label="To be supplied" className="mt-4 text-mist" /></span></>}</h1>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-mist">{f.title}, Accelerator Community</p>
              {f.shortIntro && <p className="lead mt-8 max-w-xl text-mist">{f.shortIntro}</p>}
              {f.links.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-3">
                  {f.links.map((l) => (
                    <li key={l.name}><a href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light min-h-11 px-5">{l.name} <ArrowUpRight size={15} aria-hidden="true" /></a></li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <Reveal delay={0.1}>
              <div className="relative aspect-[4/5] overflow-hidden bg-navy-900 ring-1 ring-white/10">
                {f.photo ? (
                  <Image src={f.photo} alt={`Portrait of ${f.name ?? "the founder"}, founder of Accelerator Community, smiling in a burgundy pinstripe blazer and tinted glasses`} fill priority sizes="(min-width:768px) 40vw, 100vw" className="object-cover object-top" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
                    <Logo variant="icon-reversed" width={160} />
                    <Pending label="Official founder photograph" className="text-mist" />
                  </div>
                )}
                <span className="absolute -bottom-0 right-0 h-2 w-2/3 bg-red" />
              </div>
              {f.photo && f.photoCredit && <p className="mt-3 text-right text-[11px] uppercase tracking-[0.18em] text-mist">Photo: {f.photoCredit}</p>}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-cream py-24 md:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="space-y-16 lg:col-span-7">
            <Reveal>
              <p className="eyebrow">Biography</p>
              {f.biography ? (
                <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink/80">{f.biography.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
              ) : (
                <div className="mt-6">
                  <p className="lead text-slate">The founder&rsquo;s full biography, background and achievements will be published here exactly as supplied.</p>
                  <Pending label="Official biography" className="mt-5 text-slate" />
                </div>
              )}
            </Reveal>
            <Block eyebrow="The vision" title="The vision behind Accelerator" text={f.vision} pending="Founder's vision for Accelerator" />
            <Block eyebrow="In his words" title="What drives him" text={f.philosophy ? `\u201C${f.philosophy}\u201D` : null} pending="Leadership philosophy" />
            <Block eyebrow="A message" title="A message from the founder" text={f.message} pending="Founder's message" />
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">Roles, education &amp; certifications</p>
              {f.achievements?.length ? (
                <ul className="mt-6 space-y-4">{f.achievements.map((a) => <li key={a} className="border-l-2 border-red pl-4 text-ink/80">{a}</li>)}</ul>
              ) : (
                <Pending label="Verified achievements" className="mt-6 text-slate" />
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-royal py-24 text-white md:py-32">
        <div className="container-x max-w-5xl">
          <Quote size={48} className="text-white/40" aria-hidden="true" />
          {f.quote ? (
            <blockquote className="mt-6">
              <p className="font-display text-4xl leading-tight md:text-6xl">&ldquo;{f.quote}&rdquo;</p>
              <footer className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-white/80">{f.name}</footer>
            </blockquote>
          ) : (
            <div className="mt-6">
              <p className="font-display text-4xl italic leading-tight text-white/70 md:text-5xl">A verified quote from the founder will be featured here.</p>
              <Pending label="Approved founder quote" className="mt-8 text-white/80" />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
