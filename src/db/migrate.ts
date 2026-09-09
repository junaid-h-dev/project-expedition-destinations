import {
  type Migration,
  type MigrationProvider,
  type MigrationResultSet,
  Migrator,
} from "kysely/migration";
import { db, dialect, type Dialect } from "./client";
import { createDestinationsTable } from "./migrations/2026_04_01_000001_create_destinations_table";
import { createUsersAndTokensTables } from "./migrations/2026_09_06_000002_create_users_and_tokens_tables";

/**
 * Migrations are registered in code (not discovered from the file system) so they
 * work identically from the CLI, the test suite and a bundled server. Keys sort
 * chronologically, which is the order Kysely applies them in.
 */
function migrations(engine: Dialect): Record<string, Migration> {
  return {
    "2026_04_01_000001_create_destinations_table": createDestinationsTable(engine),
    "2026_09_06_000002_create_users_and_tokens_tables": createUsersAndTokensTables(engine),
  };
}

class InCodeMigrationProvider implements MigrationProvider {
  constructor(private readonly engine: Dialect) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations(this.engine);
  }
}

function migrator(): Migrator {
  return new Migrator({ db: db(), provider: new InCodeMigrationProvider(dialect()) });
}

export async function migrateToLatest(): Promise<MigrationResultSet> {
  const result = await migrator().migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  return result;
}
