/**
 * Small helpers so every API response — success or failure — has the same shape
 * and the same JSON content type, regardless of what the client sent in Accept.
 *
 * Next.js sends dynamic route-handler responses without a Cache-Control header of
 * their own, so `no-store` is set here: the listing is request-specific and the
 * rate-limit headers and 429 bodies must never be served from a shared cache.
 */
export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorResponse(status: number, message: string, headers?: HeadersInit): Response {
  return json({ message }, { status, headers });
}

export function notFound(): Response {
  return errorResponse(404, "Resource not found.");
}

export function unauthenticated(): Response {
  return errorResponse(401, "Unauthenticated.", { "WWW-Authenticate": "Bearer" });
}

export function forbidden(message = "This action is unauthorized."): Response {
  return errorResponse(403, message);
}

/** Laravel-style validation error body: a summary message plus per-field errors. */
export function validationError(errors: Record<string, string[]>): Response {
  const first = Object.values(errors)[0]?.[0] ?? "The given data was invalid.";

  return json({ message: first, errors }, { status: 422 });
}

/**
 * An exception that carries its own HTTP response; route handlers convert it with
 * `handleErrors()` so guards and validators can simply throw.
 */
export class HttpError extends Error {
  constructor(public readonly response: Response) {
    super(`HTTP ${response.status}`);
  }
}

export async function handleErrors(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpError) {
      return error.response;
    }

    console.error(error);

    return errorResponse(500, "Server Error");
  }
}
