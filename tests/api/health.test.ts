import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    vi.doUnmock("@/db/client");
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("reports ok while the database answers", async () => {
    const response = await health();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("answers 503 when the database does not, logging the reason rather than returning it", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("@/db/client", () => ({
      db: () => {
        throw new Error("connect ECONNREFUSED 127.0.0.1:3306");
      },
    }));
    vi.resetModules();

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "Database unavailable." });
    expect(logged).toHaveBeenCalled();
  });
});
