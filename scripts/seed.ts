import "./env";
import { config } from "@/config";
import { closeDb, db } from "@/db/client";
import { seedDestinations } from "@/db/seed/destination-seeder";
import { toDbTimestamp } from "@/db/timestamps";

/**
 * Seeds the destination catalogue (idempotent), plus — outside production — a
 * local account to issue API tokens against (`npm run api:token -- --email=admin@example.com ...`).
 * There is no password login, so the token is the only intended way in.
 */
async function main(): Promise<void> {
  const seeded = await seedDestinations();
  console.log(`DONE  destinations (${seeded.length} rows upserted)`);

  if (config().APP_ENV !== "production") {
    const existing = await db()
      .selectFrom("users")
      .select("id")
      .where("email", "=", "admin@example.com")
      .executeTakeFirst();

    if (!existing) {
      const now = toDbTimestamp();
      await db()
        .insertInto("users")
        .values({
          name: "Local Admin",
          email: "admin@example.com",
          created_at: now,
          updated_at: now,
        })
        .execute();
      console.log("DONE  local admin user (admin@example.com)");
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
