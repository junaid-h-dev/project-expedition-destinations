import { issueToken } from "@/auth/tokens";
import { db } from "@/db/client";
import { toDbTimestamp } from "@/db/timestamps";
import { upsertDestination } from "@/destinations/repository";
import type { CostLevel } from "@/domain/cost-level";
import type { Destination, DestinationAttributes } from "@/domain/destination";
import type { TokenAbility } from "@/domain/token-ability";

let sequence = 0;

const BUDGETS: Record<CostLevel, number> = { Budget: 60, Moderate: 150, Premium: 250, Luxury: 400 };

/** Deterministic, unique test data; override whatever the test cares about. */
export async function createDestination(
  overrides: Partial<DestinationAttributes> = {},
): Promise<Destination> {
  sequence += 1;
  const costLevel = overrides.costLevel ?? "Moderate";

  return upsertDestination({
    name: `Place ${String(sequence).padStart(3, "0")}`,
    country: `Country ${sequence}`,
    region: "Europe",
    costLevel,
    activities: ["Photography"],
    averageDailyBudget: BUDGETS[costLevel],
    annualVisitors: 1_000_000 + sequence,
    ...overrides,
  });
}

export async function createUser(
  email = `user${++sequence}@example.com`,
): Promise<{ id: number; email: string }> {
  const now = toDbTimestamp();
  const inserted = await db()
    .insertInto("users")
    .values({ name: "Test User", email, created_at: now, updated_at: now })
    .executeTakeFirstOrThrow();

  return { id: Number(inserted.insertId), email };
}

export async function createToken(
  abilities: TokenAbility[] = ["destinations:seed"],
  expiresAt: Date = new Date(Date.now() + 24 * 60 * 60 * 1000),
): Promise<string> {
  const user = await createUser();
  const issued = await issueToken(user.id, "test", abilities, expiresAt);

  return issued.plainText;
}

/** A Request the route handlers accept, with an absolute URL like Next.js provides. */
export function apiRequest(
  path: string,
  init: RequestInit & { token?: string; ip?: string } = {},
): Request {
  const headers = new Headers(init.headers);

  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.ip) headers.set("x-forwarded-for", init.ip);

  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}
