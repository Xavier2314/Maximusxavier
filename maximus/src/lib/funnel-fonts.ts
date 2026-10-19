import { DM_Sans, Inter, Lora, Playfair_Display, Poppins, Space_Grotesk } from "next/font/google";

// One CSS variable per family; funnel styles pick from these (see funnel-styles.ts).
const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--f-poppins", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--f-playfair", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--f-dmsans", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--f-spacegrotesk", display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--f-lora", display: "swap" });

/** Put this on a wrapper so every funnel font is available inside it. */
export const FUNNEL_FONT_CLASS = [inter, poppins, playfair, dmSans, spaceGrotesk, lora].map((f) => f.variable).join(" ");
