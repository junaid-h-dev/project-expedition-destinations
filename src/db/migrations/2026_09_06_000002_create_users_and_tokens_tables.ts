import type { Kysely } from "kysely";
import type { Dialect } from "../client";

/**
 * Users exist to own API tokens; there is no password login in this application.
 * Tokens are stored hashed (SHA-256) — the plain text is shown once at issue time.
 */
export function createUsersAndTokensTables(dialect: Dialect) {
  const timestamp = dialect === "mysql" ? "datetime" : "text";
  const idType = dialect === "mysql" ? "bigint" : "integer";

  return {
    async up(db: Kysely<unknown>): Promise<void> {
      await db.schema
        .createTable("users")
        .addColumn("id", idType, (col) =>
          dialect === "mysql"
            ? col.primaryKey().autoIncrement().unsigned()
            : col.primaryKey().autoIncrement(),
        )
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
        .addColumn("created_at", timestamp, (col) => col.notNull())
        .addColumn("updated_at", timestamp, (col) => col.notNull())
        .execute();

      await db.schema
        .createTable("personal_access_tokens")
        .addColumn("id", idType, (col) =>
          dialect === "mysql"
            ? col.primaryKey().autoIncrement().unsigned()
            : col.primaryKey().autoIncrement(),
        )
        .addColumn("user_id", idType, (col) =>
          (dialect === "mysql" ? col.unsigned() : col)
            .notNull()
            .references("users.id")
            .onDelete("cascade"),
        )
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("token_hash", "varchar(64)", (col) => col.notNull().unique())
        .addColumn("abilities", "text", (col) => col.notNull())
        .addColumn("last_used_at", timestamp)
        .addColumn("expires_at", timestamp, (col) => col.notNull())
        .addColumn("created_at", timestamp, (col) => col.notNull())
        .execute();

      await db.schema
        .createIndex("personal_access_tokens_expires_at_index")
        .on("personal_access_tokens")
        .column("expires_at")
        .execute();
    },

    async down(db: Kysely<unknown>): Promise<void> {
      await db.schema.dropTable("personal_access_tokens").ifExists().execute();
      await db.schema.dropTable("users").ifExists().execute();
    },
  };
}
