import { createHash, randomBytes } from "node:crypto";
import { config } from "@/config";
import { db } from "@/db/client";
import { fromJsonColumn, toDate, toDbTimestamp } from "@/db/timestamps";
import { isTokenAbility, type TokenAbility } from "@/domain/token-ability";

/**
 * Personal access tokens, modelled on Laravel Sanctum: a random secret shown once,
 * stored as a SHA-256 hash, with a set of abilities and an expiry. The prefix
 * (`pe_` by default) lets secret scanners recognise a leaked token.
 */
export interface AccessToken {
  id: number;
  userId: number;
  name: string;
  abilities: TokenAbility[];
  expiresAt: Date;
  lastUsedAt: Date | null;
}

export interface TokenUser {
  id: number;
  name: string;
  email: string;
}

export interface IssuedToken {
  plainText: string;
  token: AccessToken;
}

/** 30 random bytes, which base64url encodes to exactly this many characters. */
const TOKEN_BODY = /^[A-Za-z0-9_-]{40}$/;

export function hashToken(plainText: string): string {
  return createHash("sha256").update(plainText).digest("hex");
}

/**
 * Whether a string could be one of our tokens at all. Checked before the database
 * is queried so that junk credentials — a stray cookie, a scanner walking the
 * endpoint — cost nothing: the token lookup happens before rate limiting, because
 * the limit is keyed by whoever the token belongs to.
 *
 * This ties a token to the prefix it was issued under: changing TOKEN_PREFIX
 * retires the tokens issued before it, so rotate it only when re-issuing them.
 */
function looksLikeToken(plainText: string): boolean {
  const prefix = config().TOKEN_PREFIX;

  return plainText.startsWith(prefix) && TOKEN_BODY.test(plainText.slice(prefix.length));
}

export function maxTokenLifetimeDays(): number {
  return Math.max(1, Math.floor(config().TOKEN_EXPIRATION_MINUTES / (60 * 24)));
}

export async function issueToken(
  userId: number,
  name: string,
  abilities: TokenAbility[],
  expiresAt: Date,
): Promise<IssuedToken> {
  const plainText = `${config().TOKEN_PREFIX}${randomBytes(30).toString("base64url")}`;

  const inserted = await db()
    .insertInto("personal_access_tokens")
    .values({
      user_id: userId,
      name,
      token_hash: hashToken(plainText),
      abilities: JSON.stringify(abilities),
      last_used_at: null,
      expires_at: toDbTimestamp(expiresAt),
      created_at: toDbTimestamp(),
    })
    .executeTakeFirstOrThrow();

  return {
    plainText,
    token: {
      id: Number(inserted.insertId),
      userId,
      name,
      abilities,
      expiresAt,
      lastUsedAt: null,
    },
  };
}

/**
 * Resolve a bearer token to its owner. Returns null for a missing, unknown or
 * expired token — callers decide whether that is a 401 or simply "anonymous".
 */
export async function resolveToken(
  plainText: string | null,
  now: Date = new Date(),
): Promise<{ user: TokenUser; token: AccessToken } | null> {
  if (!plainText || !looksLikeToken(plainText)) {
    return null;
  }

  const hash = hashToken(plainText);

  const row = await db()
    .selectFrom("personal_access_tokens")
    .innerJoin("users", "users.id", "personal_access_tokens.user_id")
    .select([
      "personal_access_tokens.id as token_id",
      "personal_access_tokens.name as token_name",
      "personal_access_tokens.token_hash",
      "personal_access_tokens.abilities",
      "personal_access_tokens.expires_at",
      "personal_access_tokens.last_used_at",
      "users.id as user_id",
      "users.name as user_name",
      "users.email",
    ])
    .where("personal_access_tokens.token_hash", "=", hash)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  const expiresAt = toDate(row.expires_at);

  if (expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  const abilities = fromJsonColumn(row.abilities).filter(isTokenAbility);

  // Record use without holding up the request; a failure here must not fail auth.
  void db()
    .updateTable("personal_access_tokens")
    .set({ last_used_at: toDbTimestamp(now) })
    .where("id", "=", row.token_id)
    .execute()
    .catch((error: unknown) => console.error("Could not record token use", error));

  return {
    user: { id: Number(row.user_id), name: row.user_name, email: row.email },
    token: {
      id: Number(row.token_id),
      userId: Number(row.user_id),
      name: row.token_name,
      abilities,
      expiresAt,
      lastUsedAt: row.last_used_at ? toDate(row.last_used_at) : null,
    },
  };
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);

  return match?.[1]?.trim() || null;
}

/** Delete tokens that expired more than `hours` ago. Returns the number removed. */
export async function pruneExpiredTokens(hours = 24, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const result = await db()
    .deleteFrom("personal_access_tokens")
    .where("expires_at", "<", toDbTimestamp(cutoff))
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}
