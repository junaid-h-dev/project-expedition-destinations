import type { ZodError } from "zod";
import { ensureNotProduction } from "@/auth/guard";
import { API_LIMIT, clientIp, hit, type RateLimitResult, withRateLimitHeaders } from "./rate-limit";
import { handleErrors, HttpError, validationError } from "./responses";

export interface ApiContext {
  request: Request;
  url: URL;
  /** Rate limits consumed so far; their headers are added to the response. */
  limits: RateLimitResult[];
  /** Throttle key: the client address reported by the trusted proxy. */
  limitKey: string;
}

export interface ApiHandlerOptions {
  /** Answer 404 in production before doing anything else (development-only endpoints). */
  notInProduction?: boolean;
}

/**
 * Wraps a route handler with the behaviour every `/api/*` endpoint shares: the
 * environment guard when requested, the 60-per-minute limit, JSON error responses,
 * and rate-limit headers on the way out.
 */
export function apiHandler<TContext = unknown>(
  run: (ctx: ApiContext, routeContext: TContext) => Promise<Response>,
  options: ApiHandlerOptions = {},
) {
  return (request: Request, routeContext?: TContext): Promise<Response> =>
    handleErrors(async () => {
      if (options.notInProduction) {
        ensureNotProduction();
      }

      const ctx: ApiContext = {
        request,
        url: new URL(request.url),
        limits: [],
        limitKey: `ip:${clientIp(request)}`,
      };

      try {
        ctx.limits.push(hit(API_LIMIT, ctx.limitKey));
        const response = await run(ctx, routeContext as TContext);

        return withRateLimitHeaders(response, ctx.limits);
      } catch (error) {
        if (error instanceof HttpError) {
          throw new HttpError(withRateLimitHeaders(error.response, ctx.limits));
        }

        throw error;
      }
    });
}

/** Turn a Zod failure into the API's 422 shape (`{ message, errors: { field: [...] } }`). */
export function zodValidationError(error: ZodError): HttpError {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".") || "_";
    (errors[field] ??= []).push(issue.message);
  }

  return new HttpError(validationError(errors));
}

/** Query string as a plain object (repeated keys keep the first value). */
export function queryObject(url: URL): Record<string, string> {
  const result: Record<string, string> = Object.create(null);

  for (const [key, value] of url.searchParams) {
    if (!Object.hasOwn(result, key)) {
      result[key] = value;
    }
  }

  return result;
}
