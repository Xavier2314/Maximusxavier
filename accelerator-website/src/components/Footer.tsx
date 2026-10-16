import Link from "next/link";
import { Logo } from "./Logo";
import { FacetStrip } from "./Facets";
import { Pending } from "./Pending";
import { SocialIcon } from "./SocialIcon";
import { nav, site } from "@/lib/site";

export function Footer() {
  const socials = site.social.filter((s) => s.href);
  return (
    <footer className="relative bg-navy-900 text-white">
      <FacetStrip className="block h-2 w-full" />
      <div className="container-x grid gap-14 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <Logo variant="stacked-reversed" width={210} />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-mist">{site.shortDescription}</p>
        </div>
        <div className="md:col-span-2">
          <h2 className="eyebrow mb-5">Explore</h2>
          <ul className="space-y-1 text-sm">
            {nav.map((n) => (
              <li key={n.href}><Link className="inline-flex min-h-[40px] items-center text-white/80 hover:text-white" href={n.href}>{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <h2 className="eyebrow mb-5">Contact</h2>
          <ul className="space-y-3 text-sm text-white/80">
            <li>{site.contact.email ? <a href={`mailto:${site.contact.email}`} className="break-all hover:text-white">{site.contact.email}</a> : <Pending label="Official email" />}</li>
            {site.contact.adminEmail && <li><a href={`mailto:${site.contact.adminEmail}`} className="break-all hover:text-white">{site.contact.adminEmail}</a></li>}
            {site.contact.phone && <li><a href={`tel:${site.contact.phone}`} className="hover:text-white">{site.contact.phone}</a></li>}
            <li className="pt-2"><Link href="/contact" className="link-arrow !text-white">Send a message</Link></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h2 className="eyebrow mb-5">Follow</h2>
          {socials.length ? (
            <ul className="space-y-3 text-sm">
              {socials.map((s) => (
                <li key={s.name}>
                  <a href={s.href!} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-[44px] items-center gap-3 text-white/85 hover:text-white">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 transition-colors group-hover:border-red group-hover:bg-red"><SocialIcon name={s.name} /></span>
                    <span><span className="block font-semibold">{s.name}</span>{s.handle && <span className="block text-xs text-white/60">{s.handle}</span>}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/70">Follow our announcements in the community channels. Questions? <Link href="/contact" className="underline hover:text-white">Contact us</Link>.</p>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {site.legal.registeredName ?? site.name}.
            {site.legal.rcNumber ? ` RC ${site.legal.rcNumber}.` : ""} All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link href="/privacy" className="inline-flex min-h-[40px] items-center hover:text-white">Privacy</Link></li>
            <li><Link href="/terms" className="inline-flex min-h-[40px] items-center hover:text-white">Terms</Link></li>
            <li><Link href="/refunds" className="inline-flex min-h-[40px] items-center hover:text-white">Refunds &amp; cancellations</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
