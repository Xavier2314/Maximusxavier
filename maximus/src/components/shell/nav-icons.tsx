import {
  BarChart3, Bell, BookOpen, Building2, ClipboardCheck, Compass, GraduationCap, House, MapPin, Megaphone, Network,
  ScrollText, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Target, Trophy, Users, Wallet, type LucideIcon,
} from "lucide-react";

export const NAV_ICONS: Record<string, LucideIcon> = {
  home: House,
  network: Network,
  "map-pin": MapPin,
  target: Target,
  clipboard: ClipboardCheck,
  wallet: Wallet,
  bag: ShoppingBag,
  sparkles: Sparkles,
  compass: Compass,
  graduation: GraduationCap,
  trophy: Trophy,
  megaphone: Megaphone,
  chart: BarChart3,
  users: Users,
  building: Building2,
  check: ShieldCheck,
  book: BookOpen,
  sliders: SlidersHorizontal,
  scroll: ScrollText,
  bell: Bell,
};
