import { db } from "@/db/client";
import { isTokenAbility, TOKEN_ABILITIES, type TokenAbility } from "@/domain/token-ability";
import { issueToken, maxTokenLifetimeDays } from "./tokens";

/**
 * `npm run api:token -- --email=… --ability=…`: issue a personal access token for
 * an existing user. Users are created by the seeder, so outside development this
 * expects the account to exist already.
 */

export interface IssueTokenOptions {
  email: string;
  name: string;
  abilities: string[];
  expiresInDays: number;
}

export interface IssueTokenOutcome {
  ok: boolean;
  lines: string[];
  plainText?: string;
}

/**
 * The logic behind `npm run api:token`, kept free of process/console concerns so
 * it can be tested directly. Arguments are validated before the database is
 * touched, so a typo costs nothing.
 */
export async function issueTokenCommand(
  options: IssueTokenOptions,
  now: Date = new Date(),
): Promise<IssueTokenOutcome> {
  if (options.abilities.length === 0) {
    return {
      ok: false,
      lines: [
        "Specify at least one --ability; tokens are issued with the least privilege they need.",
        ...abilityList(),
      ],
    };
  }

  const unknown = options.abilities.filter((ability) => !isTokenAbility(ability));

  if (unknown.length > 0) {
    return { ok: false, lines: [`Unknown abilities: ${unknown.join(", ")}.`, ...abilityList()] };
  }

  const maxDays = maxTokenLifetimeDays();

  if (
    !Number.isInteger(options.expiresInDays) ||
    options.expiresInDays < 1 ||
    options.expiresInDays > maxDays
  ) {
    return {
      ok: false,
      lines: [
        `--expires-in-days must be between 1 and ${maxDays} (the TOKEN_EXPIRATION_MINUTES cap).`,
      ],
    };
  }

  const user = await db()
    .selectFrom("users")
    .select(["id", "email"])
    .where("email", "=", options.email)
    .executeTakeFirst();

  if (!user) {
    return { ok: false, lines: [`No user found with email [${options.email}].`] };
  }

  // The guard above narrows each entry; the Set drops a repeated --ability.
  const abilities: TokenAbility[] = [...new Set(options.abilities.filter(isTokenAbility))];
  const expiresAt = new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000);
  const issued = await issueToken(Number(user.id), options.name, abilities, expiresAt);

  return {
    ok: true,
    plainText: issued.plainText,
    lines: [
      `Token issued to ${user.email}, valid for ${options.expiresInDays} days with abilities: ${abilities.join(", ")}.`,
      "",
      issued.plainText,
      "",
      "This is the only time the token is shown. Store it securely.",
    ],
  };
}

function abilityList(): string[] {
  return Object.entries(TOKEN_ABILITIES).map(
    ([ability, description]) => `  ${ability}  ${description}`,
  );
}
