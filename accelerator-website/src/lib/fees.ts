/**
 * Registration fees for Accelerators Events 2026, by membership position. Amounts are in kobo (₦1 = 100 kobo).
 * - Early Bird (until 31 Oct 2026, 11:59 PM Lagos): the official "Grab your ticket now" flyer (October 2026).
 * - Late Registration (from 1 Nov 2026, 12:00 AM Lagos): Early Bird + 10%, rounded up to the nearest ₦500
 *   (as instructed by the organisers, 31 October 2026).
 */
export const POSITIONS = [
  { id: "member", name: "Member", feeKobo: 2_000_00, lateFeeKobo: 2_500_00 },
  { id: "distributor", name: "Distributor", feeKobo: 10_000_00, lateFeeKobo: 11_000_00 },
  { id: "manager", name: "Manager", feeKobo: 15_000_00, lateFeeKobo: 16_500_00 },
  { id: "senior_manager", name: "Senior Manager", feeKobo: 20_000_00, lateFeeKobo: 22_000_00 },
  { id: "executive_manager", name: "Executive Manager", feeKobo: 25_000_00, lateFeeKobo: 27_500_00 },
  { id: "director", name: "Director", feeKobo: 50_000_00, lateFeeKobo: 55_000_00 },
  { id: "emerald_director", name: "Emerald Director", feeKobo: 55_000_00, lateFeeKobo: 60_500_00 },
  { id: "sapphire_director", name: "Sapphire Director", feeKobo: 80_000_00, lateFeeKobo: 88_000_00 },
  { id: "ruby_director", name: "Ruby Director", feeKobo: 100_000_00, lateFeeKobo: 110_000_00 },
] as const;

/** Late Registration fees apply from this instant (1 Nov 2026, 12:00 AM Lagos). */
export const LATE_FROM = "2026-10-31T23:00:00.000Z";
export const isLateRegistration = (now: Date | number = Date.now()) => +now >= Date.parse(LATE_FROM);

export type PositionFee = { id: PositionId; name: string; feeKobo: number };
/** Positions with the fee that applies at `now` (Early Bird before LATE_FROM, Late Registration after). */
export function positionsAt(now: Date | number = Date.now()): PositionFee[] {
  const late = isLateRegistration(now);
  return POSITIONS.map((p) => ({ id: p.id, name: p.name, feeKobo: late ? p.lateFeeKobo : p.feeKobo }));
}
export const feeAt = (id: string, now: Date | number = Date.now()) => positionsAt(now).find((p) => p.id === id)?.feeKobo ?? null;
export const minFeeAt = (now: Date | number = Date.now()) => Math.min(...positionsAt(now).map((p) => p.feeKobo));
export const maxFeeAt = (now: Date | number = Date.now()) => Math.max(...positionsAt(now).map((p) => p.feeKobo));

export type PositionId = (typeof POSITIONS)[number]["id"];
export const POSITION_IDS = POSITIONS.map((p) => p.id) as [PositionId, ...PositionId[]];
export const positionById = (id: string) => POSITIONS.find((p) => p.id === id) ?? null;

/** Early Bird minimum / maximum (kept for older imports; prefer minFeeAt / maxFeeAt). */
export const MIN_FEE_KOBO = Math.min(...POSITIONS.map((p) => p.feeKobo));
export const MAX_FEE_KOBO = Math.max(...POSITIONS.map((p) => p.feeKobo));

/** Official payment account from the flyer. */
export const BANK_ACCOUNT = {
  bank: "Moniepoint",
  accountNumber: "8115774517",
  accountName: "Aluele Valentine Emmanuel",
};
