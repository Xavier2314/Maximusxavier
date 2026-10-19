import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Download, ExternalLink, FileText, Globe, Mail, MessageCircle, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { videoEmbedUrl } from "@/lib/featured";
import { DEFAULT_DESIGN, PORTFOLIO_COLUMNS, SOCIALS, socialUrl, type Portfolio, type PortfolioBlock, type SectionKey } from "@/lib/portfolio";
import { createAdminClient } from "@/lib/supabase/server";

type Owner = { full_name: string; avatar_url: string | null; whatsapp: string | null; email: string; office_id: string | null };

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data: site } = await admin.from("portfolios").select(PORTFOLIO_COLUMNS).eq("slug", slug).eq("published", true).maybeSingle<Portfolio>();
  if (!site) return null;
  const { data: owner } = await admin.from("profiles").select("full_name, avatar_url, whatsapp, email, office_id").eq("id", site.user_id).eq("status", "active").maybeSingle<Owner>();
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

function Block({ b, accent, dark }: { b: PortfolioBlock; accent: string; dark: boolean }) {
  const card = dark ? "bg-[#111827] ring-white/10" : "bg-white ring-black/5";
  const sub = dark ? "text-[#cbd5e1]" : "text-[#475569]";
  const caption = (b.title || (b.type !== "text" && b.text)) && (
    <div className="p-4">
      {b.title && <h3 className="font-bold">{b.title}</h3>}
      {b.type !== "text" && b.text && <p className={`mt-1 text-sm ${sub}`}>{b.text}</p>}
    </div>
  );
  if (b.type === "text") {
    return (
      <article className={`rounded-3xl p-6 shadow-sm ring-1 sm:col-span-2 ${card}`}>
        {b.title && <h3 className="text-lg font-bold">{b.title}</h3>}
        <p className={`mt-2 whitespace-pre-line leading-relaxed ${sub}`}>{b.text}</p>
      </article>
    );
  }
  if (b.type === "image" && b.url) {
    return (
      <figure className={`overflow-hidden rounded-3xl shadow-sm ring-1 ${card}`}>
        <a href={b.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.url} alt={b.title ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </a>
        {caption}
      </figure>
    );
  }
  if (b.type === "video" && b.url) {
    return (
      <figure className={`overflow-hidden rounded-3xl shadow-sm ring-1 ${card}`}>
        <video src={b.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
        {caption}
      </figure>
    );
  }
  if (b.type === "embed" && b.provider && b.video_id) {
    return (
      <figure className={`overflow-hidden rounded-3xl shadow-sm ring-1 ${card}`}>
        <iframe src={videoEmbedUrl({ provider: b.provider, video_id: b.video_id } as Parameters<typeof videoEmbedUrl>[0])} title={b.title || "Video"}
          className="aspect-video w-full bg-black" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        {caption}
      </figure>
    );
  }
  if (b.type === "file" && b.url) {
    return (
      <a href={b.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 rounded-3xl p-5 shadow-sm ring-1 hover:opacity-90 ${card}`}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${accent}1a`, color: accent }}><FileText className="size-6" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{b.title || b.name || "Document"}</span>
          {b.text && <span className={`block truncate text-sm ${sub}`}>{b.text}</span>}
        </span>
        <Download className="size-5 shrink-0" style={{ color: accent }} aria-hidden />
      </a>
    );
  }
  return null;
}

/** A member's public one-page portfolio website. */
export default async function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { site, owner, done, office } = d;
  await createAdminClient().rpc("portfolio_viewed", { p_slug: site.slug });
  const accent = site.accent ?? "#2563eb";
  const design = { ...DEFAULT_DESIGN, ...(site.design ?? {}) };
  const dark = design.mode === "dark";
  const left = design.layout === "left";
  const show = (k: SectionKey) => !(design.hide ?? []).includes(k);
  const wa = site.show_whatsapp && owner.whatsapp ? `https://wa.me/${owner.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${owner.full_name.split(" ")[0]}, I saw your portfolio and I'd like to work with you.`)}` : null;
  const mail = site.show_email ? `mailto:${owner.email}` : null;
  const made = office?.full_white_label && office.white_label ? (office.display_name || office.name) : "Maximus";
  const socials = SOCIALS.map((s) => ({ ...s, url: socialUrl(s.key, site.socials?.[s.key]) })).filter((s) => s.url);
  const blocks = site.blocks ?? [];
  const mainButton = design.button_text || "Hire me on WhatsApp";

  const card = dark ? "bg-[#111827] ring-white/10" : "bg-white ring-black/5";
  const body = dark ? "text-[#cbd5e1]" : "text-[#475569]";
  const heading = "text-sm font-bold uppercase tracking-widest";
  const hero = design.cover_url
    ? `linear-gradient(180deg, rgba(15,23,42,.55) 0%, rgba(15,23,42,.85) 100%), url("${design.cover_url}") center/cover`
    : `linear-gradient(135deg, #0f172a 0%, ${accent} 140%)`;

  return (
    <div className={`min-h-dvh ${dark ? "bg-[#0b1120] text-[#f1f5f9]" : "bg-[#f8fafc] text-[#0f172a]"} ${design.font === "classic" ? "font-serif" : ""}`}
      style={{ ["--accent" as string]: accent }}>
      <header className="relative overflow-hidden px-4 pb-16 pt-[max(3rem,env(safe-area-inset-top))] text-white" style={{ background: hero }}>
        {!design.cover_url && <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-30 blur-3xl" style={{ background: accent }} aria-hidden />}
        <div className={`relative mx-auto flex max-w-4xl flex-col ${left ? "items-start text-left" : "items-center text-center"}`}>
          <Avatar name={owner.full_name} src={owner.avatar_url} size={112} className="ring-4 ring-white/20" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">{owner.full_name}</h1>
          {site.headline && <p className="mt-3 max-w-2xl text-lg text-white/85 sm:text-xl">{site.headline}</p>}
          {done > 0 && (
            <div className={`mt-4 flex flex-wrap gap-2 text-sm ${left ? "" : "justify-center"}`}>
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">{done}+ orders completed</span>
            </div>
          )}
          {(wa || mail) && (
            <div className={`mt-7 flex flex-wrap gap-3 ${left ? "" : "justify-center"}`}>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#25d366] px-6 font-bold text-[#053d1e] shadow-lg"><MessageCircle className="size-5" aria-hidden />{mainButton}</a>}
              {mail && <a href={mail} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-[#0f172a] shadow-lg"><Mail className="size-5" aria-hidden />{wa ? "Email me" : design.button_text || "Email me"}</a>}
            </div>
          )}
          {socials.length > 0 && (
            <ul className={`mt-5 flex flex-wrap gap-2 ${left ? "" : "justify-center"}`}>
              {socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url!} target="_blank" rel="noopener noreferrer me" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-semibold hover:bg-white/25">
                    <Globe className="size-4" aria-hidden />{s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <main className="mx-auto -mt-8 max-w-4xl space-y-6 px-4 pb-16">
        {show("about") && site.bio && (
          <section className={`rounded-3xl p-6 shadow-sm ring-1 sm:p-8 ${card}`}>
            <h2 className={heading} style={{ color: accent }}>About me</h2>
            <p className={`mt-3 whitespace-pre-line text-lg leading-relaxed ${body}`}>{site.bio}</p>
          </section>
        )}
        {show("skills") && site.skills.length > 0 && (
          <section className={`rounded-3xl p-6 shadow-sm ring-1 sm:p-8 ${card}`}>
            <h2 className={heading} style={{ color: accent }}>Skills</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {site.skills.map((s) => <li key={s} className="rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: `${accent}1a`, color: accent }}>{s}</li>)}
            </ul>
          </section>
        )}
        {show("gallery") && blocks.length > 0 && (
          <section>
            <h2 className={`mb-3 px-1 ${heading}`} style={{ color: accent }}>Portfolio</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {blocks.map((b) => <Block key={b.id} b={b} accent={accent} dark={dark} />)}
            </div>
          </section>
        )}
        {show("services") && site.services.length > 0 && (
          <section>
            <h2 className={`mb-3 px-1 ${heading}`} style={{ color: accent }}>Services</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.services.map((s, i) => (
                <article key={i} className={`rounded-3xl p-6 shadow-sm ring-1 ${card}`}>
                  <Sparkles className="size-6" style={{ color: accent }} aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
                  {s.price && <p className="text-sm font-semibold" style={{ color: accent }}>{s.price}</p>}
                  <p className={`mt-2 ${body}`}>{s.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}
        {show("work") && site.projects.length > 0 && (
          <section>
            <h2 className={`mb-3 px-1 ${heading}`} style={{ color: accent }}>Work samples</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.projects.map((p, i) => (
                <article key={i} className={`rounded-3xl p-6 shadow-sm ring-1 ${card}`}>
                  <Briefcase className="size-6 text-[#64748b]" aria-hidden />
                  <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                  <p className={`mt-2 ${body}`}>{p.description}</p>
                  {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: accent }}>View project<ExternalLink className="size-3.5" aria-hidden /></a>}
                </article>
              ))}
            </div>
          </section>
        )}
        {show("contact") && (wa || mail) && (
          <section className="rounded-3xl p-8 text-center text-white" style={{ background: accent }}>
            <p className="text-2xl font-extrabold">Let&apos;s work together</p>
            <p className="mt-1 text-white/85">Send me a message and I&apos;ll reply as soon as I can.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-bold text-[#0f172a]"><MessageCircle className="size-5" aria-hidden />{design.button_text || "WhatsApp me"}</a>}
              {mail && <a href={mail} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/15 px-6 font-bold text-white ring-1 ring-white/40"><Mail className="size-5" aria-hidden />Email me</a>}
            </div>
          </section>
        )}
      </main>
      <footer className={`pb-8 text-center text-xs ${dark ? "text-[#64748b]" : "text-[#94a3b8]"}`}>
        {made === "Maximus" ? <>Made with <Link href="/" className="font-semibold hover:underline">Maximus</Link></> : <>Made with {made}</>}
      </footer>
    </div>
  );
}
