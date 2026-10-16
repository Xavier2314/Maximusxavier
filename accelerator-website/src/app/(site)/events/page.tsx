import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, CalendarDays, Clapperboard, GraduationCap, MapPin, Sparkles, Trophy, Users, UserRound } from "lucide-react";
import { Facets } from "@/components/Facets";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
import { Countdown } from "@/components/Countdown";
import { TicketCards } from "@/components/TicketCards";
import { CONTEST_STATUS_LABEL, getAwards, getContests, getEventSettings, getSpeakers, getTickets } from "@/lib/content";
import { formatLagos, formatLagosDate, formatNaira } from "@/lib/tickets";
import { FeeTable } from "@/components/FeeTable";
import { MAX_FEE_KOBO, MIN_FEE_KOBO } from "@/lib/fees";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const e = await getEventSettings();
  return {
    title: e.name,
    description: `${e.name}: recognition, awards, leadership training, inspiring speakers, networking and video competitions. Register now.`,
    alternates: { canonical: "/events" },
    openGraph: { title: e.name, description: "Celebrate excellence. Learn from exceptional trainers. Connect with leaders." },
  };
}

const highlights = [
  { title: "Celebrate excellence", text: "Recognise individuals who showed outstanding performance and commitment during the year.", Icon: Trophy, color: "text-red" },
  { title: "Learn from exceptional trainers", text: "Experienced speakers and trainers share practical knowledge and insight.", Icon: GraduationCap, color: "text-royal" },
  { title: "Connect with leaders", text: "Meet ambitious people from across the community and build meaningful relationships.", Icon: Users, color: "text-gold" },
  { title: "Experience recognition", text: "Celebrate milestones, achievements and outstanding contributions on the big stage.", Icon: Award, color: "text-red" },
  { title: "Participate in competitions", text: "Express your creativity in video contests and compete for recognition and prizes.", Icon: Clapperboard, color: "text-royal" },
];

const features = ["Recognition of outstanding achievers", "Awards and celebrations", "Leadership training", "Inspirational speakers", "Professional trainers", "Community networking", "Entertainment", "Video competitions", "Special presentations", "More to be announced"];

const statusStyle: Record<string, string> = {
  coming_soon: "bg-stone text-navy",
  open: "bg-red text-white",
  closed: "bg-slate text-white",
  winners_announced: "bg-gold text-navy",
};

