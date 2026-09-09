import { describe, expect, it } from "vitest";
import { issueTokenCommand } from "@/auth/issue-token-command";
import { hashToken, issueToken, pruneExpiredTokens, resolveToken } from "@/auth/tokens";
import { resetConfig } from "@/config";
import { db } from "@/db/client";
import { fromJsonColumn, toDate } from "@/db/timestamps";
import { createUser } from "../support/factory";

describe("personal access tokens", () => {
  it("are stored hashed, resolve to their owner and abilities, and expire", async () => {
    const user = await createUser("ops@example.com");
    const inAnHour = new Date(Date.now() + 60 * 60 * 1000);

    const issued = await issueToken(user.id, "ci", ["destinations:seed"], inAnHour);

    expect(issued.plainText.startsWith("pe_")).toBe(true);

    const stored = await db()
      .selectFrom("personal_access_tokens")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(stored.token_hash).toBe(hashToken(issued.plainText));
    expect(stored.token_hash).not.toContain(issued.plainText);

    const resolved = await resolveToken(issued.plainText);
    expect(resolved?.user).toMatchObject({ id: user.id, email: "ops@example.com" });
    expect(resolved?.token.abilities).toEqual(["destinations:seed"]);

    expect(await resolveToken(issued.plainText, new Date(inAnHour.getTime() + 1))).toBeNull();
    expect(await resolveToken("pe_unknown")).toBeNull();
    expect(await resolveToken(null)).toBeNull();
  });

  it("are pruned once they have been expired for a day", async () => {
    const user = await createUser();
    const now = new Date();
    await issueToken(
      user.id,
      "old",
      ["destinations:seed"],
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    );
    await issueToken(
      user.id,
      "recent",
      ["destinations:seed"],
      new Date(now.getTime() - 60 * 60 * 1000),
    );
    await issueToken(
      user.id,
      "live",
      ["destinations:seed"],
      new Date(now.getTime() + 60 * 60 * 1000),
    );

    expect(await pruneExpiredTokens(24, now)).toBe(1);

    const remaining = await db()
      .selectFrom("personal_access_tokens")
      .select("name")
      .orderBy("name")
      .execute();
    expect(remaining.map((row) => row.name)).toEqual(["live", "recent"]);
  });
});

describe("api:token command", () => {
  it("issues a token with the requested abilities and expiry", async () => {
    await createUser("ops@example.com");

    const outcome = await issueTokenCommand({
      email: "ops@example.com",
      name: "ci",
      abilities: ["destinations:seed"],
      expiresInDays: 7,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.lines[0]).toContain("Token issued to ops@example.com");
    expect(outcome.plainText?.startsWith("pe_")).toBe(true);

    const stored = await db()
      .selectFrom("personal_access_tokens")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(stored.name).toBe("ci");
    expect(fromJsonColumn(stored.abilities)).toEqual(["destinations:seed"]);
    const expiresAt = toDate(stored.expires_at);
    expect(Math.round((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))).toBe(7);
  });

  it("requires at least one ability and refuses unknown users and abilities", async () => {
    const user = await createUser();

    const none = await issueTokenCommand({
      email: user.email,
      name: "cli",
      abilities: [],
      expiresInDays: 30,
    });
    expect(none.ok).toBe(false);
    expect(none.lines.join("\n")).toContain("Specify at least one --ability");
    expect(none.lines.join("\n")).toContain("destinations:seed");

    const nobody = await issueTokenCommand({
      email: "nobody@example.com",
      name: "cli",
      abilities: ["destinations:seed"],
      expiresInDays: 30,
    });
    expect(nobody.ok).toBe(false);
    expect(nobody.lines[0]).toContain("No user found");

    const unknown = await issueTokenCommand({
      email: user.email,
      name: "cli",
      abilities: ["users:delete"],
      expiresInDays: 30,
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.lines[0]).toContain("Unknown abilities: users:delete");

    expect(await db().selectFrom("personal_access_tokens").select("id").execute()).toHaveLength(0);
  });

  it("refuses an expiry beyond the configured cap", async () => {
    process.env.TOKEN_EXPIRATION_MINUTES = String(60 * 24 * 10);
    resetConfig();

    try {
      const user = await createUser();

      const tooLong = await issueTokenCommand({
        email: user.email,
        name: "cli",
        abilities: ["destinations:seed"],
        expiresInDays: 11,
      });
      expect(tooLong.ok).toBe(false);
      expect(tooLong.lines[0]).toContain("between 1 and 10");

      const justRight = await issueTokenCommand({
        email: user.email,
        name: "cli",
        abilities: ["destinations:seed"],
        expiresInDays: 10,
      });
      expect(justRight.ok).toBe(true);
    } finally {
      process.env.TOKEN_EXPIRATION_MINUTES = String(60 * 24 * 90);
      resetConfig();
    }
  });
});
