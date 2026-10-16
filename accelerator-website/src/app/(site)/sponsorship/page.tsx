import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Download, Gift, Mail, MessageCircle, Mic, Store, Users } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Motion";
import { sponsorship } from "@/lib/site";
import { SponsorForm } from "@/components/SponsorForm";

export const metadata: Metadata = {
  title: "Sponsorship",
  description: "Showcase your brand at Accelerators Events 2026: The Summit of Excellence, Saturday 5 December 2026, Ibadan. 500 to 1,000 expected guests. Exhibit, speak on stage and gift our guests.",
  alternates: { canonical: "/sponsorship" },
};

const benefits = [
  { Icon: Store, t: "Showcase & exhibit", d: "A dedicated space to display your products, meet guests face to face, run demos and collect contacts throughout the day." },
  { Icon: Mic, t: "Speak on stage", d: "A speaking slot for your representative to introduce your business and products to the full audience." },
  { Icon: Users, t: "Live questions", d: "Guests ask your team about your brand and products directly, so they understand what you offer and how to buy." },
  { Icon: Gift, t: "Gifts that travel home", d: "Your branded tote bags, power banks, earpieces or other items go home with our guests and stay in daily use." },
];

const tiers = [
  { tag: "Headline", name: "Headline Partner", bar: "bg-gold", items: ["Speaking slot on the main stage", "Premium showcase space", "Live Q&A with guests", "Logo on the main event flyer and slides", "Stage recognition and community mentions", "Branded gifts to all guests"] },
  { tag: "Showcase", name: "Showcase Partner", bar: "bg-red", items: ["Short brand presentation", "Showcase space", "Q&A at your stand", "Logo on event slides", "Community mentions", "Branded gifts for guests"] },
  { tag: "Gift", name: "Gift Partner", bar: "bg-royal", items: ["Your branded items in guests' hands (tote bags, power banks, earpieces and more)", "Stage thank-you", "Community mentions"] },
];

