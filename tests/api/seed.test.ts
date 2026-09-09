import { describe, expect, it } from "vitest";
import { POST as seed } from "@/app/api/v1/destinations/seed/route";
import { resetConfig } from "@/config";
import { catalogue } from "@/db/seed/catalogue";
import { listDestinations } from "@/destinations/repository";
import { apiRequest, createDestination } from "../support/factory";

const count = async () =>
  (await listDestinations({ sort: "name", direction: "asc", page: 1, perPage: 1 })).total;

const post = (ip = "10.0.0.1", headers: HeadersInit = {}) =>
  seed(apiRequest("/api/v1/destinations/seed", { method: "POST", ip, headers }));

describe("POST /api/v1/destinations/seed", () => {
  it("loads the catalogue and answers JSON regardless of the Accept header", async () => {
    const response = await post("10.0.0.1", { Accept: "text/html" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(body.data).toHaveLength(catalogue.length);
    expect(body.meta).toEqual({ seeded: catalogue.length });
    expect(body.data[0].name).toBe("Bali");
    expect(await count()).toBe(catalogue.length);
  });

  it("is idempotent and only returns catalogue rows", async () => {
    await createDestination({ name: "Custom Place", country: "Nowhere" });

    await post();
    const body = await (await post()).json();

    expect(body.data).toHaveLength(catalogue.length);
    expect(body.data.some((row: { name: string }) => row.name === "Custom Place")).toBe(false);
    expect(await count()).toBe(catalogue.length + 1);
  });

  it("does not exist in production", async () => {
    process.env.APP_ENV = "production";
    resetConfig();

    try {
      const response = await post();

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: "Resource not found." });
      expect(await count()).toBe(0);
    } finally {
      process.env.APP_ENV = "testing";
      resetConfig();
    }
  });

  it("is tightly rate limited per client", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await post();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe(String(5 - attempt));
    }

    const blocked = await post();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(blocked.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(blocked.headers.get("Retry-After")).toMatch(/^\d+$/);

    // Another client has their own budget.
    expect((await post("10.0.0.2")).status).toBe(200);
  });
});
