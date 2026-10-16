/**
 * Registration fees for Accelerators Events 2026, by membership position.
 * Source: official "Grab your ticket now" flyer supplied by Accelerator Community (October 2026).
 * Amounts are in kobo (₦1 = 100 kobo).
 */
export const POSITIONS = [
  { id: "member", name: "Member", feeKobo: 2_000_00 },
  { id: "distributor", name: "Distributor", feeKobo: 10_000_00 },
  { id: "manager", name: "Manager", feeKobo: 15_000_00 },
  { id: "senior_manager", name: "Senior Manager", feeKobo: 20_000_00 },
  { id: "executive_manager", name: "Executive Manager", feeKobo: 25_000_00 },
  { id: "director", name: "Director", feeKobo: 50_000_00 },
  { id: "emerald_director", name: "Emerald Director", feeKobo: 55_000_00 },
  { id: "sapphire_director", name: "Sapphire Director", feeKobo: 80_000_00 },
  { id: "ruby_director", name: "Ruby Director", feeKobo: 100_000_00 },
] as const;

export type PositionId = (typeof POSITIONS)[number]["id"];
export const POSITION_IDS = POSITIONS.map((p) => p.id) as [PositionId, ...PositionId[]];
export const positionById = (id: string) => POSITIONS.find((p) => p.id === id) ?? null;

export const MIN_FEE_KOBO = Math.min(...POSITIONS.map((p) => p.feeKobo));
export const MAX_FEE_KOBO = Math.max(...POSITIONS.map((p) => p.feeKobo));

/** Official payment account from the flyer. */
export const BANK_ACCOUNT = {
  bank: "Moniepoint",
  accountNumber: "8115774517",
  accountName: "Aluele Valentine Emmanuel",
};
