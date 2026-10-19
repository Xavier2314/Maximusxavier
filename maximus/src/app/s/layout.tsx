import { FUNNEL_FONT_CLASS } from "@/lib/funnel-fonts";

/** Public forms and surveys: loads the same fonts as funnels. */
export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return <div className={FUNNEL_FONT_CLASS}>{children}</div>;
}
