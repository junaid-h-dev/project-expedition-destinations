import { isProduction } from "@/config";
import { HttpError, notFound } from "@/http/responses";

/**
 * Hide development-only endpoints in production. A 404 rather than a 403 avoids
 * advertising that the route exists at all, so this runs before authentication.
 */
export function ensureNotProduction(): void {
  if (isProduction()) {
    throw new HttpError(notFound());
  }
}
