import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, GraduationCap, Users, Clapperboard } from "lucide-react";
import { Facets } from "@/components/Facets";
import { ImageReveal, Parallax } from "@/components/Motion";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
import { Gallery } from "@/components/Gallery";
import { Countdown } from "@/components/Countdown";
import { Logo } from "@/components/Logo";
import { gallery, site } from "@/lib/site";
import { getEventSettings, getTickets } from "@/lib/content";
import { formatLagos, formatLagosDate, formatNaira, ticketStatus } from "@/lib/tickets";
import { MIN_FEE_KOBO } from "@/lib/fees";

export const dynamic = "force-dynamic";

const highlights = [
  { href: "/events#recognition", title: "Recognition", text: "Celebrating outstanding achievers", Icon: Award, bg: "bg-red" },
  { href: "/events#speakers", title: "Training", text: "Learning from exceptional trainers", Icon: GraduationCap, bg: "bg-royal" },
  { href: "/events#about", title: "Networking", text: "Connecting ambitious leaders", Icon: Users, bg: "bg-logo-blue" },
  { href: "/events/content-challenge", title: "\u20A6100K Challenge", text: "Content challenge, entries close 31 Oct", Icon: Clapperboard, bg: "bg-navy" },
];

export default async function HomePage() {
  const [event, tickets] = await Promise.all([getEventSettings(), getTickets()]);
  const now = Date.now();
  const open = tickets.find((t) => ticketStatus(t, new Date(now)) === "on_sale");
  const where = [event.venueName, event.city].filter(Boolean).join(", ");

  return (
    <>
      {/* HERO */}
      <section className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-navy text-white">
        <Parallax className="absolute inset-0 -z-20 overflow-hidden mix-blend-luminosity" distance={140}>
          <Image
            src="/images/community-white-attire.jpg"
            alt="Accelerator Community members dressed in white at a community gathering"
            fill
            priority
            sizes="100vw"
            className="ken-burns object-cover object-[50%_60%] opacity-55"
          />
        </Parallax>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,30,63,.55)_0%,rgba(11,30,63,.35)_35%,rgba(7,21,48,.96)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_15%_85%,rgba(30,75,255,.35),transparent)]" />
        <Facets side="left" className="pointer-events-none absolute -left-28 top-24 hidden h-[380px] w-auto xl:block" />
        <Facets side="right" className="pointer-events-none absolute -right-8 top-24 h-[150px] w-auto opacity-90 md:h-[420px]" />

        <div className="container-x relative pb-16 pt-40 md:pb-24">
          <Reveal>
            <p className="eyebrow">Accelerator Community</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.015em]">
              <span className="block">Accelerating people.</span>
              <em className="block font-normal italic text-[#9DB2FF]">Building leaders.</em>
              <span className="block">Celebrating excellence.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-10 grid gap-10 md:grid-cols-12 md:items-end">
              <p className="lead text-mist md:col-span-6">{site.shortDescription}</p>
              <div className="flex flex-col gap-3 sm:flex-row md:col-span-6 md:justify-end">
                <Link href="/about" className="btn btn-ghost-light">Explore Accelerator</Link>
                <Link href="/events#tickets" className="btn btn-red">Register for Events 2026 <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ANNOUNCEMENT TICKER */}
      <div className="overflow-hidden bg-red py-4 text-white" aria-label="Announcement">
        <div className="animate-marquee flex w-max gap-12 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.3em] motion-reduce:animate-none">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-12" aria-hidden={k === 1}>
              <span>{event.name}</span><span>&#9670;</span>
              <span>{open ? `${open.name} registration now open${open.salesEnd ? ` until ${formatLagos(open.salesEnd)} WAT` : ""}` : "Registration details coming soon"}</span><span>&#9670;</span>
              <span>{formatLagosDate(event.startsAt, true)}{event.city ? ` \u00b7 ${event.city}` : ""}</span><span>&#9670;</span>{event.theme && <><span>{event.theme}</span><span>&#9670;</span></>}<span>Registration from {formatNaira(MIN_FEE_KOBO)}</span><span>&#9670;</span><span>₦100K Content Challenge</span><span>&#9670;</span>
              <span>Recognition</span><span>&#9670;</span><span>Training</span><span>&#9670;</span><span>Networking</span><span>&#9670;</span><span>Competitions</span><span>&#9670;</span>
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT PREVIEW */}
      <section className="relative overflow-hidden bg-cream py-24 md:py-36">
        <div className="container-x grid gap-16 md:grid-cols-12 md:items-center">
          <div className="md:col-span-6">
            <Reveal>
              <p className="eyebrow">Who we are</p>
              <h2 className="display-lg mt-5 text-navy">A community where people grow, lead and are celebrated.</h2>
              <span className="rule-red mt-8" />
              <p className="lead mt-8 max-w-xl text-ink/80">{site.shortDescription}</p>
              {!site.story && <p className="mt-6"><Pending label="Official community story to be supplied" className="text-slate" /></p>}
              <Link href="/about" className="link-arrow mt-10">About Accelerator <ArrowRight size={16} aria-hidden="true" /></Link>
            </Reveal>
          </div>
          <div className="relative md:col-span-6">
            <Reveal delay={0.1}>
              <ImageReveal className="relative aspect-[4/3] w-full overflow-hidden">
                <Image src="/images/community-gathering-steps.jpg" alt="A large group of Accelerator Community members together at the foot of a staircase" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
              </ImageReveal>
              <div className="absolute -bottom-10 -left-4 w-[46%] border-[6px] border-cream md:-left-12">
                <div className="relative aspect-[4/3]">
                  <Image src="/images/community-bus-park.jpg" alt="Smiling Accelerator Community members standing together outdoors" fill sizes="25vw" className="object-cover" />
                </div>
              </div>
              <div className="absolute -right-3 -top-3 -z-10 h-1/2 w-1/2 bg-royal md:-right-6 md:-top-6" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* MISSION, VISION, PILLARS */}
      <section className="grain relative overflow-hidden bg-navy py-24 text-white md:py-32">
        <div className="container-x">
          <div className="grid gap-12 md:grid-cols-2 md:gap-20">
            {([["Our mission", site.mission], ["Our vision", site.vision]] as const).map(([label, text], i) => (
              <Reveal key={label} delay={i * 0.08}>
                <p className="eyebrow">{label}</p>
                {text ? (
                  <p className="mt-5 font-display text-3xl leading-snug md:text-4xl">{text}</p>
                ) : (
                  <div className="mt-6 border-l-2 border-white/20 pl-6">
                    <p className="font-display text-2xl italic text-mist md:text-3xl">The official {label.toLowerCase().replace("our ", "")} statement will appear here.</p>
                    <Pending label="Awaiting official text" className="mt-5 text-mist" />
                  </div>
                )}
              </Reveal>
            ))}
          </div>

          <div className="mt-24 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {site.pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06} className="bg-navy">
                <div className="h-full p-8">
                  <span className={`block h-1 w-10 ${["bg-red", "bg-royal", "bg-gold", "bg-white"][i]}`} />
                  <p className="mt-8 font-display text-sm italic text-mist">0{i + 1}</p>
                  <h3 className="mt-2 font-display text-3xl">{p.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-mist">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED EVENT */}
      <section aria-labelledby="featured-event" className="bg-navy-900 text-white">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[380px] lg:min-h-[640px]">
            <Parallax className="absolute inset-0 overflow-hidden" distance={-60}>
              <Image src="/images/community-bus-park.jpg" alt="Accelerator Community members in colourful outfits at a community outing" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </Parallax>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-navy-900/70" />
            <Facets side="left" className="absolute -bottom-8 -left-4 h-56 w-auto" />
          </div>
          <div className="relative flex flex-col justify-center px-6 py-20 md:px-16 lg:px-20">
            <Reveal>
              <p className="eyebrow">Featured event</p>
              <h2 id="featured-event" className="display-lg mt-5">{event.name}</h2>
              {event.theme ? (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mist">Theme</p>
                  <p className="mt-2 font-display text-3xl italic text-[#9DB2FF]">{event.theme}</p>
                  {event.themeTagline && <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/85">{event.themeTagline}</p>}
                </div>
              ) : <Pending label="Theme to be announced" className="mt-5 text-mist" />}
              <p className="lead mt-8 max-w-lg text-mist">
                A celebration of achievement and growth: recognition for outstanding members, leadership training, inspiring speakers, networking and video competitions.
              </p>
              <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-white/15 pt-8 text-sm">
                <div><dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Date</dt><dd className="mt-2 font-display text-xl">{formatLagosDate(event.startsAt, true) ?? "To be announced"}</dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mist">Venue</dt><dd className="mt-2 font-display text-xl">{where || "To be announced"}</dd></div>
              </dl>
              {event.startsAt && (
                <div className="mt-8"><Countdown target={event.startsAt} serverNow={now} label={event.name} /></div>
              )}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/events#tickets" className="btn btn-red">{open ? `Register: ${open.name}` : "See registration"}</Link>
                <Link href="/events" className="btn btn-ghost-light">Event details</Link>
              </div>
            </Reveal>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ href, title, text, Icon, bg }) => (
            <Link key={title} href={href} className={`group ${bg} relative flex min-h-[180px] flex-col justify-between p-6 text-white transition-[filter] hover:brightness-110 md:min-h-[220px] md:p-8`}>
              <Icon size={34} strokeWidth={1.4} aria-hidden="true" />
              <div>
                <h3 className="font-display text-2xl md:text-3xl">{title}</h3>
                <p className="mt-1 text-xs text-white/80 md:text-sm">{text}</p>
              </div>
              <ArrowRight className="absolute right-6 top-6 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" size={20} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      <section className="bg-cream py-24 md:py-32" aria-labelledby="gallery-title">
        <div className="container-x">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal>
              <p className="eyebrow">Gallery</p>
              <h2 id="gallery-title" className="display-lg mt-5 max-w-2xl text-navy">Our community, in pictures.</h2>
            </Reveal>
            <p className="max-w-sm text-sm text-slate">More photographs from meetings, events and award moments will be added as they are shared.</p>
          </div>
          <Gallery photos={gallery} />
        </div>
      </section>

      {/* FOUNDER PREVIEW */}
      <section className="bg-white py-24 md:py-32" aria-labelledby="founder-title">
        <div className="container-x grid gap-14 md:grid-cols-12 md:items-center">
          <div className="md:col-span-5">
            <Reveal>
              <div className="relative aspect-[4/5] overflow-hidden bg-navy">
                {site.founder.photo ? (
                  <Image src={site.founder.photo} alt={`${site.founder.name ?? "Founder"}, founder of Accelerator Community`} fill sizes="40vw" className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center text-white">
                    <Logo variant="icon-reversed" width={140} />
                    <Pending label="Official founder photograph" className="text-mist" />
                  </div>
                )}
                <span className="absolute bottom-0 left-0 h-2 w-1/2 bg-red" />
              </div>
            </Reveal>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <Reveal delay={0.08}>
              <p className="eyebrow">Meet the founder</p>
              <h2 id="founder-title" className="display-lg mt-5 text-navy">{site.founder.name ?? "The vision behind Accelerator"}</h2>
              {site.founder.shortIntro ? (
                <p className="lead mt-8 text-ink/80">{site.founder.shortIntro}</p>
              ) : (
                <div className="mt-8 space-y-4">
                  <p className="lead text-ink/70">The founder&rsquo;s introduction will appear here once the official biography is supplied.</p>
                  <Pending label="Name, photo and biography" className="text-slate" />
                </div>
              )}
              <Link href="/founder" className="link-arrow mt-10">Founder profile <ArrowRight size={16} aria-hidden="true" /></Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section className="border-y border-sand bg-cream py-20" aria-labelledby="impact-title">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 id="impact-title" className="display-md text-navy">Community impact</h2>
            {site.impact.every((s) => !s.value) && <Pending label="Verified figures to be supplied" className="text-slate" />}
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-px bg-sand lg:grid-cols-4">
            {site.impact.map((s) => (
              <div key={s.label} className="bg-cream p-6 md:p-8">
                <dd className="font-display text-5xl text-navy md:text-6xl">{s.value ?? <span className="text-sand">&mdash;</span>}</dd>
                <dt className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative isolate overflow-hidden bg-royal py-24 text-white md:py-32">
        <Facets side="right" className="pointer-events-none absolute -right-8 -top-10 -z-10 h-[460px] w-auto opacity-90" />
        <div className="container-x">
          <Reveal>
            <h2 className="display-xl max-w-4xl">Be part of what&rsquo;s next.</h2>
            <p className="lead mt-6 max-w-xl text-white/85">Join the community, get in touch, or secure your place at {event.name}.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/events#tickets" className="btn btn-red">Register now</Link>
              <Link href="/contact" className="btn btn-ghost-light">Contact us</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
