import fs from "node:fs";
import path from "node:path";
import SQLite from "better-sqlite3";
import { Kysely, MysqlDialect, SqliteDialect } from "kysely";
import { createPool } from "mysql2";
import { config } from "@/config";
import type { Database } from "./types";

export type Dialect = "mysql" | "sqlite";

interface Connection {
  db: Kysely<Database>;
  dialect: Dialect;
}

// Kept on globalThis so `next dev`'s hot reloading, which re-evaluates modules,
// does not open a new pool (or a new in-memory SQLite database) on every edit.
const globalState = globalThis as typeof globalThis & { __destinationsDb?: Connection };

/**
 * One Kysely instance per process, on the dialect chosen by DB_CONNECTION.
 * MySQL is the production engine; SQLite is the zero-dependency local/test option.
 */
export function db(): Kysely<Database> {
  return getConnection().db;
}

export function dialect(): Dialect {
  return getConnection().dialect;
}

function getConnection(): Connection {
  globalState.__destinationsDb ??= connect();

  return globalState.__destinationsDb;
}

function connect(): Connection {
  const env = config();

  if (env.DB_CONNECTION === "mysql") {
    const pool = createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_DATABASE,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      // Timestamps are stored as UTC; read them back the same way.
      timezone: "Z",
      connectionLimit: 10,
      // Fail fast when the database is unreachable instead of hanging a request.
      connectTimeout: 5_000,
    });

    return { db: new Kysely<Database>({ dialect: new MysqlDialect({ pool }) }), dialect: "mysql" };
  }

  const file = env.DB_DATABASE;
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const database = new SQLite(file);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  return {
    db: new Kysely<Database>({ dialect: new SqliteDialect({ database }) }),
    dialect: "sqlite",
  };
}

/** Close the connection (tests, CLI scripts). */
export async function closeDb(): Promise<void> {
  const connection = globalState.__destinationsDb;

  if (connection !== undefined) {
    globalState.__destinationsDb = undefined;
    await connection.db.destroy();
  }
}
