# Discussion

Working notes for the Project Expedition assignment (JavaScript edition): the decisions
behind each section, the trade-offs, and what I would do next with more time. The four
sections of the brief map onto the modules described below.

## Approach

The brief describes a prototype with problems in every layer: hard-coded data duplicated
across the UI, the API and the seeder; a seed endpoint that truncates a table with no
authentication or throttling; a search that lags a keystroke and is case-sensitive;
sorting that compares strings for a price tier; all rows held in component state; and no
tests or tooling. Rather than patch those symptoms one by one, I treated them as
requirements for the finished application and built each layer to make the whole class of
problem impossible:

- one data source (the database, seeded from a single catalogue file);
- one query implementation (`src/destinations/repository.ts`) shared by the API and the page;
- URL state instead of component state for the explorer;
- validation at the API boundary and normalisation at the page boundary;
- guards in the right order on the only endpoint that changes data.

## Stack

**Next.js 16 (App Router) + TypeScript.** The brief says "JavaScript"; a Next.js monolith
is the closest analogue to the Laravel + Livewire original — one project holding the UI,
the API and the data layer — and the stack most reviewers can read fluently. React Server
Components play the role Livewire played: the explorer is rendered on the server from the
URL, and the only client-side JavaScript is the controls that change the URL.

**Kysely as the data layer**, on `mysql2` for MySQL 8 (the production engine, provided by
`docker-compose.yml`) and `better-sqlite3` for SQLite (tests and zero-dependency runs).
I wanted one schema and one set of queries to run on both engines. Prisma fixes the
provider at generate time, and Drizzle's schema is per-dialect; Kysely's type-level schema
is engine-agnostic and its query builder is close enough to SQL that the three places
where the engines genuinely differ (JSON column type, JSON containment, upsert syntax)
are visible as explicit branches rather than hidden behind an abstraction.

**Zod** validates the API query string and the environment. **Vitest** runs the server
suites in Node against an in-memory SQLite database (route handlers are plain functions
taking a `Request`, so no HTTP server is needed) and the component suites in jsdom with
Testing Library.

## Section 1 — Project setup

- `npm run check` is the single local gate: ESLint (Next.js core-web-vitals + React hooks
  rules, formatting delegated to Prettier), Prettier, `next typegen && tsc --noEmit` under
  `strict`, and Vitest. CI runs the same steps plus `npm audit`, the production build
  and the test suite.
- A validated, typed `config()` reads the environment once so a typo in `.env` fails at
  boot with a clear message. Three values have development defaults that would be wrong
  to inherit in production — `APP_URL` (it ends up in the API's pagination links),
  `DB_CONNECTION` (an unset one would serve an empty SQLite file) and `TRUSTED_PROXY_HOPS`
  (trusting an `X-Forwarded-For` that no proxy wrote hands clients their own rate-limit
  bucket) — so `APP_ENV=production` requires them explicitly rather than guessing.
- `.env.example` documents every variable the application reads; the database it
  points at arrives in Section 2.
- Resilience basics so far: `instrumentation.ts` validates the environment when the
  server starts, and `APP_ENV` fails closed (unset on a production build means
  production).
- Left out on purpose: Playwright end-to-end tests (a browser suite is worth adding
  once the UI is rebuilt), an application Dockerfile (deploy target unknown), Husky hooks (CI enforces
  the gate; `npm run check` is the documented pre-push step), and `cacheComponents` (the
  page is request-driven by nature; caching is a later optimisation).
