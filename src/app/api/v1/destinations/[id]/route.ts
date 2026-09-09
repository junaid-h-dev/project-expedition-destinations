import { findDestination } from "@/destinations/repository";
import { toResource } from "@/destinations/serialize";
import { apiHandler } from "@/http/api";
import { HttpError, json, notFound } from "@/http/responses";

/** GET /api/v1/destinations/{id} — a single destination; numeric ids only. */
export const GET = apiHandler<RouteContext<"/api/v1/destinations/[id]">>(async (_ctx, route) => {
  const { id } = await route.params;

  if (!/^\d+$/.test(id)) {
    throw new HttpError(notFound());
  }

  const destination = await findDestination(Number(id));

  if (destination === null) {
    throw new HttpError(notFound());
  }

  return json({ data: toResource(destination) });
});
