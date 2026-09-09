import { describe, expect, it } from "vitest";
import { API_LIMIT, clientIp, hit, withRateLimitHeaders } from "@/http/rate-limit";
import { HttpError, json } from "@/http/responses";

const limit = { name: "test", maxAttempts: 2, windowSeconds: 60 };

describe("rate limiter", () => {
  it("counts attempts per key and resets when the window expires", () => {
    const start = 1_000_000;

    expect(hit(limit, "a", start).remaining).toBe(1);
    expect(hit(limit, "a", start).remaining).toBe(0);
    expect(() => hit(limit, "a", start + 30_000)).toThrow(HttpError);
    expect(hit(limit, "b", start).remaining).toBe(1); // other key, own budget

    // A new window opens once the old one has elapsed.
    expect(hit(limit, "a", start + 60_000).remaining).toBe(1);
  });

  it("carries the limit headers and a Retry-After on the 429", () => {
    const start = 2_000_000;
    hit(limit, "c", start);
    hit(limit, "c", start);

    let response: Response | undefined;
    try {
      hit(limit, "c", start + 15_000);
    } catch (error) {
      response = error instanceof HttpError ? error.response : undefined;
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("45");
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("reports the tightest of several limits and never overwrites a 429's headers", () => {
    const loose = { limit: 60, remaining: 59, resetAt: 0 };
    const tight = { limit: 5, remaining: 2, resetAt: 0 };

    const ok = withRateLimitHeaders(json({}), [loose, tight]);
    expect(ok.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(ok.headers.get("X-RateLimit-Remaining")).toBe("2");

    const blocked = json(
      {},
      { status: 429, headers: { "X-RateLimit-Limit": "5", "X-RateLimit-Remaining": "0" } },
    );
    withRateLimitHeaders(blocked, [loose]);
    expect(blocked.headers.get("X-RateLimit-Limit")).toBe("5");
  });

  it("uses the API limit of 60 per minute", () => {
    expect(API_LIMIT).toEqual({ name: "api", maxAttempts: 60, windowSeconds: 60 });
  });
});

describe("clientIp", () => {
  const request = (forwardedFor?: string) =>
    new Request("http://localhost/api", {
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    });

  it("trusts only the entry appended by the configured number of proxies", () => {
    expect(clientIp(request("203.0.113.9"), 1)).toBe("203.0.113.9");
    // The client-supplied entries before the proxy's own are ignored.
    expect(clientIp(request("1.2.3.4, 203.0.113.9"), 1)).toBe("203.0.113.9");
    expect(clientIp(request("1.2.3.4, 203.0.113.9, 10.0.0.2"), 2)).toBe("203.0.113.9");
  });

  it("ignores the header entirely when no proxy is trusted or the header is missing", () => {
    expect(clientIp(request("1.2.3.4"), 0)).toBe("unknown");
    expect(clientIp(request(), 1)).toBe("unknown");
  });
});