export default function SponsorshipPage() {
  const s = sponsorship;
  return (
    <>
      <PageHero
        eyebrow="Sponsorship & partnership"
        title={<>Showcase your brand at <em className="font-normal italic text-[#9DB2FF]">The Summit of Excellence</em></>}
        intro={<>Saturday 5 December 2026 · Ibadan. Put your products in front of <b className="text-white">500 to 1,000 guests</b>: exhibit, speak on stage, answer questions and gift our audience.</>}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="#sponsor-form" className="btn btn-red">Fill the sponsor form <ArrowDown size={16} aria-hidden="true" /></a>
          <a href={s.whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-light">Chat on WhatsApp <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </PageHero>

      {/* Numbers */}
      <section className="bg-red text-white">
        <div className="container-x grid grid-cols-1 divide-y divide-white/25 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[["500–1,000", "Expected guests"], ["Sat 5 Dec 2026", "One full day"], ["Ibadan", "Venue city"]].map(([v, k]) => (
            <div key={k} className="py-7 sm:px-6 sm:first:pl-0"><p className="font-display text-3xl md:text-4xl">{v}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">{k}</p></div>
          ))}
        </div>
      </section>

      {/* Opportunity */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">The opportunity</p>
            <h2 className="display-lg mt-5 max-w-3xl text-navy">Meet your next customers in one room.</h2>
            <p className="lead mt-6 max-w-2xl text-ink/75">We are inviting a small number of brands to showcase their business at Accelerators Events 2026, the Accelerator community&rsquo;s biggest gathering of the year: recognition, leadership training, speakers, networking and the ₦100K Content Challenge.</p>
          </Reveal>
          <Stagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {benefits.map(({ Icon, t, d }) => (
              <StaggerItem key={t} className="border-t-4 border-red bg-white p-8 shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)]">
                <Icon size={28} className="text-royal" aria-hidden="true" />
                <h3 className="mt-5 font-display text-2xl text-navy">{t}</h3>
                <p className="mt-2 leading-relaxed text-ink/75">{d}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* What we ask */}
      <section className="bg-white py-24 md:py-28">
        <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">What we ask</p>
            <h2 className="display-md mt-4 text-navy">Support the day with gifts for our guests.</h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-6 lg:col-start-7">
            <p className="lead text-ink/80">Partners support the summit with <b>branded items for our guests</b> such as tote bags, power banks and earpieces, a cash contribution, or a mix we agree together. Everything given on the day carries your name home with our guests.</p>
            <p className="mt-4 text-ink/70">Your brand also gets recognition from the stage, mentions in our community channels and photos of your showcase for your own marketing. Exact visibility, timings and space are confirmed together.</p>
          </Reveal>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow">Partnership options</p>
            <h2 className="display-lg mt-5 text-navy">Choose how you take part.</h2>
            <p className="mt-4 max-w-2xl text-ink/70">Contributions are agreed with each partner: cash, branded items, or a mix. Every option can be adjusted.</p>
          </Reveal>
          <Stagger className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {tiers.map((t) => (
              <StaggerItem key={t.name} className="relative flex flex-col bg-white p-8 shadow-[0_10px_30px_-18px_rgba(11,30,63,.4)]">
                <span className={`absolute inset-x-0 top-0 h-1.5 ${t.bar}`} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">{t.tag}</p>
                <h3 className="mt-2 font-display text-3xl text-navy">{t.name}</h3>
                <ul className="mt-6 space-y-3 text-sm text-ink/80">
                  {t.items.map((i) => <li key={i} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-red" />{i}</li>)}
                </ul>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Sponsor form */}
      <section id="sponsor-form" className="scroll-mt-24 bg-white py-24 md:py-32">
        <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12">
          <Reveal className="min-w-0 lg:col-span-4">
            <p className="eyebrow">Sponsor form</p>
            <h2 className="display-md mt-4 text-navy">Register your brand as a partner.</h2>
            <p className="mt-5 text-ink/75">Fill in the form and your <b>personalised sponsorship proposal PDF</b> is created instantly, with your brand name and every answer you give.</p>
            <ol className="mt-8 space-y-4 text-sm text-ink/80">
              {["Fill in your details", "Download your personalised PDF", "Send it to us on WhatsApp or email", "We confirm your partnership"].map((t, i) => (
                <li key={t} className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red font-semibold text-white">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </Reveal>
          <div className="min-w-0 lg:col-span-8"><SponsorForm /></div>
        </div>
      </section>

      {/* Contact */}
      <section className="grain relative isolate overflow-hidden bg-navy py-24 text-white md:py-28">
        <div className="container-x grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow">Let&rsquo;s talk</p>
            <h2 className="display-lg mt-5">Make your brand part of the summit.</h2>
            <p className="lead mt-6 text-mist">Confirming early means your brand can appear on our event materials and announcements leading up to 5 December.</p>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5 lg:col-start-8">
            <div className="bg-white p-8 text-navy">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red">Sponsorship contact</p>
              <p className="mt-2 font-display text-3xl">{s.contactName}</p>
              <p className="text-sm text-slate">{s.contactOrg}</p>
              <div className="mt-6 space-y-3">
                <a href={s.whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-3 font-semibold hover:text-red"><MessageCircle size={20} className="text-red" aria-hidden="true" />{s.whatsappDisplay} <span className="text-xs font-normal text-slate">(WhatsApp only)</span></a>
                <a href={`mailto:${s.email}?subject=${encodeURIComponent("Sponsorship: Accelerators Events 2026")}`} className="flex min-h-[44px] items-center gap-3 break-all font-semibold hover:text-red"><Mail size={20} className="shrink-0 text-red" aria-hidden="true" />{s.email}</a>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <a href="#sponsor-form" className="btn btn-red w-full">Fill the sponsor form <ArrowUpRight size={16} aria-hidden="true" /></a>
                <a href={s.proposalPdf} download className="btn btn-ghost-dark w-full"><Download size={16} aria-hidden="true" /> Download the proposal</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
