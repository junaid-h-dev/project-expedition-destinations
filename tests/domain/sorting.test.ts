import { describe, expect, it } from "vitest";
import { isDestinationSort, isSortDirection, toggleDirection } from "@/domain/sorting";

describe("sorting allow-list", () => {
  it("accepts known columns and directions only", () => {
    expect(isDestinationSort("annual_visitors")).toBe(true);
    expect(isDestinationSort("password")).toBe(false);
    expect(isSortDirection("desc")).toBe(true);
    expect(isSortDirection("sideways")).toBe(false);
    expect(toggleDirection("asc")).toBe("desc");
  });
});
