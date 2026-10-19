import { FUNNEL_FONT_CLASS } from "@/lib/funnel-fonts";

/** Public funnel pages: loads the funnel fonts. The seller's page controls everything else. */
export default function FunnelPublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={FUNNEL_FONT_CLASS}>{children}</div>;
}
