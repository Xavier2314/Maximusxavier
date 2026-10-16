import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, CalendarDays, Clapperboard, Film, Hourglass, Sparkles, Trophy } from "lucide-react";
import { Facets } from "@/components/Facets";
import { Reveal } from "@/components/Reveal";
import { Pending } from "@/components/Pending";
import { Countdown } from "@/components/Countdown";
import { CONTEST_STATUS_LABEL, getContest } from "@/lib/content";
import { formatLagos, formatLagosDate } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "₦100K Content Challenge",
  description: "Accelerator Inter-Office ₦100K Content Challenge: create and edit standout video content and win ₦50,000, ₦30,000 or ₦20,000. Entries close 31 October 2026.",
  alternates: { canonical: "/events/content-challenge" },
};

const prizes = [
  { place: "1st", label: "First place", amount: "₦50,000", bar: "bg-gold", h: "md:h-72" },
  { place: "2nd", label: "Second place", amount: "₦30,000", bar: "bg-mist", h: "md:h-60" },
  { place: "3rd", label: "Third place", amount: "₦20,000", bar: "bg-red", h: "md:h-52" },
];

export default async function ContentChallengePage() {
  const c = await getContest("inter-office-100k-content-challenge");
  if (!c) notFound();
  const status = c.status;
  const now = Date.now();
  const daysLeft = c.deadline ? Math.ceil((Date.parse(c.deadline) - now) / 86_400_000) : null;
  const canSubmit = status === "open" && Boolean(c.submission_url);

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Facets side="right" className="pointer-events-none absolute -right-8 top-24 hidden h-[520px] w-auto md:block" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_20%_100%,rgba(30,75,255,.35),transparent)]" />
        <div className="container-x relative pb-16 pt-36 md:pb-24 md:pt-48">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Accelerators Events 2026 &middot; Video competition</p>
              <span className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${status === "open" ? "bg-red text-white" : "bg-white/10 text-white"}`}>{CONTEST_STATUS_LABEL[status]}</span>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-8 font-display font-medium leading-[0.92] tracking-[-0.02em]">
              <span className="block text-[clamp(1.6rem,3.6vw,2.75rem)] text-mist">Accelerator Inter-Office</span>
              <span className="mt-2 block text-[clamp(4.5rem,16vw,12rem)]"><span className="text-red">₦</span>100K</span>
              <span className="block text-[clamp(2.25rem,6vw,5rem)]">Content <em className="font-normal italic text-[#9DB2FF]">Challenge</em></span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-8 font-display text-2xl italic text-white md:text-3xl">The countdown is on! Who&rsquo;s taking home the ₦100,000?</p>
            <p className="lead mt-4 max-w-2xl text-mist">Every office: unleash your creativity, showcase your talent and compete for the ultimate bragging rights. Every edit counts.</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.4em] text-white">Edit &middot; Impact &middot; Inspire</p>
          </Reveal>
          {c.deadline && status === "open" && (
            <Reveal delay={0.18}>
              <div className="mt-10 grid max-w-3xl grid-cols-1 gap-6 border-t border-white/15 pt-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-mist">Time left to submit</p>
                  <Countdown target={c.deadline} serverNow={now} doneText="Submissions are now closed" />
                </div>
                {canSubmit && <a href={c.submission_url!} target="_blank" rel="noopener noreferrer" className="btn btn-red">Submit your entry <ArrowUpRight size={16} aria-hidden="true" /></a>}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* Key dates */}
      <section className="bg-red text-white">
        <div className="container-x grid divide-y divide-white/25 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { Icon: CalendarDays, k: "Challenge kicks off", v: formatLagosDate(c.starts_at) ?? "-" },
            { Icon: Hourglass, k: "Entry deadline", v: c.deadline ? `${formatLagosDate(c.deadline)}, 11:59 pm` : "-" },
            { Icon: Trophy, k: "Who will win?", v: status === "open" && daysLeft !== null && daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to enter` : "You?" },
          ].map(({ Icon, k, v }) => (
            <div key={k} className="flex items-center gap-4 py-7 sm:px-6 sm:first:pl-0">
              <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">{k}</p><p className="mt-1 font-display text-2xl">{v}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Prizes */}
      <section className="bg-cream py-24 md:py-32" aria-labelledby="prizes">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Prizes</p>
            <h2 id="prizes" className="display-lg mt-5 max-w-3xl text-navy">₦100,000 for the three best entries.</h2>
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3 md:items-end">
            {[prizes[1], prizes[0], prizes[2]].map((p, i) => (
              <Reveal key={p.place} delay={i * 0.08} className={p.place === "1st" ? "order-first md:order-none" : ""}>
                <article className={`relative flex flex-col justify-end overflow-hidden bg-navy p-8 text-white ${p.h}`}>
                  <span className={`absolute inset-x-0 top-0 h-2 ${p.bar}`} />
                  <p className="font-display text-6xl italic text-white/15">{p.place}</p>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-mist">{p.label}</p>
                  <p className="mt-2 font-display text-5xl tabular-nums md:text-6xl">{p.amount}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-24 md:py-32">
        <div className="container-x grid grid-cols-1 gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">How it works</p>
            <h2 className="display-lg mt-5 text-navy">Create. Edit. Submit.</h2>
            <p className="lead mt-6 text-ink/75">An inter-office challenge for the Accelerator community: show what you can create, edit it with impact, and put your best work forward.</p>
            <p className="mt-4 text-ink/75">As we build the excitement towards Accelerator Events 2026, let&rsquo;s make the energy louder, the creativity bigger and the competition unforgettable. Offices, are you ready? Represent your team and make history.</p>
          </Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            <ol className="divide-y divide-sand border-y border-sand">
              {[
                { Icon: Sparkles, t: "Plan your idea", d: "Choose a story that inspires and reflects the Accelerator spirit." },
                { Icon: Film, t: "Shoot and edit", d: "Edit with impact: strong opening, clear message, clean finish." },
                { Icon: Clapperboard, t: "Submit before the deadline", d: c.deadline ? `Entries close ${formatLagos(c.deadline)} (Lagos time).` : "Entries close on the deadline." },
              ].map(({ Icon, t, d }, i) => (
                <li key={t} className="flex gap-6 py-7">
                  <span className="font-display text-sm italic text-red">0{i + 1}</span>
                  <div className="flex-1"><h3 className="flex items-center gap-3 font-display text-2xl text-navy"><Icon size={22} className="text-royal" aria-hidden="true" />{t}</h3><p className="mt-2 text-ink/75">{d}</p></div>
                </li>
              ))}
            </ol>
            <div className="mt-10 border-l-4 border-gold bg-cream p-6">
              <p className="font-semibold text-navy">Entry rules and how to submit</p>
              {c.rules ? <p className="mt-2 whitespace-pre-line text-sm text-ink/80">{c.rules}</p> : (
                <>
                  <p className="mt-2 text-sm text-ink/80">Submit your entry through the official submission form before the deadline. Video length and format, and judging criteria will be shared here and with each office.</p>
                  <Pending label="Video format and judging criteria" className="mt-3 text-slate" />
                </>
              )}
              {canSubmit && <a href={c.submission_url!} target="_blank" rel="noopener noreferrer" className="btn btn-red mt-5">Submit your entry <ArrowUpRight size={16} aria-hidden="true" /></a>}
              {status === "closed" && <p className="mt-4 text-sm font-semibold text-red">Submissions are closed.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-royal py-20 text-white">
        <Facets side="right" className="pointer-events-none absolute -right-10 -top-10 -z-10 h-[380px] w-auto opacity-70" />
        <div className="container-x flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <h2 className="display-lg max-w-2xl">Part of Accelerators Events 2026, Ibadan.</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            {canSubmit && <a href={c.submission_url!} target="_blank" rel="noopener noreferrer" className="btn btn-red">Submit your entry <ArrowUpRight size={16} aria-hidden="true" /></a>}
            <Link href="/events/register" className={`btn ${canSubmit ? "btn-ghost-light" : "btn-red"}`}>Register for the event <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/contact?topic=Event%20enquiry" className="btn btn-ghost-light">Ask about the challenge</Link>
          </div>
        </div>
      </section>
    </>
  );
}
