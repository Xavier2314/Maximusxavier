import type { Metadata } from "next";
import { FUNNEL_FONT_CLASS } from "@/lib/funnel-fonts";

export const metadata: Metadata = { title: "Funnel builder" };

/** The builder is full screen (no app sidebar) and has every funnel font loaded for its previews. */
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <div className={FUNNEL_FONT_CLASS}>{children}</div>;
}
