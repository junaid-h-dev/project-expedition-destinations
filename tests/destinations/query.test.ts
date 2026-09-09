import { describe, expect, it } from "vitest";
import {
  explorerHref,
  explorerStateFromSearchParams,
  explorerStateToListQuery,
} from "@/destinations/explorer-state";
import { listQuerySchema } from "@/destinations/query";

describe("explorer URL state", () => {
  const regions = ["Asia", "Europe"];

  it("restores a full state from the query string", () => {
    const state = explorerStateFromSearchParams(
      {
        q: "indonesia",
        region: "Asia",
        cost: "Budget",
        sort: "country",
        direction: "desc",
        page: "2",
      },
      regions,
    );

    expect(state).toEqual({
      search: "indonesia",
      region: "Asia",
      costLevel: "Budget",
      sort: "country",
      direction: "desc",
      page: 2,
    });
    expect(explorerStateToListQuery(state)).toMatchObject({
      costLevel: "Budget",
      region: "Asia",
      perPage: 10,
    });
  });

  it("normalises unknown or tampered values to defaults the controls can show", () => {
    const state = explorerStateFromSearchParams(
      {
        sort: "password",
        direction: "sideways",
        cost: "budget",
        region: "Atlantis",
        page: "-3",
        q: ["a", "b"],
      },
      regions,
    );

    expect(state).toEqual({
      search: "a",
      region: "",
      costLevel: "",
      sort: "name",
      direction: "asc",
      page: 1,
    });
    expect(explorerStateFromSearchParams({ q: "k".repeat(150) }, regions).search).toHaveLength(100);
  });

  it("builds clean URLs that omit defaults", () => {
    expect(
      explorerHref({
        search: "",
        region: "",
        costLevel: "",
        sort: "name",
        direction: "asc",
        page: 1,
      }),
    ).toBe("/");
    expect(
      explorerHref({
        search: "peru",
        region: "Asia",
        costLevel: "Budget",
        sort: "cost_level",
        direction: "desc",
        page: 2,
      }),
    ).toBe("/?q=peru&region=Asia&cost=Budget&sort=cost_level&direction=desc&page=2");
  });
});

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
