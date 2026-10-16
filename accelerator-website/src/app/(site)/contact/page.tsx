import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { Pending } from "@/components/Pending";
import { SocialIcon } from "@/components/SocialIcon";
import { Reveal } from "@/components/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Accelerator Community about membership, Accelerators Events 2026, partnerships and sponsorship.",
  alternates: { canonical: "/contact" },
};

const channels = [
  { title: "Community enquiries", text: "Joining, volunteering or getting involved." },
  { title: "Event enquiries", text: "Tickets, registration and event-day questions for Accelerators Events 2026." },
  { title: "Partnerships & sponsorship", text: "Brands and organisations who want to support the community." },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const socials = site.social.filter((s) => s.href);
  return (
    <>
      <PageHero eyebrow="Contact us" title="Let's talk." intro="Questions about the community, the event or a partnership? Send us a message and we will get back to you." />
      <section className="bg-cream py-20 md:py-28">
        <div className="container-x grid grid-cols-1 gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <ul className="space-y-8">
                <li className="flex gap-4"><Mail className="mt-1 shrink-0 text-red" aria-hidden="true" /><div className="min-w-0"><p className="field-label">General enquiries</p>{site.contact.email ? <a href={`mailto:${site.contact.email}`} className="break-all text-lg text-navy underline-offset-4 hover:underline">{site.contact.email}</a> : <Pending label="Official email" className="text-slate" />}</div></li>
                {site.contact.adminEmail && <li className="flex gap-4"><Mail className="mt-1 shrink-0 text-red" aria-hidden="true" /><div className="min-w-0"><p className="field-label">Admin &amp; registration</p><a href={`mailto:${site.contact.adminEmail}`} className="break-all text-lg text-navy underline-offset-4 hover:underline">{site.contact.adminEmail}</a></div></li>}
                {site.contact.phone && <li className="flex gap-4"><Phone className="mt-1 shrink-0 text-red" aria-hidden="true" /><div><p className="field-label">Phone</p><a href={`tel:${site.contact.phone}`} className="text-lg text-navy">{site.contact.phone}</a></div></li>}
                {site.contact.address && <li className="flex gap-4"><MapPin className="mt-1 shrink-0 text-red" aria-hidden="true" /><div><p className="field-label">Address</p><p className="text-lg text-navy">{site.contact.address}</p></div></li>}
              </ul>
              {socials.length > 0 && (
                <div className="mt-12 border-t border-sand pt-8">
                  <p className="field-label">Social</p>
                  <ul className="mt-4 space-y-3">{socials.map((s) => (
                    <li key={s.name}><a href={s.href!} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-[44px] items-center gap-3 text-navy hover:text-red">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white transition-colors group-hover:bg-red"><SocialIcon name={s.name} /></span>
                      <span><span className="block font-semibold">{s.name}</span>{s.handle && <span className="block text-sm text-slate">{s.handle}</span>}</span>
                    </a></li>
                  ))}</ul>
                </div>
              )}
              <div className="mt-12 space-y-6 border-t border-sand pt-8">
                {channels.map((c) => (
                  <div key={c.title}><h2 className="font-display text-2xl text-navy">{c.title}</h2><p className="mt-1 text-sm text-slate">{c.text}</p></div>
                ))}
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal delay={0.08}>
              <div className="bg-white p-6 shadow-[0_30px_60px_-40px_rgba(11,30,63,.45)] sm:p-10">
                <h2 className="display-md text-navy">Send a message</h2>
                <p className="mb-8 mt-3 text-sm text-slate">Fields marked * are required.</p>
                <ContactForm defaultTopic={topic} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
