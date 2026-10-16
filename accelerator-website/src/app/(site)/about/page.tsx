import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
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

      {/* Charter CTA */}
      <section className="bg-cream py-20 md:py-24">
        <div className="container-x grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">Official charter {c.reference}</p>
            <h2 className="display-lg mt-5 text-navy">Four horizons. Six commitments. One story.</h2>
            <p className="lead mt-6 max-w-2xl text-ink/75">{c.storyIntro}</p>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-col gap-3 lg:col-span-4 lg:col-start-9">
            <Link href="/vision" className="btn btn-navy">Read the full Vision &amp; Mission <ArrowRight size={16} aria-hidden="true" /></Link>
            <a href={c.pdf} download className="btn btn-ghost-dark"><Download size={16} aria-hidden="true" /> Download the charter (PDF)</a>
          </Reveal>
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
