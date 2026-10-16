import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
import { Facets } from "@/components/Facets";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: "Who we are, what we stand for and how Accelerator Community helps people grow, lead and celebrate excellence.",
  alternates: { canonical: "/about" },
};

const themes = [
  { title: "Community culture", text: "We show up for one another. Members are welcomed, encouraged and held to a high standard by people who want them to win.", color: "bg-red" },
  { title: "Leadership development", text: "Every gathering is a chance to practise leadership: taking responsibility, serving others and leading by example.", color: "bg-royal" },
  { title: "Personal growth", text: "Training, mentorship and honest conversation help each member become a better version of themselves, year after year.", color: "bg-gold" },
  { title: "Recognition and excellence", text: "We celebrate the people who put in the work. Recognising achievement raises the bar for everyone.", color: "bg-logo-blue" },
];

export default function AboutPage() {
  const c = site.charter;
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={<>We are a community built to <em className="italic text-[#9DB2FF]">accelerate</em> people.</>}
        intro={site.shortDescription}
        image={{ src: "/images/community-gathering-steps.jpg", alt: "Accelerator Community members gathered together" }}
      />

      {/* Who we are + story */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x grid grid-cols-1 gap-16 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <p className="eyebrow">Who we are</p>
            <h2 className="display-lg mt-5 text-navy">One community. Different journeys. Shared progress.</h2>
          </Reveal>
          <Reveal className="md:col-span-6 md:col-start-7" delay={0.08}>
            <p className="lead text-ink/80">
              Accelerator Community, known in its earlier years as {site.legacyName}, brings ambitious people together around leadership, excellence and shared progress.
            </p>
            <p className="mt-6 leading-relaxed text-ink/75">It is part of the wider Accelerators Billionaires vision led by our founder, {site.founder.name}: raising skilled, resourceful and purposeful young leaders, from Africa to the world.</p>
          </Reveal>
        </div>
      </section>

      {/* Mission & vision */}
      <section id="vision" className="grid scroll-mt-20 md:grid-cols-2">
        {([["Vision", site.vision, c.fullVision, "bg-logo-blue"], ["Mission", site.mission, c.fullMission, "bg-navy"]] as const).map(([label, text, full, bg]) => (
          <div key={label} className={`${bg} px-6 py-20 text-white md:px-16 md:py-28`}>
            <Reveal>
              <p className="eyebrow !text-white/70">Our {label.toLowerCase()}</p>
              {text ? <p className="mt-6 font-display text-3xl leading-snug md:text-4xl">{text}</p> : (
                <>
                  <p className="mt-6 font-display text-3xl italic text-white/70 md:text-4xl">Official {label.toLowerCase()} statement</p>
                  <Pending label="Awaiting official text" className="mt-6 text-white/70" />
                </>
              )}
              <div className="mt-10 border-t border-white/20 pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Full statement</p>
                <p className="mt-3 leading-relaxed text-white/85">{full}</p>
              </div>
            </Reveal>
          </div>
        ))}
      </section>

      {/* Four horizons */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">How the vision unfolds</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Four horizons, one direction.</h2>
            <p className="lead mt-6 max-w-2xl text-ink/75">Each horizon builds on the one before it, from a measurable first milestone to a legacy designed to outlive the generation that builds it.</p>
          </Reveal>
          <ol className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            {c.horizons.map((h, i) => (
              <li key={h.title}>
                <Reveal delay={i * 0.06} className="relative h-full bg-white p-8 shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)] md:p-10">
                  <span className={`absolute inset-x-0 top-0 h-1.5 ${["bg-red", "bg-royal", "bg-gold", "bg-navy"][i]}`} />
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate"><span className="mr-2 font-display text-lg normal-case italic tracking-normal text-red">{h.n}</span>{h.term}</p>
                      <h3 className="mt-3 font-display text-3xl text-navy md:text-4xl">{h.title}</h3>
                    </div>
                    {h.stat && (
                      <div className="shrink-0 text-right">
                        <p className="font-display text-3xl text-red md:text-4xl">{h.stat}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate">{h.statLabel}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-5 leading-relaxed text-ink/75">{h.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Our story */}
      <section className="bg-white py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Our story</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Building for generations.</h2>
            <p className="lead mt-6 max-w-3xl text-ink/75">{c.storyIntro}</p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
            {c.story.map((p, i) => (
              <Reveal key={p.title} delay={(i % 2) * 0.06}>
                <h3 className="flex items-baseline gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-navy"><span className="font-display text-lg normal-case italic tracking-normal text-red">0{i + 1}</span>{p.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-ink/80">{p.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-16 border-l-4 border-red pl-6 md:pl-10">
            <p className="font-display text-3xl leading-snug text-navy md:text-5xl">{c.storyClose.split(". ").map((t, i, a) => <span key={t} className={i === a.length - 1 ? "block italic text-red" : "block"}>{t}{i < a.length - 1 ? "." : ""}</span>)}</p>
          </Reveal>
        </div>
      </section>

      {/* Six commitments */}
      <section className="grain relative overflow-hidden bg-navy py-24 text-white md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">What the vision stands on</p>
            <h2 className="display-lg mt-5 max-w-3xl">Six commitments behind every horizon.</h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {c.commitments.map((m, i) => (
              <Reveal key={m.title} delay={(i % 3) * 0.06} className="bg-navy">
                <div className="h-full p-8">
                  <span className="font-display text-lg italic text-red">0{i + 1}</span>
                  <h3 className="mt-3 font-display text-3xl">{m.title}</h3>
                  <p className="mt-3 leading-relaxed text-mist">{m.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-14 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-2xl font-display text-2xl italic leading-snug text-white/90 md:text-3xl">{c.closing}</p>
            <a href={c.pdf} download className="btn btn-red shrink-0"><Download size={16} aria-hidden="true" /> Download the charter (PDF)</a>
          </Reveal>
          <p className="mt-6 text-xs text-mist">Official Charter {c.reference} · Office of the Founder &amp; CEO · {c.edition}</p>
        </div>
      </section>

      {/* Core values */}
      <section className="bg-white py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Community pillars</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Four pillars of community life.</h2>
          </Reveal>
          <ol className="mt-16 divide-y divide-sand border-y border-sand">
            {site.pillars.map((p, i) => (
              <li key={p.title}>
                <Reveal className="grid gap-4 py-10 md:grid-cols-12 md:items-baseline">
                  <span className="font-display text-xl italic text-red md:col-span-1">0{i + 1}</span>
                  <h3 className="font-display text-4xl text-navy md:col-span-4 md:text-5xl">{p.title}</h3>
                  <p className="text-lg leading-relaxed text-ink/75 md:col-span-6 md:col-start-7">{p.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What it means to be part */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-32">
        <div className="container-x grid grid-cols-1 gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="relative aspect-[3/4] overflow-hidden lg:sticky lg:top-28">
                <Image src="/images/community-white-attire.jpg" alt="Members of Accelerator Community dressed in white at a gathering" fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal>
              <p className="eyebrow">Life in the community</p>
              <h2 className="display-lg mt-5 text-navy">What being part of Accelerator means.</h2>
            </Reveal>
            <div className="mt-12 space-y-12">
              {themes.map((t, i) => (
                <Reveal key={t.title} delay={i * 0.05}>
                  <span className={`block h-1 w-12 ${t.color}`} />
                  <h3 className="mt-5 font-display text-3xl text-navy">{t.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-ink/75">{t.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Journey & achievements */}
      <section className="grain relative overflow-hidden bg-navy py-24 text-white md:py-32">
        <Facets side="right" className="pointer-events-none absolute -right-8 top-10 hidden h-96 w-auto md:block" />
        <div className="container-x grid gap-16 md:grid-cols-2">
          <Reveal>
            <p className="eyebrow">Our journey</p>
            <h2 className="display-md mt-5">Milestones</h2>
            <p className="mt-6 max-w-md text-mist">A timeline of key moments, from the first meeting to today, will be built from the official records.</p>
            <Pending label="Timeline dates and milestones" className="mt-6 text-mist" />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow">Our achievements</p>
            <h2 className="display-md mt-5">What we have built together</h2>
            <p className="mt-6 max-w-md text-mist">Verified achievements, programmes and recognitions will be listed here. We only publish figures that have been confirmed.</p>
            <Pending label="Verified achievements" className="mt-6 text-mist" />
          </Reveal>
        </div>
      </section>

      {/* Founder link */}
      <section className="bg-white py-20">
        <div className="container-x flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Our founder</p>
            <h2 className="display-md mt-4 text-navy">{site.founder.name ?? "Meet the person behind the vision."}</h2>
          </div>
          <Link href="/founder" className="btn btn-navy">Founder profile <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
