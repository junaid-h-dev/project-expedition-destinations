import { apiHandler } from "@/http/api";
import { notFound } from "@/http/responses";

/**
 * Anything under /api that no handler claims answers with the same JSON 404 the
 * real endpoints use, instead of Next.js's HTML not-found page. It goes through
 * the shared pipeline so probing unknown paths still counts against the limit.
 */
const missing = apiHandler(async () => notFound());

export { missing as GET, missing as POST, missing as PUT, missing as PATCH, missing as DELETE };
