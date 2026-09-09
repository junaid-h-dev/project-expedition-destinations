import { describe, expect, it } from "vitest";
import { hashToken, issueToken, pruneExpiredTokens, resolveToken } from "@/auth/tokens";
import { db } from "@/db/client";
import { toDate } from "@/db/timestamps";
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
