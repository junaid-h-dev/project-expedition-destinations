import "./env";
import { closeDb } from "@/db/client";
import { seedDestinations } from "@/db/seed/destination-seeder";

/** Seeds the destination catalogue. Idempotent: safe to run on every deploy. */
async function main(): Promise<void> {
  const seeded = await seedDestinations();
  console.log(`DONE  destinations (${seeded.length} rows upserted)`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
