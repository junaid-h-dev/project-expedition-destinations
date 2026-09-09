import "./env";
import { parseArgs } from "node:util";
import { issueTokenCommand } from "@/auth/issue-token-command";
import { closeDb } from "@/db/client";

/**
 * Issue a personal access token for API access.
 *
 *   npm run api:token -- --email=admin@example.com --ability=destinations:seed [--name=ci] [--expires-in-days=30]
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      ability: { type: "string", multiple: true },
      name: { type: "string", default: "cli" },
      "expires-in-days": { type: "string", default: "30" },
    },
  });

  if (!values.email) {
    console.error(
      "Usage: npm run api:token -- --email=<user email> --ability=<ability> [--name=<label>] [--expires-in-days=<days>]",
    );
    process.exitCode = 1;

    return;
  }

  const outcome = await issueTokenCommand({
    email: values.email,
    name: values.name ?? "cli",
    abilities: values.ability ?? [],
    expiresInDays: Number(values["expires-in-days"]),
  });

  for (const line of outcome.lines) {
    console.log(line);
  }

  if (!outcome.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
