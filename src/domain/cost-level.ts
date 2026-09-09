/**
 * Price tier of a destination. The values are the strings stored in the database
 * and exposed by the API; `rank` gives the domain ordering that a plain
 * alphabetical sort would get wrong (Budget < Moderate < Premium < Luxury).
 */
export const COST_LEVELS = ["Budget", "Moderate", "Premium", "Luxury"] as const;

export type CostLevel = (typeof COST_LEVELS)[number];

export function isCostLevel(value: unknown): value is CostLevel {
  return typeof value === "string" && (COST_LEVELS as readonly string[]).includes(value);
}

/** Position in the cheapest-to-most-expensive ordering, starting at 1. */
export function costLevelRank(level: CostLevel): number {
  return COST_LEVELS.indexOf(level) + 1;
}
