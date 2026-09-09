import { db } from "@/db/client";
import { upsertDestination } from "@/destinations/repository";
import type { Destination } from "@/domain/destination";
import { catalogue } from "./catalogue";

/**
 * Loads the destination catalogue. Idempotent: rows are matched on name + country
 * (the table's unique key) and updated in place, so it can run repeatedly
 * (locally, in CI, from the API) without truncating the table or creating
 * duplicates. Returns the resulting rows, in catalogue order.
 */
export async function seedDestinations(): Promise<Destination[]> {
  return db()
    .transaction()
    .execute(async (trx) => {
      const seeded: Destination[] = [];

      for (const attributes of catalogue) {
        seeded.push(await upsertDestination(attributes, trx));
      }

      return seeded;
    });
}
