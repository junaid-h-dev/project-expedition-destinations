/**
 * The columns a destination listing may be sorted by. Acting as an allow-list, it
 * keeps user-supplied sort keys (API query string, page URL) away from `orderBy`;
 * the value doubles as the public parameter name.
 */
export const DESTINATION_SORTS = [
  "name",
  "country",
  "region",
  "cost_level",
  "average_daily_budget",
  "annual_visitors",
] as const;

export type DestinationSort = (typeof DESTINATION_SORTS)[number];

export const DEFAULT_SORT: DestinationSort = "name";

export function isDestinationSort(value: unknown): value is DestinationSort {
  return typeof value === "string" && (DESTINATION_SORTS as readonly string[]).includes(value);
}

export const SORT_LABELS: Record<DestinationSort, string> = {
  name: "Name",
  country: "Country",
  region: "Region",
  cost_level: "Cost level",
  average_daily_budget: "Avg. daily budget",
  annual_visitors: "Annual visitors",
};

export const SORT_DIRECTIONS = ["asc", "desc"] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const DEFAULT_DIRECTION: SortDirection = "asc";

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function toggleDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}
