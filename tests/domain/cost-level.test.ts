import { describe, expect, it } from "vitest";
import { COST_LEVELS, costLevelRank, isCostLevel } from "@/domain/cost-level";

describe("cost levels", () => {
  it("rank from cheapest to most expensive with unique ranks", () => {
    const ranks = COST_LEVELS.map(costLevelRank);

    expect(ranks).toEqual([1, 2, 3, 4]);
    expect(COST_LEVELS).toEqual(["Budget", "Moderate", "Premium", "Luxury"]);
  });

  it("recognise only the stored strings", () => {
    expect(isCostLevel("Budget")).toBe(true);
    expect(isCostLevel("budget")).toBe(false);
    expect(isCostLevel(1)).toBe(false);
  });
});
