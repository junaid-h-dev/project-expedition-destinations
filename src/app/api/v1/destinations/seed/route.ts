import { authorize } from "@/auth/guard";
import { seedDestinations } from "@/db/seed/destination-seeder";
import { toResource } from "@/destinations/serialize";
import { apiHandler } from "@/http/api";
import { hit, SEED_LIMIT } from "@/http/rate-limit";
import { json } from "@/http/responses";

/**
 * POST /api/v1/destinations/seed — load or refresh the seed catalogue.
 *
 * Guards run in this order on purpose: environment (404 before anything else, so
 * production reveals nothing — not even by looking a token up) → authentication
 * (401) → ability (403) → the tight per-minute throttle. The seeder upserts inside
 * a transaction, so the call is idempotent and never truncates; rows outside the
 * catalogue are left alone.
 */
export const POST = apiHandler(
  async (ctx) => {
    authorize(ctx.principal, ["destinations:seed"]);
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