export default async function EventsPage() {
  const [event, tickets, speakers, awards, contests] = await Promise.all([getEventSettings(), getTickets(), getSpeakers(), getAwards(), getContests()]);
  const now = Date.now();
  const where = [event.venueName, event.address, event.city].filter(Boolean).join(", ");

  const jsonLd = event.startsAt && (event.venueName || event.city) ? {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.name,
    startDate: event.timeConfirmed ? event.startsAt : "2026-12-05",
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venueName ?? event.city, address: { "@type": "PostalAddress", addressLocality: event.city ?? undefined, addressCountry: "NG", streetAddress: event.address ?? undefined } },
    organizer: { "@type": "Organization", name: site.name, url: site.url },
    image: [`${site.url}/images/community-white-attire.jpg`],
    description: event.summary ?? undefined,
  } : null;

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      {/* HERO */}
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Image src="/images/community-white-attire.jpg" alt="Accelerator Community members in white at a past community event" fill priority sizes="100vw" className="-z-20 object-cover opacity-45 mix-blend-luminosity" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(7,21,48,.97)_0%,rgba(11,30,63,.85)_45%,rgba(11,30,63,.35)_100%)]" />
        <Facets side="right" className="pointer-events-none absolute -right-6 top-24 hidden h-[520px] w-auto md:block" />
        <Facets side="left" className="pointer-events-none absolute -left-10 -bottom-24 hidden h-[360px] w-auto opacity-80 md:block" />

        <div className="container-x relative pb-16 pt-36 md:pb-24 md:pt-48">
          <Reveal><p className="eyebrow">Accelerator Community presents</p></Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-6 font-display text-[clamp(3.25rem,10vw,9rem)] font-medium leading-[0.9] tracking-[-0.02em]">
              Accelerators<br /><span className="italic text-[#9DB2FF]">Events</span> 2026
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            {event.theme ? <p className="mt-8 font-display text-2xl italic md:text-3xl">&ldquo;{event.theme}&rdquo;</p> : <Pending label="Official theme to be announced" className="mt-8 text-mist" />}
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-12 grid gap-8 border-t border-white/15 pt-8 md:grid-cols-12 md:items-end">
              <dl className="grid gap-6 sm:grid-cols-2 md:col-span-6">
                <div className="flex gap-3"><CalendarDays className="mt-1 shrink-0 text-red" aria-hidden="true" /><div><dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Date</dt><dd className="mt-1 font-display text-2xl">{formatLagosDate(event.startsAt, true) ?? "To be announced"}</dd>{event.startsAt && !event.timeConfirmed && <dd className="text-sm text-mist">Start time to be announced</dd>}{event.startsAt && event.timeConfirmed && <dd className="text-sm text-mist">{formatLagos(event.startsAt, { day: undefined, month: undefined, year: undefined })} WAT</dd>}</div></div>
                <div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-red" aria-hidden="true" /><div><dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Venue</dt><dd className="mt-1 font-display text-2xl">{where || "To be announced"}</dd>{!event.venueName && event.city && <dd className="text-sm text-mist">Exact venue to be announced</dd>}</div></div>
              </dl>
              <div className="md:col-span-6">
                {event.startsAt ? <Countdown target={event.startsAt} serverNow={now} label={event.name} /> : (
                  <div className="border border-white/15 p-5 text-sm text-mist">The countdown starts as soon as the official date is confirmed.</div>
                )}
              </div>
            </div>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="#tickets" className="btn btn-red">Register now <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="#about" className="btn btn-ghost-light">About the event</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-20 bg-cream py-24 md:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow">About the event</p>
            <h2 className="display-lg mt-5 text-navy">Recognise achievement. Celebrate excellence. Grow together.</h2>
            <span className="rule-red mt-8" />
            <p className="lead mt-8 text-ink/80">
              {event.summary ?? "Accelerators Events 2026 brings the community together to honour the people who went the extra mile this year, to learn from exceptional trainers and speakers, and to build the relationships that carry us into the next season of growth."}
            </p>
          </Reveal>
          <Reveal className="lg:col-span-5 lg:col-start-8" delay={0.08}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-navy">What to expect</h3>
            <ul className="mt-6 divide-y divide-sand border-y border-sand">
              {features.map((f, i) => (
                <li key={f} className="flex items-center gap-5 py-4">
                  <span className="font-display text-sm italic text-red">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-lg text-navy">{f}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* MOMENTS */}
      <section aria-label="Moments from past gatherings" className="bg-cream pb-24 md:pb-32">
        <div className="container-x">
          <div className="grid gap-3 md:grid-cols-12">
            {[
              { src: "/images/speaker-addressing-audience.jpg", alt: "A speaker in a cream suit addresses a seated audience taking notes", cap: "Training", span: "md:col-span-7 md:row-span-2", h: "h-72 md:h-full" },
              { src: "/images/recognition-medal-winners.jpg", alt: "Award winners with medals on stage with hosts", cap: "Recognition", span: "md:col-span-5", h: "h-64" },
              { src: "/images/changemakers-session.jpg", alt: "Members in Changemaker T-shirts cheering during a session", cap: "Community", span: "md:col-span-5", h: "h-64" },
            ].map((ph) => (
              <figure key={ph.src} className={`relative overflow-hidden bg-navy ${ph.span} ${ph.h}`}>
                <Image src={ph.src} alt={ph.alt} fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
                <figcaption className="absolute bottom-0 left-0 bg-navy px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{ph.cap}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate">Moments from past Accelerator gatherings.</p>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="bg-navy-900 text-white">
        <div className="grid lg:grid-cols-5">
          {highlights.map(({ title, text, Icon, color }, i) => (
            <Reveal key={title} delay={i * 0.05} className="border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="flex h-full flex-col p-8 md:p-10 lg:min-h-[380px]">
                <Icon size={40} strokeWidth={1.3} className={color} aria-hidden="true" />
                <h3 className="mt-auto pt-12 font-display text-3xl leading-tight">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-mist">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TICKETS */}
      <section id="tickets" className="scroll-mt-20 relative overflow-hidden bg-white py-24 md:py-32">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-12">
            <Reveal className="lg:col-span-4">
              <p className="eyebrow">Registration</p>
              <h2 className="display-lg mt-5 text-navy">Secure your place.</h2>
              <p className="mt-6 leading-relaxed text-ink/75">Early Bird registration is open until 31 October 2026 at 11:59 PM (Lagos time). Late Registration opens automatically on 1 November 2026.</p>
              <p className="mt-6 text-sm text-slate">Your fee depends on your membership position. Pay by bank transfer to the official account, then submit the official registration form with your proof of payment. Your place is confirmed once the team verifies your payment.</p>
            </Reveal>
            <div className="lg:col-span-8">
              <TicketCards tickets={tickets} serverNow={now} feeLabel={`${formatNaira(MIN_FEE_KOBO)} \u2013 ${formatNaira(MAX_FEE_KOBO)}`} />
              <div className="mt-14 grid gap-10 border-t border-sand pt-12 md:grid-cols-5">
                <div className="md:col-span-2">
                  <p className="eyebrow">Registration fees</p>
                  <h3 className="display-md mt-4 text-navy">Fees by membership position</h3>
                  <p className="mt-4 text-sm text-ink/75">Choose your position when you register and the correct fee is applied automatically.</p>
                  <Link href="/events/register" className="btn btn-red mt-8">Register now</Link>
                </div>
                <div className="md:col-span-3"><FeeTable /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SPEAKERS */}
      <section id="speakers" className="scroll-mt-20 bg-cream py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Speakers &amp; trainers</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Learn from people who have done it.</h2>
          </Reveal>
          {speakers.length ? (
            <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {speakers.map((s) => (
                <li key={s.id}>
                  <Reveal>
                    <article className="group">
                      <div className="relative aspect-[4/5] overflow-hidden bg-navy">
                        {s.photo_url ? <Image src={s.photo_url} alt={s.name} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" unoptimized={!s.photo_url.startsWith("/")} /> : <div className="flex h-full items-center justify-center text-mist"><UserRound size={64} strokeWidth={1} aria-hidden="true" /></div>}
                      </div>
                      <h3 className="mt-5 font-display text-2xl text-navy">{s.name}</h3>
                      {s.title && <p className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-red">{s.title}</p>}
                      {s.topic && <p className="mt-3 text-sm text-navy"><span className="text-slate">Session:</span> {s.topic}</p>}
                      {s.bio && <p className="mt-3 text-sm leading-relaxed text-ink/75">{s.bio}</p>}
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          ) : (
            <Reveal className="mt-14">
              <div className="grid gap-px bg-sand sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex aspect-[4/3] flex-col justify-between bg-cream p-8">
                    <Sparkles className={["text-red", "text-royal", "text-gold"][i]} aria-hidden="true" />
                    <div>
                      <p className="font-display text-2xl text-navy">Speaker reveal</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate">Coming soon</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm text-slate">Speakers and trainers will be announced here as they are confirmed.</p>
            </Reveal>
          )}
        </div>
      </section>

      {/* RECOGNITION */}
      <section id="recognition" className="scroll-mt-20 grain relative overflow-hidden bg-navy py-24 text-white md:py-32">
        <Facets side="left" className="pointer-events-none absolute -left-10 top-10 hidden h-80 w-auto md:block" />
        <div className="container-x md:pl-24">
          <Reveal>
            <p className="eyebrow">Recognition &amp; awards</p>
            <h2 className="display-lg mt-5 max-w-3xl">Honouring outstanding contribution.</h2>
          </Reveal>
          {awards.length ? (
            <div className="mt-14 grid gap-px bg-white/10 md:grid-cols-2 lg:grid-cols-3">
              {awards.map((a, i) => (
                <Reveal key={a.id} delay={i * 0.04} className="bg-navy">
                  <article className="h-full p-8">
                    <Award className="text-gold" aria-hidden="true" />
                    <h3 className="mt-6 font-display text-2xl">{a.title}</h3>
                    {a.description && <p className="mt-3 text-sm leading-relaxed text-mist">{a.description}</p>}
                    {a.nominees && <p className="mt-5 text-sm"><span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mist">Nominees</span><br />{a.nominees}</p>}
                    {a.winners && <p className="mt-4 text-sm"><span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Winner</span><br />{a.winners}</p>}
                  </article>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="mt-10">
              <p className="max-w-xl text-mist">Award categories, nominees and winners will be published here.</p>
              <Pending label="Award categories" className="mt-6 text-mist" />
            </Reveal>
          )}
        </div>
      </section>

      {/* COMPETITIONS */}
      <section id="competitions" className="scroll-mt-20 bg-white py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Video competitions</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Create. Enter. Be recognised.</h2>
          </Reveal>
          {contests.length ? (
            <div className="mt-14 space-y-6">
              {contests.map((c) => (
                <Reveal key={c.id}>
                  <article className="grid gap-8 border border-sand p-8 md:grid-cols-12 md:p-10">
                    <div className="md:col-span-5">
                      <span className={`inline-block px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusStyle[c.status]}`}>{CONTEST_STATUS_LABEL[c.status]}</span>
                      <h3 className="mt-5 font-display text-3xl text-navy">{c.title}</h3>
                      {c.description && <p className="mt-4 leading-relaxed text-ink/75">{c.description}</p>}
                    </div>
                    <dl className="grid gap-5 text-sm md:col-span-4">
                      {c.starts_at && <div><dt className="field-label !mb-1">Opens</dt><dd>{formatLagos(c.starts_at)}</dd></div>}
                      {c.deadline && <div><dt className="field-label !mb-1">Submission deadline</dt><dd>{formatLagos(c.deadline)}</dd></div>}
                      {c.prize && <div><dt className="field-label !mb-1">Prize</dt><dd>{c.prize}</dd></div>}
                      {c.requirements && <div><dt className="field-label !mb-1">Entry requirements</dt><dd className="whitespace-pre-line">{c.requirements}</dd></div>}
                    </dl>
                    <div className="flex flex-col gap-4 md:col-span-3 md:items-end">
                      {c.status === "open" && c.submission_url && <a href={c.submission_url} target="_blank" rel="noopener noreferrer" className="btn btn-red w-full md:w-auto">Submit entry</a>}
                      {c.id === "inter-office-100k-content-challenge" && <Link href="/events/content-challenge" className="btn btn-navy w-full md:w-auto">View the challenge</Link>}
                      {c.rules && <details className="w-full text-sm"><summary className="cursor-pointer font-semibold text-navy">Contest rules</summary><p className="mt-3 whitespace-pre-line text-ink/75">{c.rules}</p></details>}
                      {c.status === "winners_announced" && c.winners && <p className="text-sm"><span className="field-label !mb-1">Winners</span>{c.winners}</p>}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="mt-14 grid gap-6 md:grid-cols-3">
              {["Contest one", "Contest two", "Contest three"].map((t, i) => (
                <div key={t} className="border border-dashed border-sand p-8">
                  <span className="inline-block bg-stone px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-navy">Coming soon</span>
                  <Clapperboard className={`mt-8 ${["text-red", "text-royal", "text-gold"][i]}`} size={32} strokeWidth={1.4} aria-hidden="true" />
                  <p className="mt-4 font-display text-2xl text-navy">Details to be announced</p>
                  <p className="mt-2 text-sm text-slate">Each contest will have its own brief, requirements, deadline and prize.</p>
                </div>
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-red py-20 text-white md:py-28">
        <Facets side="right" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-[420px] w-auto opacity-60" />
        <div className="container-x flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <h2 className="display-lg max-w-2xl">Don&rsquo;t miss {event.name}.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="#tickets" className="btn bg-white text-red hover:bg-cream">Register now</Link>
            <Link href="/contact?topic=Event%20enquiry" className="btn btn-ghost-light">Ask a question</Link>
          </div>
        </div>
      </section>
    </>
  );
}
