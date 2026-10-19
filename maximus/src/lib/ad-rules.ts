/**
 * Pre-publish checks for ad copy. Pure and dependency-free, so the same rules run on the server
 * (before an AI draft is stored), in the browser (as the seller edits) and in tests.
 *
 * These encode the main points of Meta's Advertising Standards for health, personal attributes,
 * income claims and unrealistic outcomes, plus Nigerian advertising practice. They are a safety net,
 * not a guarantee of approval: Meta decides, and its rules change.
 */
export type Severity = "block" | "warn";
export type AdIssue = { id: string; severity: Severity; message: string; fix: string; match: string };

type Rule = { id: string; severity: Severity; re: RegExp; message: string; fix: string };

const RULES: Rule[] = [
  { id: "medical-claim", severity: "block", re: /\b(cures?|cured|curing|heals?|healing|treats?|treating|treatment of|prevents?|preventing|reverses?|eliminates?)\b(?=[^.]{0,60}\b(disease|diabetes|cancer|hypertension|high blood pressure|ulcer|arthritis|hiv|aids|infection|stroke|asthma|fibroid|ailments?|illness|condition)\b)|\b(cure|cures|cured)\b/i,
    message: "Claims to cure, treat or prevent a disease or condition are not allowed.", fix: "Say what the product is and what it supports, e.g. “supports a healthy routine”." },
  { id: "disease-named", severity: "block", re: /\b(diabetes|diabetic|cancer|hypertension|high blood pressure|hiv|aids|stroke|ulcer|arthritis|fibroids?|erectile|infertility|impotence)\b/i,
    message: "Naming a disease or health condition in an ad is high risk.", fix: "Describe the everyday benefit instead of the condition." },
  { id: "personal-attribute", severity: "block", re: /\b(are|do|did|have)\s+you\s+(been\s+)?(suffer\w*|struggl\w*|overweight|fat|obese|diabetic|sick|ill|depressed|anxious|tired of being|having|got)\b|\byour\s+(belly(\s+fat)?|weight|obesity|diabetes|illness|disease|condition|fat|stomach\s+fat|body\s+shape)\b|\bif you\s+(are|have)\s+(overweight|fat|obese|diabetic|sick)\b/i,
    message: "Ads must not suggest you know a person's health, body or other personal condition.", fix: "Talk about the product, not the viewer: “A simple daily routine many people enjoy”." },
  { id: "guarantee", severity: "block", re: /\b(guarantee[ds]?|guaranteed results?|100\s?%\s?(effective|safe|working|results?|cure|natural results)|proven to|clinically proven|works for everyone|no side effects?|risk[- ]free results)\b/i,
    message: "Guaranteed or “proven” results and “no side effects” claims are not allowed.", fix: "Remove the guarantee. Results vary from person to person." },
  { id: "quantified-result", severity: "block", re: /\b(lose|drop|shed|burn|gain|grow|add)\s+(up to\s+)?\d+\s*(kg|kilos?|pounds?|lbs?|inch(es)?|cm)\b|\b\d+\s*(kg|kilos?|lbs?|pounds?)\s+(in|within)\s+\d+\s*(days?|weeks?|months?)\b|\bin\s+(just\s+)?\d+\s*(days?|weeks?)\b.{0,40}\b(results?|slim|flat|lose|weight|belly)/i,
    message: "Specific weight or body results, especially with a time frame, are unrealistic outcome claims.", fix: "Describe what the product is, not a numbered result." },
  { id: "before-after", severity: "block", re: /\b(before\s*(and|&|\/|-)\s*after|transformation|before\/after)\b/i,
    message: "Before-and-after and transformation content is restricted for health and weight products.", fix: "Use the product and its ingredients or how to use it." },
  { id: "income-claim", severity: "block", re: /\b(earn|make|making|income|paid)\s+(up to\s+)?[₦$£]?\s?\d[\d,.]*\s*(k|m|naira|ngn|usd|dollars?)?\s*(per|a|every|each|daily|weekly|monthly|\/)\s*(day|week|month|daily|weekly|monthly)|\b(get rich|passive income|financial freedom|quit your (9|nine)[- ]?(to|-)?\s?5|quit your job|be your own boss|work from home and earn|make money (online|fast|from home)|earn (extra )?money|unlimited income|residual income)\b/i,
    message: "Income, “get rich” and quick-money claims are banned, and are especially risky for network marketing.", fix: "Sell the product to customers. Do not promise or imply earnings." },
  { id: "recruitment", severity: "block", re: /\b(join (my|our) (team|business|network|downline)|recruiting|business opportunity|become a (distributor|consultant|member)|start your own business|downline|upline)\b/i,
    message: "Recruitment and business-opportunity wording changes the ad category and is likely to be rejected.", fix: "Advertise the product to customers only." },
  { id: "unsafe-ingredient", severity: "block", re: /\b(ephedra|ephedrine|chitosan|comfrey|dhea|human growth hormone|\bhgh\b|anabolic|steroids?|sibutramine|clenbuterol)\b/i,
    message: "Meta bans ads for these supplement ingredients.", fix: "Do not advertise this product on Meta." },
  { id: "body-shaming", severity: "warn", re: /\b(ugly|disgusting|embarrassing (body|belly|weight)|flabby|jiggly|muffin top|fat(ty)?\s+(belly|body|arms|thighs))\b/i,
    message: "Language that makes people feel bad about their body is not allowed.", fix: "Use positive, neutral wording." },
  { id: "meta-names", severity: "warn", re: /\b(facebook|instagram|meta)\b/i,
    message: "Ad copy should not use Facebook, Instagram or Meta names in a way that implies endorsement.", fix: "Say “message us” or “chat with us”." },
  { id: "fake-scarcity", severity: "warn", re: /\b(only\s+\d+\s+(left|remaining|in stock)|last chance|limited stock|selling fast|today only|ends tonight|hurry)\b/i,
    message: "Urgency and scarcity must be true. Customers and Meta check.", fix: "Keep it only if the stock or deadline is real." },
  { id: "testimonial", severity: "warn", re: /\b(customers? (say|love|report|tell)|thousands of (happy )?customers|trusted by \d|rated \d|5[- ]star|\d+\s*(\+)?\s*(happy )?customers)\b/i,
    message: "Reviews, ratings and customer counts must be real and provable.", fix: "Only use numbers and reviews you can show." },
  { id: "shouting", severity: "warn", re: /(!{2,}|\?{2,}|\b[A-Z]{4,}\b(?:\s+\b[A-Z]{4,}\b){2,})/,
    message: "Repeated punctuation and ALL-CAPS phrases look spammy and can lower approval and results.", fix: "Use normal sentences and one exclamation mark at most." },
];

