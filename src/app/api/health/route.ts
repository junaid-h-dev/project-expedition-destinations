import { sql } from "kysely";
import { db } from "@/db/client";
import { errorResponse, json } from "@/http/responses";

/**
 * GET /api/health — liveness for load balancers and uptime checks. Not throttled
 * and not rate-limit keyed, so monitoring never competes with real clients.
 */
export async function GET(): Promise<Response> {
  try {
    await sql`select 1`.execute(db());

    return json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);

    return errorResponse(503, "Database unavailable.");
  }
}
