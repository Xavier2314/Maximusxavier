import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, ExternalLink, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { PORTFOLIO_COLUMNS, type Portfolio } from "@/lib/portfolio";
import { rankLabel } from "@/lib/ranks";
import { createAdminClient } from "@/lib/supabase/server";

type Owner = { full_name: string; avatar_url: string | null; business_rank: string | null; whatsapp: string | null; email: string; office_id: string | null };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data: site } = await admin.from("portfolios").select(PORTFOLIO_COLUMNS).eq("slug", slug).eq("published", true).maybeSingle<Portfolio>();
  if (!site) return null;
  const { data: owner } = await admin.from("profiles").select("full_name, avatar_url, business_rank, whatsapp, email, office_id").eq("id", site.user_id).eq("status", "active").maybeSingle<Owner>();
  if (!owner) return null;
  const [{ count: done }, { data: office }] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).eq("member_id", site.user_id).in("status", ["confirmed", "delivered"]),
    owner.office_id ? admin.from("offices").select("display_name, name, white_label, full_white_label").eq("id", owner.office_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return { site, owner, done: done ?? 0, office };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug);
  if (!d) return { title: "Portfolio not found" };
  return {
    title: `${d.owner.full_name}${d.site.headline ? ` · ${d.site.headline}` : ""}`,
    description: d.site.bio?.slice(0, 160) ?? undefined,
    openGraph: { title: d.owner.full_name, description: d.site.headline ?? undefined, images: d.owner.avatar_url ? [d.owner.avatar_url] : undefined },
  };
}

/** A member's public one-page portfolio website. */
export default async function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { site, owner, done, office } = d;
  await createAdminClient().rpc("portfolio_viewed", { p_slug: site.slug });
  const accent = site.accent ?? "#2563eb";
  const wa = site.show_whatsapp && owner.whatsapp ? `https://wa.me/${owner.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${owner.full_name.split(" ")[0]}, I saw your portfolio and I'd like to work with you.`)}` : null;
  const mail = site.show_email ? `mailto:${owner.email}` : null;
  const made = office?.full_white_label && office.white_label ? (office.display_name || office.name) : "Maximus";

  return (
    <div className="min-h-dvh bg-[#f8fafc] text-[#0f172a]" style={{ ["--accent" as string]: accent }}>
      <header className="relative overflow-hidden px-4 pb-16 pt-[max(3rem,env(safe-area-inset-top))] text-white" style={{ background: `linear-gradient(135deg, #0f172a 0%, ${accent} 140%)` }}>
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-30 blur-3xl" style={{ background: accent }} aria-hidden />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <Avatar name={owner.full_name} src={owner.avatar_url} size={112} className="ring-4 ring-white/20" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">{owner.full_name}</h1>
          {site.headline && <p className="mt-3 max-w-2xl text-lg text-white/85 sm:text-xl">{site.headline}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {rankLabel(owner.business_rank) && <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-semibold"><BadgeCheck className="size-4" aria-hidden />{rankLabel(owner.business_rank)}</span>}
            {done > 0 && <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">{done}+ orders completed</span>}
          </div>
          {(wa || mail) && (
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#25d366] px-6 font-bold text-[#053d1e] shadow-lg"><MessageCircle className="size-5" aria-hidden />Hire me on WhatsApp</a>}
              {mail && <a href={mail} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-[#0f172a] shadow-lg"><Mail className="size-5" aria-hidden />Email me</a>}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-8 max-w-4xl space-y-6 px-4 pb-16">
        {site.bio && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>About me</h2>
            <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-[#334155]">{site.bio}</p>
          </section>
        )}
        {site.skills.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>Skills</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {site.skills.map((s) => <li key={s} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: `${accent}1a`, color: accent }}>{s}</li>)}
            </ul>
          </section>
        )}
        {site.services.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>Services</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.services.map((s, i) => (
                <article key={i} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                  <Sparkles className="size-6" style={{ color: accent }} aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                  {s.price && <p className="text-sm font-semibold" style={{ color: accent }}>{s.price}</p>}
                  <p className="mt-2 text-[#475569]">{s.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {site.projects.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>Work samples</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.projects.map((p, i) => (
                <article key={i} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                  <Briefcase className="size-6 text-[#64748b]" aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                  <p className="mt-2 text-[#475569]">{p.description}</p>
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: accent }}>View project<ExternalLink className="size-3.5" aria-hidden /></a>}
                </article>
              ))}
            </div>
          </section>
        )}
        {(wa || mail) && (
          <section className="rounded-3xl p-8 text-center text-white" style={{ background: accent }}>
            <p className="text-2xl font-extrabold">Let&apos;s work together</p>
            <p className="mt-1 text-white/85">Send me a message and I&apos;ll reply as soon as I can.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-[#0f172a]"><MessageCircle className="size-5" aria-hidden />WhatsApp me</a>}
              {mail && <a href={mail} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/15 px-6 font-bold text-white ring-1 ring-white/40"><Mail className="size-5" aria-hidden />Email me</a>}
            </div>
          </section>
        )}
      </main>
      <footer className="pb-8 text-center text-xs text-[#94a3b8]">
        {made === "Maximus" ? <>Made with <Link href="/" className="font-semibold hover:underline">Maximus</Link></> : <>Made with {made}</>}
      </footer>
    </div>
  );
}
