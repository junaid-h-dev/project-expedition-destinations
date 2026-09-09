import { type Kysely, type Selectable, type SelectQueryBuilder, sql } from "kysely";
import { db, dialect } from "@/db/client";
import { fromJsonColumn, toDate, toDbTimestamp } from "@/db/timestamps";
import type { Database, DestinationsTable } from "@/db/types";
import { COST_LEVELS, type CostLevel, costLevelRank, isCostLevel } from "@/domain/cost-level";
import type { Destination, DestinationAttributes } from "@/domain/destination";
import type { DestinationSort, SortDirection } from "@/domain/sorting";

export interface DestinationFilters {
  search?: string | null;
  region?: string | null;
  costLevel?: CostLevel | null;
  activity?: string | null;
}

export interface DestinationListQuery extends DestinationFilters {
  sort: DestinationSort;
  direction: SortDirection;
  page: number;
  perPage: number;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}

type Row = Selectable<DestinationsTable>;

type DestinationsQuery = SelectQueryBuilder<Database, "destinations", Row>;

/** Paginated, filtered, sorted listing shared by the API and the page. */
export async function listDestinations(query: DestinationListQuery): Promise<Page<Destination>> {
  const filtered = applyFilters(db().selectFrom("destinations").selectAll(), query);

  const { count } = await filtered
    .clearSelect()
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  const total = Number(count);
  const lastPage = Math.max(1, Math.ceil(total / query.perPage));
  const page = Math.min(Math.max(1, query.page), lastPage);

  const rows = await applySort(filtered, query.sort, query.direction)
    .limit(query.perPage)
    .offset((page - 1) * query.perPage)
    .execute();

  const data = rows.map(toDestination);

  return {
    data,
    total,
    page,
    perPage: query.perPage,
    lastPage,
    from: total === 0 ? null : (page - 1) * query.perPage + 1,
    to: total === 0 ? null : (page - 1) * query.perPage + data.length,
  };
}

export async function findDestination(id: number): Promise<Destination | null> {
  const row = await db()
    .selectFrom("destinations")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  return row ? toDestination(row) : null;
}

/** Distinct regions present in the catalogue, for the filter control. */
export async function listRegions(): Promise<string[]> {
  const rows = await db()
    .selectFrom("destinations")
    .select("region")
    .distinct()
    .orderBy("region")
    .execute();

  return rows.map((row) => row.region);
}

/**
 * Create or update by the (name, country) unique key, atomically: each engine has
 * its own upsert syntax, so this is one of the two deliberate dialect branches.
 * Runs inside the given transaction when the caller has one.
 */
export async function upsertDestination(
  attributes: DestinationAttributes,
  trx: Kysely<Database> = db(),
): Promise<Destination> {
  const now = toDbTimestamp();
  const values = {
    region: attributes.region,
    cost_level: attributes.costLevel,
    activities: JSON.stringify(attributes.activities),
    average_daily_budget: attributes.averageDailyBudget,
    annual_visitors: attributes.annualVisitors,
    updated_at: now,
  };
  const insert = trx.insertInto("destinations").values({
    name: attributes.name,
    country: attributes.country,
    ...values,
    created_at: now,
  });

  if (dialect() === "mysql") {
    await insert.onDuplicateKeyUpdate(values).execute();
  } else {
    await insert.onConflict((oc) => oc.columns(["name", "country"]).doUpdateSet(values)).execute();
  }

  const row = await trx
    .selectFrom("destinations")
    .selectAll()
    .where("name", "=", attributes.name)
    .where("country", "=", attributes.country)
    .executeTakeFirstOrThrow();

  return toDestination(row);
}

function applyFilters(query: DestinationsQuery, filters: DestinationFilters): DestinationsQuery {
  const term = filters.search?.trim() ?? "";

  if (term !== "") {
    // Both sides are lower-cased explicitly: MySQL compares a JSON column as a
    // binary string, so a plain LIKE against `activities` would be case-sensitive
    // there while SQLite's is not. `%` and `_` are escaped so they match literally;
    // `!` is the escape character because it needs no engine-specific quoting.
    // Matching `activities` as text also matches its JSON punctuation, so a term
    // of `"` or `,` matches every row — harmless for free-text search, and the
    // `activity` filter below is the exact, element-wise version.
    const escaped = term.toLowerCase().replace(/[!%_]/g, (char) => `!${char}`);
    const pattern = `%${escaped}%`;

    query = query.where((eb) =>
      eb.or([
        sql<boolean>`LOWER(name) LIKE ${pattern} ESCAPE '!'`,
        sql<boolean>`LOWER(country) LIKE ${pattern} ESCAPE '!'`,
        sql<boolean>`LOWER(region) LIKE ${pattern} ESCAPE '!'`,
        sql<boolean>`LOWER(activities) LIKE ${pattern} ESCAPE '!'`,
      ]),
    );
  }

  if (filters.region) {
    query = query.where("region", "=", filters.region);
  }

  if (filters.costLevel) {
    query = query.where("cost_level", "=", filters.costLevel);
  }

  if (filters.activity) {
    // JSON containment is the one place the two engines have no common syntax.
    query =
      dialect() === "mysql"
        ? query.where(sql<boolean>`JSON_CONTAINS(activities, ${JSON.stringify(filters.activity)})`)
        : query.where(
            sql<boolean>`EXISTS (SELECT 1 FROM json_each(activities) WHERE json_each.value = ${filters.activity})`,
          );
  }

  return query;
}

/**
 * Order by one of the allow-listed columns. Cost level sorts by price tier rather
 * than alphabetically. The ordering is then made total — name, then the primary
 * key — because the unique key is (name, country): without a final tie-break two
 * rows with the same name could swap places between pages, so a row could be
 * listed twice or skipped while paginating.
 */
function applySort(
  query: DestinationsQuery,
  sort: DestinationSort,
  direction: SortDirection,
): DestinationsQuery {
  if (sort === "cost_level") {
    const cases = sql.join(
      COST_LEVELS.map((level) => sql`WHEN ${level} THEN ${costLevelRank(level)}`),
      sql` `,
    );
    query = query.orderBy(sql`CASE cost_level ${cases} ELSE 0 END`, direction);
  } else {
    query = query.orderBy(sort, direction);
  }

  return (sort === "name" ? query : query.orderBy("name", "asc")).orderBy("id", "asc");
}

function toDestination(row: Row): Destination {
  const costLevel = row.cost_level;

  if (!isCostLevel(costLevel)) {
    throw new Error(`Destination ${row.id} has an unknown cost level "${costLevel}".`);
  }

  return {
    id: Number(row.id),
    name: row.name,
    country: row.country,
    region: row.region,
    costLevel,
    activities: fromJsonColumn(row.activities),
    averageDailyBudget: Number(row.average_daily_budget),
    annualVisitors: Number(row.annual_visitors),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}
