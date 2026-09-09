import { isProduction } from "@/config";
import type { TokenAbility } from "@/domain/token-ability";
import { forbidden, HttpError, notFound, unauthenticated } from "@/http/responses";
import { type AccessToken, bearerToken, resolveToken, type TokenUser } from "./tokens";

export interface Principal {
  user: TokenUser;
  token: AccessToken;
}

/** The token holder if a valid bearer token was sent, otherwise null (anonymous). */
export async function resolvePrincipal(request: Request): Promise<Principal | null> {
  return resolveToken(bearerToken(request));
}

/**
 * Require a valid token carrying every listed ability: 401 without one, 403
 * without the ability. Works on the principal the API pipeline already resolved,
 * so the token is looked up once per request.
 */
export function authorize(principal: Principal | null, abilities: TokenAbility[]): Principal {
  if (principal === null) {
    throw new HttpError(unauthenticated());
  }

  const missing = abilities.filter((ability) => !principal.token.abilities.includes(ability));

  if (missing.length > 0) {
    throw new HttpError(forbidden("Invalid ability provided."));
  }

  return principal;
}

/**
 * Hide development-only endpoints in production. A 404 rather than a 403 avoids
 * advertising that the route exists at all, so this runs before authentication.
 */
export function ensureNotProduction(): void {
  if (isProduction()) {
    throw new HttpError(notFound());
  }
}
