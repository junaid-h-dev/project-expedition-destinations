import { apiHandler } from "@/http/api";
import { notFound } from "@/http/responses";

/** `/api` itself is not a resource; keep the JSON 404 consistent with the catch-all. */
const missing = apiHandler(async () => notFound());

export { missing as GET, missing as POST, missing as PUT, missing as PATCH, missing as DELETE };
