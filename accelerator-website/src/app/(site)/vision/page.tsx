import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, Quote } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ImageReveal, Stagger, StaggerItem } from "@/components/Motion";
import { Facets } from "@/components/Facets";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vision & Mission",
  description: "The official Vision & Mission Statement of Accelerators Billionaires: raising skilled, resourceful and purposeful young leaders, from Africa to the world. Four horizons, our story and six commitments.",
  alternates: { canonical: "/vision" },
};

/** Section labels down the right-hand side, as on the charter pages. */
function Tag({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${light ? "text-[#9DB2FF]" : "text-slate"}`}>{children}</p>;
}

export default function VisionPage() {
  const c = site.charter;
  const f = site.founder;
  // Charter page 2 lists these three credentials.
  const credentials = [
    "Director and Team Leader, Faith Heroic Generation (since January 2020)",
    "B.Sc. Agricultural and Extension Education, Obafemi Awolowo University",
    "LinkedIn certifications: Marketing Tools: Automation (2023); Influence versus Manipulation: The Ethics of Persuasion (2022)",
  ];

  return (
    <>
      {/* 01 Cover */}
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Facets side="right" className="pointer-events-none absolute -right-10 top-24 hidden h-[460px] w-auto opacity-90 md:block" />
        <div className="container-x relative pb-16 pt-36 md:pb-24 md:pt-48">
          <p className="eyebrow">Official charter · Document {c.reference}</p>
          <h1 className="display-xl mt-6 max-w-4xl">Vision &amp; Mission <em className="block font-normal italic text-[#9DB2FF]">Statement</em></h1>
          <p className="lead mt-8 max-w-3xl text-mist">{c.subtitle}</p>
          <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-px bg-white/15 sm:grid-cols-3">
            {[["Issued by", c.issuedBy], ["Edition", c.edition], ["Status", c.status]].map(([k, v]) => (
              <div key={k} className="bg-navy py-4 pr-4 sm:px-5 sm:first:pl-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-mist">{k}</dt>
                <dd className="mt-1 font-semibold uppercase tracking-[0.08em]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href={c.pdf} download className="btn btn-red"><Download size={16} aria-hidden="true" /> Download the charter (PDF)</a>
            <a href="#vision" className="btn btn-ghost-light">Read the vision <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      {/* 02 Meet the founder */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <ImageReveal className="relative aspect-[4/5] overflow-hidden bg-navy">
                {f.photo && <Image src={f.photo} alt={`Portrait of ${f.name}, Founder & CEO of Accelerators Billionaires`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover object-top" />}
                <span className="absolute bottom-0 right-0 h-2 w-2/3 bg-red" />
              </ImageReveal>
              <div className="mt-6 border-l-4 border-red pl-5">
                <p className="font-display text-2xl italic text-navy">&ldquo;{f.quote}&rdquo;</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">Founder &amp; CEO · {f.name}</p>
              </div>
            </Reveal>
          </div>
          <div className="min-w-0 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <Tag>Meet the founder</Tag>
              <h2 className="display-lg mt-4 text-navy">The vision-bearer</h2>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-red">{c.founderRole}</p>
              <p className="lead mt-8 text-ink/80">{f.shortIntro}</p>
              <p className="mt-5 text-lg leading-relaxed text-ink/80">The vision set out in this charter is his: a conviction that Africa&rsquo;s young people can become masters of skill, technology and enterprise &mdash; and that what they build in this generation can bless the next.</p>
              <blockquote className="mt-10 bg-navy p-7 text-white md:p-9">
                <Quote size={28} className="text-[#9DB2FF]" aria-hidden="true" />
                <p className="mt-3 font-display text-2xl leading-snug md:text-3xl">I am passionate about learning new skills, engaging with entrepreneurs, and delivering high-quality results.</p>
              </blockquote>
              <ul className="mt-10 space-y-4">
                {credentials.map((a) => <li key={a} className="border-l-2 border-red pl-4 text-ink/80">{a}</li>)}
              </ul>
              <Link href="/founder" className="link-arrow mt-10">Full founder profile <ArrowRight size={16} aria-hidden="true" /></Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 03 Vision & mission */}
      <section id="vision" className="scroll-mt-20 bg-white py-24 md:py-32">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display-lg text-navy">Official statements</h2>
            <Tag>Adopted {c.edition}</Tag>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {([["Our vision", c.fullVision, site.vision, "bg-logo-blue"], ["Our mission", c.fullMission, site.mission, "bg-navy"]] as const).map(([label, full, short, bg]) => (
              <Reveal key={label} className={`${bg} relative flex h-full flex-col p-8 text-white md:p-12`}>
                <span aria-hidden="true" className="pointer-events-none absolute right-6 top-2 font-display text-[120px] leading-none text-white/10">&ldquo;</span>
                <p className="eyebrow !text-white/70">{label}</p>
                <p className="mt-6 font-display text-2xl leading-snug md:text-3xl">{full}</p>
                <div className="mt-auto pt-10">
                  <div className="border-t border-white/25 pt-5 sm:grid sm:grid-cols-[auto_1fr] sm:gap-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/60">Website version</p>
                    <p className="mt-2 leading-relaxed text-white/85 sm:mt-0">{short}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 04 Four horizons */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <Tag>How the vision unfolds</Tag>
            <h2 className="display-lg mt-4 max-w-3xl text-navy">Four horizons, one direction</h2>
            <p className="lead mt-6 max-w-3xl text-ink/75">{c.horizonsIntro}</p>
          </Reveal>
          <ol className="relative mt-16 space-y-6 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-0.5 before:bg-red/30 md:before:left-[35px]">
            {c.horizons.map((h, i) => (
              <li key={h.title} className="relative">
                <Reveal delay={i * 0.05} className="grid grid-cols-[56px_1fr] gap-5 md:grid-cols-[72px_1fr] md:gap-8">
                  <span className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full font-display text-xl italic text-white md:h-[72px] md:w-[72px] md:text-2xl ${["bg-red", "bg-royal", "bg-gold", "bg-navy"][i]}`}>{h.n}</span>
                  <div className="min-w-0 bg-white p-6 shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)] md:p-9">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Tag>{h.term}</Tag>
                        <h3 className="mt-2 font-display text-3xl text-navy md:text-4xl">{h.title}</h3>
                      </div>
                      {h.stat && (
                        <div className="shrink-0 sm:text-right">
                          <p className="font-display text-4xl text-red md:text-5xl">{h.stat}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate">{h.statLabel}</p>
                        </div>
                      )}
                    </div>
                    <p className="mt-5 text-lg leading-relaxed text-ink/75">{h.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 05 Our story */}
      <section className="bg-white py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <Tag>The story of the vision</Tag>
            <h2 className="display-lg mt-4 max-w-3xl text-navy">Building for generations</h2>
            <p className="lead mt-6 max-w-3xl text-ink/75">{c.storyIntro}</p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            {c.story.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 0.06}>
                <h3 className="flex items-baseline gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-navy"><span className="font-display text-lg normal-case italic tracking-normal text-red">0{i + 1}</span>{p.title}</h3>
                <p className={`mt-4 text-lg leading-relaxed text-ink/80 ${i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-red" : ""}`}>{p.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-16 border-l-4 border-red pl-6 md:pl-10">
            <p className="font-display text-3xl leading-snug text-navy md:text-5xl">
              <span className="block">We are not building for a season.</span>
              <span className="block italic text-red">We are building for generations.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* 06 Six commitments + signature */}
      <section className="grain relative overflow-hidden bg-navy py-24 text-white md:py-32">
        <div className="container-x">
          <Reveal>
            <Tag light>What the vision stands on</Tag>
            <h2 className="display-lg mt-4 max-w-3xl">Six commitments behind every horizon</h2>
          </Reveal>
          <Stagger className="mt-14 grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {c.commitments.map((m, i) => (
              <StaggerItem key={m.title} className="bg-navy p-8">
                <span className="font-display text-lg italic text-red">0{i + 1}</span>
                <h3 className="mt-3 font-display text-3xl">{m.title}</h3>
                <p className="mt-3 leading-relaxed text-mist">{m.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mx-auto mt-16 max-w-4xl text-center">
            <p className="font-display text-2xl italic leading-snug text-white/90 md:text-4xl">{c.closing}</p>
          </Reveal>
          <Reveal className="mt-16 grid grid-cols-1 gap-8 border-t border-white/20 pt-10 sm:grid-cols-2">
            <div>
              <p className="font-display text-3xl italic">{f.name}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-mist">Founder &amp; CEO · Signature</p>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-3xl">{c.edition}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-mist">Date of adoption</p>
            </div>
          </Reveal>
          <div className="mt-14 flex flex-col items-start justify-between gap-6 bg-white/5 p-6 sm:flex-row sm:items-center md:p-8">
            <div>
              <p className="font-display text-2xl">Accelerators Billionaires · Official Charter · {c.reference}</p>
              <p className="mt-1 text-sm text-mist">The original 6-page document, as issued by the {c.issuedBy}.</p>
            </div>
            <a href={c.pdf} download className="btn btn-red shrink-0"><Download size={16} aria-hidden="true" /> Download PDF</a>
          </div>
        </div>
      </section>
    </>
  );
}
