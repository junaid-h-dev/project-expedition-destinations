import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import type { DestinationAttributes } from "@/domain/destination";
import {
  type DestinationListQuery,
  findDestination,
  listDestinations,
  listRegions,
  upsertDestination,
} from "@/destinations/repository";
import { createDestination } from "../support/factory";

const query = (overrides: Partial<DestinationListQuery> = {}): DestinationListQuery => ({
  sort: "name",
  direction: "asc",
  page: 1,
  perPage: 15,
  ...overrides,
});

const names = async (overrides: Partial<DestinationListQuery> = {}) =>
  (await listDestinations(query(overrides))).data.map((destination) => destination.name);

describe("destination repository", () => {
  it("stores and reads back typed attributes", async () => {
    const created = await createDestination({
      costLevel: "Premium",
      activities: ["Photography", "Camping"],
      annualVisitors: 2_500_000,
    });

    const found = await findDestination(created.id);

    expect(found).not.toBeNull();
    expect(found?.costLevel).toBe("Premium");
    expect(found?.activities).toEqual(["Photography", "Camping"]);
    expect(found?.annualVisitors).toBe(2_500_000);
    expect(found?.createdAt).toBeInstanceOf(Date);
    expect(await findDestination(999_999)).toBeNull();
  });

  it("enforces one name per country", async () => {
    await createDestination({ name: "Springfield", country: "USA" });

    await expect(
      db()
        .insertInto("destinations")
        .values({
          name: "Springfield",
          country: "USA",
          region: "North America",
          cost_level: "Budget",
          activities: "[]",
          average_daily_budget: 1,
          annual_visitors: 1,
          created_at: "2026-01-01 00:00:00",
          updated_at: "2026-01-01 00:00:00",
        })
        .execute(),
    ).rejects.toThrow();
  });

  it("searches name, country, region and activities case-insensitively", async () => {
    await createDestination({
      name: "Kyoto",
      country: "Japan",
      region: "Asia",
      activities: ["Cultural Tours"],
    });
    await createDestination({
      name: "Cusco",
      country: "Peru",
      region: "South America",
      activities: ["Hiking & Trekking"],
    });
    await createDestination({
      name: "Banff",
      country: "Canada",
      region: "North America",
      activities: ["Skiing & Snowboarding"],
    });

    expect(await names({ search: "kyo" })).toEqual(["Kyoto"]);
    expect(await names({ search: "PERU" })).toEqual(["Cusco"]);
    expect(await names({ search: "america" })).toEqual(["Banff", "Cusco"]);
    expect(await names({ search: "trekking" })).toEqual(["Cusco"]);
    expect(await names({ search: "   " })).toHaveLength(3);
  });

  it("treats LIKE wildcards and the escape character in the term literally", async () => {
    await createDestination({ name: "Kyoto" });
    await createDestination({ name: "100% Beach" });
    await createDestination({ name: "Wow! Falls" });

    expect(await names({ search: "%" })).toEqual(["100% Beach"]);
    expect(await names({ search: "_" })).toEqual([]);
    // `!` is the escape character, so it has to be escaped with itself.
    expect(await names({ search: "!" })).toEqual(["Wow! Falls"]);
    expect(await names({ search: "w! f" })).toEqual(["Wow! Falls"]);
  });

  it("filters by region, cost level and activity", async () => {
    await createDestination({
      name: "Bali",
      region: "Asia",
      costLevel: "Budget",
      activities: ["Surfing", "Yoga"],
    });
    await createDestination({
      name: "Kyoto",
      region: "Asia",
      costLevel: "Moderate",
      activities: ["Cultural Tours"],
    });
    await createDestination({
      name: "Peniche",
      region: "Europe",
      costLevel: "Budget",
      activities: ["Surfing"],
    });

    expect(await names({ region: "Asia" })).toEqual(["Bali", "Kyoto"]);
    expect(await names({ costLevel: "Budget" })).toEqual(["Bali", "Peniche"]);
    expect(await names({ activity: "Surfing" })).toEqual(["Bali", "Peniche"]);
    expect(await names({ region: "Asia", activity: "Surfing" })).toEqual(["Bali"]);
    expect(await names({ activity: "Surf" })).toEqual([]);
  });

  it("sorts cost level by price tier, not alphabetically", async () => {
    for (const level of ["Luxury", "Budget", "Premium", "Moderate"] as const) {
      await createDestination({ name: `${level} place`, costLevel: level });
    }

    expect(await names({ sort: "cost_level" })).toEqual([
      "Budget place",
      "Moderate place",
      "Premium place",
      "Luxury place",
    ]);
    expect(await names({ sort: "cost_level", direction: "desc" })).toEqual([
      "Luxury place",
      "Premium place",
      "Moderate place",
      "Budget place",
    ]);
  });

  it("sorts numeric columns numerically with name as a stable tie-breaker", async () => {
    await createDestination({ name: "B", annualVisitors: 2_000_000 });
    await createDestination({ name: "C", annualVisitors: 10_000_000 });
    await createDestination({ name: "A", annualVisitors: 2_000_000 });

    expect(await names({ sort: "annual_visitors" })).toEqual(["A", "B", "C"]);
    expect(await names({ sort: "annual_visitors", direction: "desc" })).toEqual(["C", "A", "B"]);
  });

  it("paginates and clamps the page to the last page", async () => {
    for (let index = 0; index < 5; index += 1) {
      await createDestination({ name: `Place ${index}` });
    }

    const page = await listDestinations(query({ perPage: 2, page: 2 }));

    expect(page.data.map((destination) => destination.name)).toEqual(["Place 2", "Place 3"]);
    expect(page).toMatchObject({ total: 5, page: 2, lastPage: 3, from: 3, to: 4 });

    const beyond = await listDestinations(query({ perPage: 2, page: 99 }));
    expect(beyond.page).toBe(3);
    expect(beyond.data).toHaveLength(1);

    const empty = await listDestinations(query({ search: "nowhere" }));
    expect(empty).toMatchObject({ total: 0, from: null, to: null, lastPage: 1 });
  });

  it("lists the distinct regions in alphabetical order", async () => {
    await createDestination({ region: "Oceania" });
    await createDestination({ region: "Africa" });
    await createDestination({ region: "Africa" });

    expect(await listRegions()).toEqual(["Africa", "Oceania"]);
  });

  it("upserts by name and country", async () => {
    const attributes: DestinationAttributes = {
      name: "Kyoto",
      country: "Japan",
      region: "Asia",
      costLevel: "Moderate",
      activities: ["Cultural Tours"],
      averageDailyBudget: 180,
      annualVisitors: 5_300_000,
    };

    const first = await upsertDestination(attributes);
    const second = await upsertDestination({ ...attributes, averageDailyBudget: 999 });

    expect(second.id).toBe(first.id);
    expect(second.averageDailyBudget).toBe(999);
  });
});