const strip = (s: string) => s.replace(/\s+/g, " ");

/** Checks one piece of ad text. Returns every rule it breaks (one entry per rule). */
export function checkAdText(text: string): AdIssue[] {
  const t = strip(text ?? "");
  const out: AdIssue[] = [];
  for (const r of RULES) {
    const m = t.match(r.re);
    if (m) out.push({ id: r.id, severity: r.severity, message: r.message, fix: r.fix, match: m[0].slice(0, 60) });
  }
  return out;
}

export type ConceptText = { primaryText: string; headline: string; description: string; videoText?: string };

export function conceptText(c: ConceptText): string {
  return [c.primaryText, c.headline, c.description, c.videoText].filter(Boolean).join("\n");
}

export const hasBlocking = (issues: AdIssue[]) => issues.some((i) => i.severity === "block");

/** Things to confirm before the ad goes live, independent of the wording. */
export function productChecks(p: { healthProduct: boolean; registrationNumber: string }): { ok: boolean; text: string }[] {
  const out = [{ ok: true, text: "Ads for health products are shown to adults (18+) only. The plan sets this." }];
  if (p.healthProduct) {
    out.push({ ok: p.registrationNumber.trim().length >= 4, text: "Food, supplement or herbal product: add the product's NAFDAC registration number. Drugs and herbal medicines may also need advert approval from NAFDAC before they run." });
  }
  return out;
}
