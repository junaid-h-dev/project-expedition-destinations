import { describe, expect, it } from "vitest";
import { POST as seed } from "@/app/api/v1/destinations/seed/route";
import { resetConfig } from "@/config";
import { catalogue } from "@/db/seed/catalogue";
import { listDestinations } from "@/destinations/repository";
import { apiRequest, createDestination, createToken } from "../support/factory";

const count = async () =>
  (await listDestinations({ sort: "name", direction: "asc", page: 1, perPage: 1 })).total;

const post = (token?: string, headers: HeadersInit = {}) =>
  seed(apiRequest("/api/v1/destinations/seed", { method: "POST", token, headers }));

describe("POST /api/v1/destinations/seed", () => {
  it("requires authentication and answers JSON regardless of the Accept header", async () => {
    const response = await post(undefined, { Accept: "text/html" });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
    expect(await response.json()).toEqual({ message: "Unauthenticated." });
    expect(await count()).toBe(0);
  });

  it("rejects unknown and expired tokens", async () => {
    expect((await post("pe_not-a-real-token")).status).toBe(401);

    const expired = await createToken(["destinations:seed"], new Date(Date.now() - 60_000));
    expect((await post(expired)).status).toBe(401);
    expect(await count()).toBe(0);
  });

  it("rejects tokens without the seed ability", async () => {
    const token = await createToken([]);

    const response = await post(token);

    expect(response.status).toBe(403);
    expect(await count()).toBe(0);
  });

  it("loads the catalogue for a token with the seed ability", async () => {
    const token = await createToken(["destinations:seed"]);

    const response = await post(token);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(catalogue.length);
    expect(body.meta).toEqual({ seeded: catalogue.length });
    expect(body.data[0].name).toBe("Bali");
    expect(await count()).toBe(catalogue.length);
  });

  it("is idempotent and only returns catalogue rows", async () => {
    const token = await createToken(["destinations:seed"]);
    await createDestination({ name: "Custom Place", country: "Nowhere" });

    await post(token);
    const body = await (await post(token)).json();

    expect(body.data).toHaveLength(catalogue.length);
    expect(body.data.some((row: { name: string }) => row.name === "Custom Place")).toBe(false);
    expect(await count()).toBe(catalogue.length + 1);
  });

  it("does not exist in production, whether or not a token is sent", async () => {
    process.env.APP_ENV = "production";
    resetConfig();

    try {
      const anonymous = await post();
      expect(anonymous.status).toBe(404);
      expect(await anonymous.json()).toEqual({ message: "Resource not found." });

      const token = await createToken(["destinations:seed"]);
      expect((await post(token)).status).toBe(404);
      expect(await count()).toBe(0);
    } finally {
      process.env.APP_ENV = "testing";
      resetConfig();
    }
  });

  it("is tightly rate limited per token holder", async () => {
    const token = await createToken(["destinations:seed"]);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await post(token);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe(String(5 - attempt));
    }

    const blocked = await post(token);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("Retry-After")).toMatch(/^\d+$/);

    // Another token holder has their own budget.
    const other = await createToken(["destinations:seed"]);
    expect((await post(other)).status).toBe(200);
  });
});
