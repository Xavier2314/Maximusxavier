import { PageHero } from "./PageHero";
import { Pending } from "./Pending";

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { h: string; p: (string | { pending: string })[] }[] }) {
  return (
    <>
      <PageHero eyebrow="Policies" title={title} intro={intro} />
      <section className="bg-cream py-20">
        <div className="container-x max-w-3xl">
          <p className="mb-12 border-l-4 border-gold bg-white p-5 text-sm text-slate">
            Draft for review. This policy must be checked and approved by Accelerator Community (and, where appropriate, a legal adviser) before launch.
          </p>
          <div className="space-y-12">
            {sections.map((s) => (
              <section key={s.h}>
                <h2 className="font-display text-3xl text-navy">{s.h}</h2>
                <div className="mt-4 space-y-4 leading-relaxed text-ink/80">
                  {s.p.map((x, i) => typeof x === "string" ? <p key={i}>{x}</p> : <Pending key={i} label={x.pending} className="text-slate" />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
