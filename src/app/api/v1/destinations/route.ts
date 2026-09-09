import { listQuerySchema, toListQuery } from "@/destinations/query";
import { listDestinations } from "@/destinations/repository";
import { toPaginatedResource } from "@/destinations/serialize";
import { apiHandler, queryObject, zodValidationError } from "@/http/api";
import { json } from "@/http/responses";

/** GET /api/v1/destinations — paginated catalogue, filterable and sortable. */
export const GET = apiHandler(async ({ url }) => {
  const parsed = listQuerySchema.safeParse(queryObject(url));

  if (!parsed.success) {
    throw zodValidationError(parsed.error);
  }

  const page = await listDestinations(toListQuery(parsed.data));

  return json(toPaginatedResource(page, url));
});
