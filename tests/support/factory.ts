import { upsertDestination } from "@/destinations/repository";
import type { CostLevel } from "@/domain/cost-level";
import type { Destination, DestinationAttributes } from "@/domain/destination";

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

/** A Request the route handlers accept, with an absolute URL like Next.js provides. */
export function apiRequest(path: string, init: RequestInit & { ip?: string } = {}): Request {
  const headers = new Headers(init.headers);

  if (init.ip) headers.set("x-forwarded-for", init.ip);

  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}
