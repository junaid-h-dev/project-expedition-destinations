import { describe, expect, it } from "vitest";
import { listQuerySchema } from "@/destinations/query";

describe("API listing schema", () => {
  it("applies defaults and rejects out-of-range values", () => {
    expect(listQuerySchema.parse({})).toEqual({
      search: null,
      region: null,
      cost_level: null,
      activity: null,
      sort: "name",
      direction: "asc",
      per_page: 15,
      page: 1,
    });

    const result = listQuerySchema.safeParse({ per_page: "101", sort: "id" });

    expect(result.success).toBe(false);
    // Every offending parameter is named, so the 422 body can list them per field.
    expect(result.error?.issues.map((issue) => issue.path.join(".")).sort()).toEqual([
      "per_page",
      "sort",
    ]);
  });
});
