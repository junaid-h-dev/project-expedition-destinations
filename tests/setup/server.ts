import { afterAll, beforeAll, beforeEach } from "vitest";

// The suite runs against an in-memory SQLite database unless the environment
// points at something else (CI runs it a second time against MySQL 8).
process.env.APP_ENV = "testing";
process.env.APP_URL ??= "http://localhost:3000";
process.env.DB_CONNECTION ??= "sqlite";
process.env.DB_DATABASE ??= ":memory:";
process.env.TRUSTED_PROXY_HOPS ??= "1";

// Every test starts from empty tables, so refuse to run against anything that
// does not look like a throwaway database (a shell that sourced a dev `.env`
// would otherwise have its data wiped).
const database = process.env.DB_DATABASE;
if (database !== ":memory:" && !/(_test|\.test\.sqlite)$/.test(database)) {
  throw new Error(
    `Refusing to run tests against DB_DATABASE="${database}": use ":memory:" or a database whose name ends in "_test".`,
  );
}

const { closeDb, db } = await import("@/db/client");
const { migrateToLatest } = await import("@/db/migrate");
const { resetRateLimits } = await import("@/http/rate-limit");
const { resetConfig } = await import("@/config");

beforeAll(async () => {
  await migrateToLatest();
});

beforeEach(async () => {
  resetConfig();
  resetRateLimits();
  await db().deleteFrom("destinations").execute();
});

afterAll(async () => {
  await closeDb();
});
