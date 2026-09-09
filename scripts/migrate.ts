import "./env";
import { closeDb } from "@/db/client";
import { migrateToLatest } from "@/db/migrate";

async function main(): Promise<void> {
  const { results } = await migrateToLatest();

  if (!results || results.length === 0) {
    console.log("Nothing to migrate.");
  }

  for (const result of results ?? []) {
    console.log(`${result.status === "Success" ? "DONE" : "FAIL"}  ${result.migrationName}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
