import { seedDestinations } from "@/db/seed/destination-seeder";
import { toResource } from "@/destinations/serialize";
import { apiHandler } from "@/http/api";
import { hit, SEED_LIMIT } from "@/http/rate-limit";
import { json } from "@/http/responses";

/**
 * POST /api/v1/destinations/seed — load or refresh the seed catalogue.
 *
 * The endpoint answers 404 in production, so it is invisible there, and is held to
 * a tight per-minute throttle everywhere else. The seeder upserts inside a
 * transaction, so the call is idempotent and never truncates; rows outside the
 * catalogue are left alone. Access control follows in Section 4.
 */
export const POST = apiHandler(
  async (ctx) => {
    ctx.limits.push(hit(SEED_LIMIT, ctx.limitKey));

    const seeded = await seedDestinations();
    const data = seeded
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toResource);

    return json({ data, meta: { seeded: seeded.length } });
  },
  { notInProduction: true },
);
