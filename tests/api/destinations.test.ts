import { describe, expect, it } from "vitest";
import { GET as index } from "@/app/api/v1/destinations/route";
import { GET as show } from "@/app/api/v1/destinations/[id]/route";
import { GET as missing } from "@/app/api/[...missing]/route";
import { apiRequest, createDestination } from "../support/factory";

const showRequest = (id: string) =>
  show(apiRequest(`/api/v1/destinations/${id}`), { params: Promise.resolve({ id }) });

describe("GET /api/v1/destinations", () => {
  it("lists destinations sorted by name with pagination metadata", async () => {
    await createDestination({ name: "Kyoto" });
    await createDestination({ name: "Bali" });
    await createDestination({ name: "Cusco" });

    const response = await index(apiRequest("/api/v1/destinations"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(body.data.map((row: { name: string }) => row.name)).toEqual(["Bali", "Cusco", "Kyoto"]);
    expect(body.meta).toMatchObject({
      total: 3,
      per_page: 15,
      current_page: 1,
      last_page: 1,
      from: 1,
      to: 3,
    });
    expect(Object.keys(body.links)).toEqual(["first", "last", "prev", "next"]);
  });

  it("serialises a destination with snake_case keys and native types", async () => {
    const destination = await createDestination({
      name: "Swiss Alps",
      country: "Switzerland",
      region: "Europe",
      costLevel: "Luxury",
      activities: ["Skiing & Snowboarding", "Hiking & Trekking"],
      averageDailyBudget: 400,
      annualVisitors: 1_200_000,
    });

    const body = await (await index(apiRequest("/api/v1/destinations"))).json();

    expect(body.data[0]).toEqual({
      id: destination.id,
      name: "Swiss Alps",
      country: "Switzerland",
      region: "Europe",
      cost_level: "Luxury",
      activities: ["Skiing & Snowboarding", "Hiking & Trekking"],
      average_daily_budget: 400,
      annual_visitors: 1_200_000,
      created_at: destination.createdAt.toISOString(),
      updated_at: destination.updatedAt.toISOString(),
    });
  });

  it("paginates and preserves the query string in links", async () => {
    for (let i = 0; i < 5; i += 1) {
      await createDestination({ name: `Place ${i}` });
    }

    const response = await index(
      apiRequest("/api/v1/destinations?per_page=2&page=2&direction=asc"),
    );
    const body = await response.json();

    expect(body.data.map((row: { name: string }) => row.name)).toEqual(["Place 2", "Place 3"]);
    expect(body.meta.last_page).toBe(3);
    expect(body.links.next).toContain("per_page=2");
    expect(body.links.next).toContain("direction=asc");
    expect(body.links.next).toContain("page=3");
    expect(body.links.prev).toContain("page=1");
  });

  it("filters by search, region, cost level and activity", async () => {
    await createDestination({
      name: "Bali",
      country: "Indonesia",
      region: "Asia",
      costLevel: "Budget",
      activities: ["Surfing"],
    });
    await createDestination({
      name: "Kyoto",
      country: "Japan",
      region: "Asia",
      costLevel: "Moderate",
      activities: ["Cultural Tours"],
    });
    await createDestination({
      name: "Peniche",
      country: "Portugal",
      region: "Europe",
      costLevel: "Budget",
      activities: ["Surfing"],
    });

    const names = async (qs: string) =>
      (await (await index(apiRequest(`/api/v1/destinations?${qs}`))).json()).data.map(
        (row: { name: string }) => row.name,
      );

    expect(await names("search=japan")).toEqual(["Kyoto"]);
    expect(await names("region=Asia")).toEqual(["Bali", "Kyoto"]);
    expect(await names("cost_level=Budget")).toEqual(["Bali", "Peniche"]);
    expect(await names("activity=Surfing&region=Europe")).toEqual(["Peniche"]);
    expect(await names("search=nowhere")).toEqual([]);
  });

  it("sorts by any allow-listed column in either direction", async () => {
    await createDestination({ name: "A", annualVisitors: 100 });
    await createDestination({ name: "B", annualVisitors: 300 });
    await createDestination({ name: "C", annualVisitors: 200 });

    const names = async (qs: string) =>
      (await (await index(apiRequest(`/api/v1/destinations?${qs}`))).json()).data.map(
        (row: { name: string }) => row.name,
      );

    expect(await names("sort=annual_visitors&direction=desc")).toEqual(["B", "C", "A"]);
    expect(await names("sort=name&direction=desc")).toEqual(["C", "B", "A"]);
  });

  it("rejects invalid parameters with a JSON 422 listing each field", async () => {
    const response = await index(
      apiRequest(
        "/api/v1/destinations?sort=password&direction=sideways&cost_level=Free&per_page=1000&page=0",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(Object.keys(body.errors).sort()).toEqual([
      "cost_level",
      "direction",
      "page",
      "per_page",
      "sort",
    ]);
    expect(typeof body.message).toBe("string");
    // A rejected request still consumed an attempt, so it still reports the budget.
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
  });

  it("advertises the API rate limit and keeps responses out of shared caches", async () => {
    const response = await index(apiRequest("/api/v1/destinations"));

    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
    expect(response.headers.get("X-RateLimit-Reset")).toMatch(/^\d+$/);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 429 once the limit is exhausted, per client", async () => {
    for (let i = 0; i < 60; i += 1) {
      expect((await index(apiRequest("/api/v1/destinations", { ip: "10.0.0.1" }))).status).toBe(
        200,
      );
    }

    const blocked = await index(apiRequest("/api/v1/destinations", { ip: "10.0.0.1" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toMatch(/^\d+$/);

    expect((await index(apiRequest("/api/v1/destinations", { ip: "10.0.0.2" }))).status).toBe(200);
  });
});

describe("GET /api/v1/destinations/{id}", () => {
  it("returns a single destination", async () => {
    const destination = await createDestination({ name: "Marrakech" });

    const response = await showRequest(String(destination.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ id: destination.id, name: "Marrakech" });
  });

  it("returns a generic JSON 404 for unknown or non-numeric identifiers", async () => {
    for (const id of ["999", "kyoto"]) {
      const response = await showRequest(id);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Resource not found." });
    }
  });
});

describe("unknown API routes", () => {
  it("answer with the same JSON 404", async () => {
    const response = await missing(apiRequest("/api/v1/nope"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ message: "Resource not found." });
  });
});
