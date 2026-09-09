import { type Kysely, sql } from "kysely";
import type { Dialect } from "../client";

export function createDestinationsTable(dialect: Dialect) {
  return {
    async up(db: Kysely<unknown>): Promise<void> {
      await db.schema
        .createTable("destinations")
        .addColumn("id", dialect === "mysql" ? "bigint" : "integer", (col) =>
          dialect === "mysql"
            ? col.primaryKey().autoIncrement().unsigned()
            : col.primaryKey().autoIncrement(),
        )
        .addColumn("name", "varchar(255)", (col) => col.notNull())
        .addColumn("country", "varchar(255)", (col) => col.notNull())
        .addColumn("region", "varchar(255)", (col) => col.notNull())
        // Backed by the CostLevel type in the app; kept as a string column so adding
        // a tier never requires an ALTER TABLE.
        .addColumn("cost_level", "varchar(16)", (col) => col.notNull())
        // MySQL only allows expression defaults on JSON columns, so the literal is
        // parenthesised; the same syntax is valid on SQLite.
        .addColumn("activities", dialect === "mysql" ? "json" : "text", (col) =>
          col.notNull().defaultTo(sql`('[]')`),
        )
        .addColumn("average_daily_budget", "integer", (col) => col.notNull()) // USD per day
        .addColumn("annual_visitors", "bigint", (col) => col.notNull())
        .addColumn("created_at", dialect === "mysql" ? "datetime" : "text", (col) => col.notNull())
        .addColumn("updated_at", dialect === "mysql" ? "datetime" : "text", (col) => col.notNull())
        .addUniqueConstraint("destinations_name_country_unique", ["name", "country"])
        .execute();

      await db.schema
        .createIndex("destinations_region_index")
        .on("destinations")
        .column("region")
        .execute();
      await db.schema
        .createIndex("destinations_cost_level_index")
        .on("destinations")
        .column("cost_level")
        .execute();
    },

    async down(db: Kysely<unknown>): Promise<void> {
      await db.schema.dropTable("destinations").ifExists().execute();
    },
  };
}
