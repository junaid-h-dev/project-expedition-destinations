import { z } from "zod";
import { COST_LEVELS } from "@/domain/cost-level";
import { MAX_SEARCH_LENGTH } from "@/domain/search";
import {
  DEFAULT_DIRECTION,
  DEFAULT_SORT,
  DESTINATION_SORTS,
  SORT_DIRECTIONS,
} from "@/domain/sorting";
import type { DestinationListQuery } from "./repository";

export const DEFAULT_PER_PAGE = 15;
export const MAX_PER_PAGE = 100;

/** An optional text parameter; blank counts as absent. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/** An optional enum parameter; blank (`?cost_level=`) counts as absent. */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum(values)
      .optional()
      .transform((value) => value ?? null),
  );

/**
 * Validation for the API listing. Invalid input is rejected (422) rather than
 * silently corrected: an API client should learn about its mistake.
 */
export const listQuerySchema = z.object({
  search: optionalText(MAX_SEARCH_LENGTH),
  region: optionalText(100),
  cost_level: optionalEnum(COST_LEVELS),
  activity: optionalText(100),
  sort: z.enum(DESTINATION_SORTS).default(DEFAULT_SORT),
  direction: z.enum(SORT_DIRECTIONS).default(DEFAULT_DIRECTION),
  per_page: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(DEFAULT_PER_PAGE),
  page: z.coerce.number().int().min(1).default(1),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

export function toListQuery(input: ListQueryInput): DestinationListQuery {
  return {
    search: input.search,
    region: input.region,
    costLevel: input.cost_level,
    activity: input.activity,
    sort: input.sort,
    direction: input.direction,
    page: input.page,
    perPage: input.per_page,
  };
}
