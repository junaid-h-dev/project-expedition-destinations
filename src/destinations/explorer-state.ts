import { type CostLevel, isCostLevel } from "@/domain/cost-level";
import { MAX_SEARCH_LENGTH } from "@/domain/search";
import {
  DEFAULT_DIRECTION,
  DEFAULT_SORT,
  type DestinationSort,
  isDestinationSort,
  isSortDirection,
  type SortDirection,
} from "@/domain/sorting";
import type { DestinationListQuery } from "./repository";

/**
 * The explorer page's URL state. This module is imported by a Client Component,
 * so it deliberately has no server-only dependencies (the API's Zod schema lives
 * in ./query).
 */
export interface ExplorerState {
  search: string;
  /** A region present in the catalogue, or "" for no filter. */
  region: string;
  costLevel: CostLevel | "";
  sort: DestinationSort;
  direction: SortDirection;
  page: number;
}

export const EXPLORER_PER_PAGE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Normalisation for the page, which is the opposite policy from the API: anything
 * a person typed into the URL is coerced to a value the UI can represent — an
 * unknown cost level or region means "no filter", an unknown sort key or
 * direction means the default — so the controls always show what is applied.
 */
export function explorerStateFromSearchParams(
  params: SearchParams,
  knownRegions: string[],
): ExplorerState {
  const first = (key: string): string => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;

    return single ?? "";
  };

  const sort = first("sort");
  const direction = first("direction");
  const costLevel = first("cost");
  const region = first("region");
  const page = Number.parseInt(first("page"), 10);

  return {
    search: first("q").slice(0, MAX_SEARCH_LENGTH),
    region: knownRegions.includes(region) ? region : "",
    costLevel: isCostLevel(costLevel) ? costLevel : "",
    sort: isDestinationSort(sort) ? sort : DEFAULT_SORT,
    direction: isSortDirection(direction) ? direction : DEFAULT_DIRECTION,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Whether anything is narrowing the catalogue, which changes what an empty result means. */
export function hasActiveFilters(state: ExplorerState): boolean {
  return state.search !== "" || state.region !== "" || state.costLevel !== "";
}

export function explorerStateToListQuery(state: ExplorerState): DestinationListQuery {
  return {
    search: state.search,
    region: state.region || null,
    costLevel: state.costLevel || null,
    activity: null,
    sort: state.sort,
    direction: state.direction,
    page: state.page,
    perPage: EXPLORER_PER_PAGE,
  };
}

/** Build the page URL for a state, omitting defaults so URLs stay clean. */
export function explorerHref(state: ExplorerState): string {
  const params = new URLSearchParams();

  if (state.search) params.set("q", state.search);
  if (state.region) params.set("region", state.region);
  if (state.costLevel) params.set("cost", state.costLevel);
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.direction !== DEFAULT_DIRECTION) params.set("direction", state.direction);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();

  return query ? `/?${query}` : "/";
}
