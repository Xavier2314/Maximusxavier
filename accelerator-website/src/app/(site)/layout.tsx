import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollProgress } from "@/components/Motion";
import { CursorEffects } from "@/components/CursorEffects";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-3 focus:text-navy">Skip to content</a>
      <ScrollProgress />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CursorEffects />
    </>
  );
}
