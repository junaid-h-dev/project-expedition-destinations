import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config, resetConfig } from "@/config";

const KEYS = ["APP_ENV", "APP_URL", "DB_CONNECTION", "TRUSTED_PROXY_HOPS"] as const;

describe("environment configuration", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      original[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }

    resetConfig();
  });

  it("applies development defaults outside production", () => {
    process.env.APP_ENV = "local";
    delete process.env.APP_URL;
    delete process.env.TRUSTED_PROXY_HOPS;
    resetConfig();

    expect(config().APP_URL).toBe("http://localhost:3000");
    expect(config().TRUSTED_PROXY_HOPS).toBe(1);
  });

  it("refuses to start in production on values that must not be inherited from a default", () => {
    process.env.APP_ENV = "production";
    delete process.env.APP_URL;
    delete process.env.DB_CONNECTION;
    delete process.env.TRUSTED_PROXY_HOPS;
    resetConfig();

    expect(() => config()).toThrow(/APP_URL/);
    expect(() => config()).toThrow(/DB_CONNECTION/);
    expect(() => config()).toThrow(/TRUSTED_PROXY_HOPS/);

    process.env.APP_URL = "https://destinations.example.com";
    process.env.DB_CONNECTION = "mysql";
    process.env.TRUSTED_PROXY_HOPS = "2";
    resetConfig();

    expect(config().APP_URL).toBe("https://destinations.example.com");
    expect(config().TRUSTED_PROXY_HOPS).toBe(2);
  });
});
