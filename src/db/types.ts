import type { ColumnType, Generated } from "kysely";

/**
 * Timestamps are written as `YYYY-MM-DD HH:MM:SS` UTC strings, which both MySQL
 * (DATETIME) and SQLite (TEXT) accept; MySQL reads them back as Date objects and
 * SQLite as strings. `toDate()` in ./timestamps normalises both.
 */
export type Timestamp = ColumnType<Date | string, string, string>;

export interface DestinationsTable {
  id: Generated<number>;
  name: string;
  country: string;
  region: string;
  cost_level: string;
  /** JSON-encoded string[]; MySQL returns it parsed, SQLite as text. */
  activities: ColumnType<string | string[], string, string>;
  average_daily_budget: number;
  annual_visitors: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Database {
  destinations: DestinationsTable;
}
