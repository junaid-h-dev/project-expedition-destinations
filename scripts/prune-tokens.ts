import "./env";
import { pruneExpiredTokens } from "@/auth/tokens";
import { closeDb } from "@/db/client";

/**
 * Expired tokens are refused on use; this keeps the table from growing forever.
 * Run it daily from cron: `npm run tokens:prune`.
 */
async function main(): Promise<void> {
  const removed = await pruneExpiredTokens(24);
  console.log(`Pruned ${removed} expired token(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
