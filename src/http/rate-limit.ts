import { config } from "@/config";
import { errorResponse, HttpError } from "./responses";

/**
 * Fixed-window rate limiter with the conventional X-RateLimit-* headers.
 *
 * The store is an in-process Map, which is exactly right for one Node process
 * and deliberately simple; a horizontally scaled deployment should back this
 * with a shared store (Redis) — the interface would not change.
 */
export interface RateLimit {
  name: string;
  maxAttempts: number;
  windowSeconds: number;
}

export const API_LIMIT: RateLimit = { name: "api", maxAttempts: 60, windowSeconds: 60 };
export const SEED_LIMIT: RateLimit = { name: "seed", maxAttempts: 5, windowSeconds: 60 };

interface Window {
  count: number;
  resetAt: number;
}

/** Expired windows are swept once the store grows past this many keys. */
const SWEEP_THRESHOLD = 10_000;

const windows = new Map<string, Window>();

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Consume one attempt for `key`. Returns the remaining budget, or throws a 429
 * HttpError (already carrying the limit headers) when the window is exhausted.
 */
export function hit(limit: RateLimit, key: string, now: number = Date.now()): RateLimitResult {
  const storeKey = `${limit.name}:${key}`;
  let window = windows.get(storeKey);

  if (window === undefined || window.resetAt <= now) {
    if (windows.size >= SWEEP_THRESHOLD) {
      sweep(now);
    }

    window = { count: 0, resetAt: now + limit.windowSeconds * 1000 };
    windows.set(storeKey, window);
  }

  if (window.count >= limit.maxAttempts) {
    const retryAfter = Math.max(1, Math.ceil((window.resetAt - now) / 1000));

    throw new HttpError(
      errorResponse(429, "Too Many Attempts.", {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit.maxAttempts),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetHeader(window.resetAt),
      }),
    );
  }

  window.count += 1;

  return {
    limit: limit.maxAttempts,
    remaining: limit.maxAttempts - window.count,
    resetAt: window.resetAt,
  };
}

/**
 * Add the headers of the most restrictive limit that applied to the request.
 * A response that already carries limit headers (a 429 from `hit`) is left alone.
 */
export function withRateLimitHeaders(response: Response, results: RateLimitResult[]): Response {
  if (response.headers.has("X-RateLimit-Limit")) {
    return response;
  }

  const tightest = results.reduce<RateLimitResult | undefined>(
    (current, result) =>
      current === undefined || result.remaining < current.remaining ? result : current,
    undefined,
  );

  if (tightest !== undefined) {
    response.headers.set("X-RateLimit-Limit", String(tightest.limit));
    response.headers.set("X-RateLimit-Remaining", String(tightest.remaining));
    response.headers.set("X-RateLimit-Reset", resetHeader(tightest.resetAt));
  }

  return response;
}

/** The conventional X-RateLimit-Reset value: when the window ends, in epoch seconds. */
function resetHeader(resetAt: number): string {
  return String(Math.ceil(resetAt / 1000));
}

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
}

/** Test hook. */
export function resetRateLimits(): void {
  windows.clear();
}

/**
 * The client address as reported by the trusted reverse proxies in front of the
 * app. With TRUSTED_PROXY_HOPS=1 the last entry of X-Forwarded-For is the address
 * the proxy saw; entries before it are client-supplied and cannot be trusted. With
 * 0 hops the header is ignored entirely.
 */
export function clientIp(request: Request, hops: number = config().TRUSTED_PROXY_HOPS): string {
  if (hops > 0) {
    const forwarded = (request.headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");

    const trusted = forwarded[forwarded.length - hops];

    if (trusted) {
      return trusted;
    }
  }

  return "unknown";
}
