import Image from "next/image";
import type { ReactNode } from "react";
import { Facets } from "./Facets";

/** Standard dark hero for inner pages: navy field, optional duotone photo, facet accent. */
export function PageHero({ eyebrow, title, intro, image, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; image?: { src: string; alt: string }; children?: ReactNode }) {
  return (
    <section className="grain relative isolate overflow-hidden bg-navy text-white">
      {image && (
        <>
          <Image src={image.src} alt={image.alt} fill priority sizes="100vw" className="-z-20 object-cover opacity-40 mix-blend-luminosity" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/85 to-navy/40" />
        </>
      )}
      <Facets side="right" className="pointer-events-none absolute -right-10 top-24 hidden h-[420px] w-auto opacity-90 md:block" />
      <div className="container-x relative pb-20 pt-36 md:pb-28 md:pt-48">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-lg mt-5 max-w-4xl">{title}</h1>
        {intro && <div className="lead mt-6 max-w-2xl text-mist">{intro}</div>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}
