/**
 * Runs once when the Next.js server starts. Reading the configuration here turns
 * a bad `.env` into a boot-time failure with a readable message rather than a 500
 * on the first request.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { config } = await import("@/config");
    config();
  }
}
