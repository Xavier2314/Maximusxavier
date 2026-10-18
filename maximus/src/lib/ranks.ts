/** Business status ladder (lowest to highest). Members choose their own. */
export const RANKS = [
  { key: "newbie", label: "Newbie" },
  { key: "probie", label: "Probie" },
  { key: "distributor", label: "Distributor" },
  { key: "manager", label: "Manager" },
  { key: "senior_manager", label: "Senior Manager" },
  { key: "executive_manager", label: "Executive Manager" },
  { key: "director", label: "Director" },
  { key: "emerald_director", label: "Emerald Director" },
  { key: "sapphire_director", label: "Sapphire Director" },
  ...[1, 2, 3, 4, 5].map((n) => ({ key: `ruby_director_${n}`, label: `${["One", "Two", "Three", "Four", "Five"][n - 1]} Ruby Director` })),
  ...[1, 2, 3, 4, 5].map((n) => ({ key: `diamond_director_${n}`, label: `${["One", "Two", "Three", "Four", "Five"][n - 1]} Diamond Director` })),
] as const;

/** Statuses offered at sign-up: Distributor and up. */
export const SIGNUP_RANKS = RANKS.slice(RANKS.findIndex((r) => r.key === "distributor"));

export type RankKey = (typeof RANKS)[number]["key"];
export const rankLabel = (key: string | null | undefined) => RANKS.find((r) => r.key === key)?.label ?? null;
