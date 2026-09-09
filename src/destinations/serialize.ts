import { config } from "@/config";
import type { CostLevel } from "@/domain/cost-level";
import type { Destination } from "@/domain/destination";
import type { Page } from "./repository";

/** The public API representation: snake_case keys, native JSON types, ISO-8601 dates. */
export interface DestinationResource {
  id: number;
  name: string;
  country: string;
  region: string;
  cost_level: CostLevel;
  activities: string[];
  average_daily_budget: number;
  annual_visitors: number;
  created_at: string;
  updated_at: string;
}

export function toResource(destination: Destination): DestinationResource {
  return {
    id: destination.id,
    name: destination.name,
    country: destination.country,
    region: destination.region,
    cost_level: destination.costLevel,
    activities: destination.activities,
    average_daily_budget: destination.averageDailyBudget,
    annual_visitors: destination.annualVisitors,
    created_at: destination.createdAt.toISOString(),
    updated_at: destination.updatedAt.toISOString(),
  };
}

/**
 * Pagination envelope: `data`, `links` and `meta`, with the active filters kept in
 * the links. Links are built on APP_URL rather than the request's origin, which
 * behind a reverse proxy would be the internal address.
 */
export function toPaginatedResource(page: Page<Destination>, requestUrl: URL) {
  const publicOrigin = new URL(config().APP_URL);

  const link = (number: number | null): string | null => {
    if (number === null) {
      return null;
    }

    const url = new URL(requestUrl.pathname + requestUrl.search, publicOrigin);
    url.searchParams.set("page", String(number));

    return url.toString();
  };

  return {
    data: page.data.map(toResource),
    links: {
      first: link(1),
      last: link(page.lastPage),
      prev: link(page.page > 1 ? page.page - 1 : null),
      next: link(page.page < page.lastPage ? page.page + 1 : null),
    },
    meta: {
      current_page: page.page,
      from: page.from,
      last_page: page.lastPage,
      per_page: page.perPage,
      to: page.to,
      total: page.total,
    },
  };
}
