/**
 * Abilities that can be granted to a personal access token. Tokens carry the
 * least privilege they need: a client that only reads the catalogue needs no
 * token at all, and a client that reseeds it needs exactly this one ability.
 */
export const TOKEN_ABILITIES = {
  "destinations:seed": "Load or refresh the destination catalogue from the seed data.",
} as const;

export type TokenAbility = keyof typeof TOKEN_ABILITIES;

export function isTokenAbility(value: unknown): value is TokenAbility {
  return typeof value === "string" && Object.hasOwn(TOKEN_ABILITIES, value);
}
