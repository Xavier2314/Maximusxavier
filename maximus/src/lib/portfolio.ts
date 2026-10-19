/** Member portfolio websites (public at /p/<slug>). */
export type PortfolioService = { title: string; description: string; price?: string | null };
export type PortfolioProject = { title: string; description: string; link?: string | null };
export type Portfolio = {
  id: string; user_id: string; slug: string; title: string | null; published: boolean; headline: string | null; bio: string | null;
  skills: string[]; services: PortfolioService[]; projects: PortfolioProject[]; show_whatsapp: boolean; show_email: boolean;
  accent: string | null; views: number; updated_at: string;
};
export const PORTFOLIO_COLUMNS = "id, user_id, slug, title, published, headline, bio, skills, services, projects, show_whatsapp, show_email, accent, views, updated_at";

/** "Title | price | description" lines, one service per line. */
export const servicesToText = (list: PortfolioService[]) => list.map((s) => [s.title, s.price ?? "", s.description].join(" | ")).join("\n");
export function textToServices(text: string): PortfolioService[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0])
    .slice(0, 12).map(([title, price, ...rest]) => ({ title: title.slice(0, 80), price: price ? price.slice(0, 40) : null, description: rest.join(" | ").slice(0, 400) }));
}
/** "Title | link | description" lines, one project per line. */
export const projectsToText = (list: PortfolioProject[]) => list.map((p) => [p.title, p.link ?? "", p.description].join(" | ")).join("\n");
export function textToProjects(text: string): PortfolioProject[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0])
    .slice(0, 20).map(([title, link, ...rest]) => ({
      title: title.slice(0, 100), link: link && /^https?:\/\/\S+$/i.test(link) ? link.slice(0, 300) : null, description: rest.join(" | ").slice(0, 500),
    }));
}
