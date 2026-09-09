import { z } from "zod";

/**
 * Typed, validated view of the environment. `instrumentation.ts` reads it when the
 * server starts, so a typo in `.env` fails at boot with a clear message instead of
 * somewhere deep in a request.
 */
const schema = z.object({
  APP_NAME: z.string().default("Project Expedition"),
  // Fail closed: an unset APP_ENV on a production build is production.
  APP_ENV: z
    .enum(["local", "testing", "production"])
    .default(process.env.NODE_ENV === "production" ? "production" : "local"),
  APP_URL: z.url().default("http://localhost:3000"),
  DB_CONNECTION: z.enum(["mysql", "sqlite"]).default("sqlite"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_DATABASE: z.string().default("database/database.sqlite"),
  DB_USERNAME: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  /**
   * Number of reverse proxies in front of the app that append to X-Forwarded-For.
   * 0 means the header is not trusted at all (no proxy, or an untrusted one).
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  TOKEN_PREFIX: z.string().default("pe_"),
  TOKEN_EXPIRATION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 24 * 90),
});

/**
 * The defaults above are development conveniences, and three of them are unsafe to
 * inherit in production: an unset APP_URL would put `localhost` in the API's
 * pagination links, an unset DB_CONNECTION would quietly serve an empty SQLite
 * file next to the build, and an unset TRUSTED_PROXY_HOPS would trust an
 * X-Forwarded-For header that no proxy wrote — letting a client pick its own
 * rate-limit bucket. Production has to say what it means.
 */
const REQUIRED_IN_PRODUCTION = ["APP_URL", "DB_CONNECTION", "TRUSTED_PROXY_HOPS"] as const;

const environment = schema.superRefine((env, ctx) => {
  if (env.APP_ENV !== "production") {
    return;
  }

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (process.env[key] === undefined || process.env[key] === "") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} must be set explicitly when APP_ENV=production.`,
      });
    }
  }
});

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

export function config(): Config {
  if (cached === undefined) {
    const parsed = environment.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }

  return cached;
}

/** Test hook: forget the cached environment so a test can change it. */
export function resetConfig(): void {
  cached = undefined;
}

export function isProduction(): boolean {
  return config().APP_ENV === "production";
}
