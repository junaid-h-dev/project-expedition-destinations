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
  `strict`, and Vitest. CI runs the same steps plus `npm audit`, the production build, and
  the test suite twice — on SQLite for speed and on MySQL 8 for parity.
- A validated, typed `config()` reads the environment once so a typo in `.env` fails at
  boot with a clear message. Three values have development defaults that would be wrong
  to inherit in production — `APP_URL` (it ends up in the API's pagination links),
  `DB_CONNECTION` (an unset one would serve an empty SQLite file) and `TRUSTED_PROXY_HOPS`
  (trusting an `X-Forwarded-For` that no proxy wrote hands clients their own rate-limit
  bucket) — so `APP_ENV=production` requires them explicitly rather than guessing.
- `.env.example` targets the docker-compose MySQL service; `npm run setup` creates
  `.env`, migrates and builds. The SQLite path needs no Docker at all.
- Resilience basics: `instrumentation.ts` validates the environment when the server
  starts; `APP_ENV` fails closed (unset on a production build means production); an
  `error.tsx` boundary and a `not-found.tsx` page; a `connectTimeout` on the MySQL pool;
  `GET /api/health` for load balancers; and the test setup refuses to run against a
  database that does not look disposable.
- Left out on purpose: Playwright end-to-end tests (the URL-driven design means the
  behaviour is covered by handler and component tests; a browser suite is the next
  addition), an application Dockerfile (deploy target unknown), Husky hooks (CI enforces
  the gate; `npm run check` is the documented pre-push step), and `cacheComponents` (the
  page is request-driven by nature; caching is a later optimisation).

## Section 2 — Database & API

- **Migrations in code** (`src/db/migrations`, applied through Kysely's `Migrator`) rather
  than discovered from the file system, so they run identically from the CLI, the test
  setup and a bundled server. The JSON column uses MySQL's expression default (`('[]')`)
  and a `text` column on SQLite; indexes on the two filter columns; a unique key on
  `(name, country)` that the idempotent seeder relies on.
- **Timestamps** are written as `YYYY-MM-DD HH:MM:SS` UTC — the one format both engines
  accept — and normalised to `Date` when read, because mysql2 returns `Date` objects and
  SQLite returns text. The same helper decodes JSON columns that MySQL already parses.
- **Search** lower-cases both sides explicitly (`LOWER(col) LIKE ?`) and escapes `%`/`_`
  with `!` as the escape character. MySQL compares a JSON column as a binary string, so a
  naive `LIKE` against `activities` would be case-sensitive in production and not in
  tests; lower-casing makes the engines agree. `!` needs no engine-specific quoting.
- **Cost level sorts by tier** through a `CASE` expression whose values are bound
  parameters; **sort keys are an allow-list** (`DESTINATION_SORTS`) so user input never
  reaches `orderBy` unchecked; **name is the tie-breaker** so pages are stable.
- **Activity filter** is the one dialect branch: `JSON_CONTAINS` on MySQL, `json_each` on
  SQLite. It is isolated in the repository and covered by the test that CI runs on both.
- **API contract**: `/api/v1` prefix, snake_case keys, native JSON types, ISO-8601 dates,
  a `data` / `links` / `meta` envelope with the active filters kept in the links, `422`
  with per-field errors for invalid input, a JSON 404 for unknown API routes (a catch-all
  route handler, since Next.js would otherwise serve its HTML not-found page), and the
  conventional `X-RateLimit-*` headers. Every API response is `Cache-Control: no-store`:
  Next.js leaves dynamic route-handler responses without a cache header of their own, and
  a default-configured cache in front of the app would happily hand one client's listing,
  rate-limit budget or 429 to another.
- **Rate limiting** is a fixed window in an in-process `Map` with `Retry-After` on 429,
  keyed by token holder when a bearer token is sent and otherwise by client address.
  The address comes from `X-Forwarded-For`, but only the entry appended by the
  `TRUSTED_PROXY_HOPS` trusted proxies counts — anything a client puts in the header
  itself is ignored, otherwise the limit could be bypassed with a random header per
  request. Expired windows are swept so the store cannot grow without bound. That is
  the right size for one Node process and deliberately simple; behind a load balancer it
  should be backed by Redis, and the limiter's interface would not change.
- **One principal lookup per request.** The API pipeline resolves the bearer token once
  (only when one is sent) and hands the result to the handler; the seed endpoint's
  environment guard runs before that lookup, so in production a token is not even
  looked up before the 404. That lookup necessarily precedes rate limiting — the limit is
  keyed by whoever the token belongs to — so a credential that cannot be one of ours
  (wrong prefix or wrong shape) is rejected without a query.
- **The seed endpoint moved** from the brief's `POST /api/seed` to
  `POST /api/v1/destinations/seed`: it belongs under the versioned prefix with the
  resource it affects, and the README documents the new path.
- **The seed endpoint** runs the idempotent, transactional seeder and returns the rows it
  seeded. It answers 404 in production. "Production" is `APP_ENV`, kept separate from
  `NODE_ENV` so a production _build_ can be run locally as `local`; when `APP_ENV` is not
  set on a production build it defaults to `production`, i.e. it fails closed.

### Trade-offs

- The upsert is atomic on both engines (`ON DUPLICATE KEY UPDATE` / `ON CONFLICT`), which
  costs a second small dialect branch but means two concurrent seed calls cannot race a
  select-then-insert into a unique-key violation.
- Timestamps as strings cost a small normalisation layer; storing epoch integers would be
  simpler but unreadable in the database.
- Every ordering ends with the primary key. Names are not unique — the unique key is
  (name, country) — and without a total order two rows with the same name can swap places
  between two page queries, so one is shown twice and the other never.

## Section 3 — User interface

- **The URL is the only state.** `page.tsx` is an async Server Component: it normalises
  the search params, runs one paginated query through the shared repository, and renders
  the table. Search, filters, sort, direction and page are all in the query string, so a
  view is bookmarkable and survives a reload. Sorting and pagination are links, so they
  go into history; search and the filter selects use `router.replace`, so a session of
  typing does not bury the previous page behind twenty back-button presses.
- **Normalisation, not validation, at the page boundary.** The API rejects bad input; the
  page coerces it — `?cost=budget` or `?region=Atlantis` become "no filter", `?sort=x`
  becomes the default, the search term is capped — so the controls always show exactly the
  state that is applied. The page's vocabulary is short (`q`, `cost`) because people see
  and type those URLs; the API's (`search`, `cost_level`) matches its response keys. Both
  policies are unit tested, and the page-side helpers live in a module with no server
  dependencies (`explorer-state.ts`) so the client bundle does not carry Zod.
- **Typing is never overwritten by a slow response.** The search box keeps three values:
  what is in the input, what the URL said at the last render, and what was last navigated
  to. A render whose props match what we requested is our own navigation landing and is
  ignored; anything else — the back button, a sort link, server normalisation — is adopted.
  Without that distinction the box is cleared for the length of a round trip and
  keystrokes typed in that window are lost, which is invisible on localhost and obvious on
  a real connection. Changing a filter select carries the term that is still inside its
  debounce window, so it is not dropped either. Sort and pagination links are rendered
  from the state the server saw, so clicking one in the same instant as typing resolves
  to whichever navigation lands last.
- **Minimal client JavaScript.** `Filters` is the only Client Component: a debounced
  search box (300 ms), two selects that apply immediately, and a clear button, all of
  which navigate with `router.replace` inside a transition so the "Updating…" hint reflects
  real pending work. Sortable headings and pagination are plain links that work without
  JavaScript. The search box adopts the URL's value when it changes from elsewhere, using
  React's derive-state-during-render pattern rather than an effect.
- **Accessibility**: labelled controls, real links for sorting with `aria-sort`, a results
  count and a pending hint in live regions that exist before they have anything to say,
  visible focus rings, and a table whose horizontal scroll container is focusable and
  labelled so it can be scrolled from the keyboard.
- **Two empty states**, because "no rows" has two causes: filters that match nothing, with
  a way to clear them, and a catalogue that has not been seeded yet.
- **Formatting** with `Intl.NumberFormat` for currency and visitor counts; cost levels as
  colour-coded badges; activities as chips.

### With more time

- A Playwright suite for the debounce and navigation behaviour in a real browser.
- A details page per destination (the API already has `show`).
- An activity filter in the UI (the repository and API support it already).

## Section 4 — Authentication (bonus)

### The model: public reads, tokens with abilities for writes

The catalogue is public information — the page shows it to anyone — so putting the read
endpoints behind authentication would add friction without protecting anything. What
needs protecting is the ability to _change_ data; today that is the seed endpoint.

**Personal access tokens with abilities**, modelled on Laravel Sanctum:

- The API's consumers are machines (CI, scripts, integrations); a bearer token is the
  simplest thing that works for them. Session auth would only suit a first-party SPA that
  does not exist; OAuth would be justified if third parties needed delegated consent.
- Tokens are random (`pe_` prefix for secret scanners), shown once, stored as SHA-256
  hashes, and carry an explicit list of abilities (`TOKEN_ABILITIES`). `npm run api:token`
  requires at least one `--ability` — a token that can do everything by default would
  contradict the least-privilege story — and refuses an expiry beyond
  `TOKEN_EXPIRATION_MINUTES` rather than printing a lifetime that will not be honoured.
- **Defense in depth on the seed endpoint**, in this order: environment guard (404, so
  production reveals nothing) → authentication (401) → ability (403) → 5-per-minute
  throttle. Rate limiting keys on the token holder when a valid token is present and on
  the client IP otherwise, so a shared office IP does not throttle a legitimate integration.
- Users exist only to own tokens; there is no password login, and the local seeder only
  creates `admin@example.com` outside production.

Worth stating plainly: the only endpoint this protects today is one that answers 404 in
production, so the token layer is exercised in development and CI rather than in
production, and there is deliberately no way to create the first user over HTTP. It is
built now because the endpoints that will need it — the write operations under "With more
time" — should not each invent their own access control, and because the assignment asks
what protection the API needs rather than what it currently uses.

### What I left out

- Token management over HTTP (issue/list/revoke). Issuing credentials from the CLI keeps
  the bootstrap problem out of the API; endpoints are a natural next step once there is a
  notion of accounts.
- Roles or policies. With one protected action, abilities are enough.

## Closing notes

Every section's quality gate (`npm run check`: ESLint, Prettier, strict TypeScript,
the Vitest suites) is green, the production build succeeds, and CI runs the suite on both
SQLite and MySQL 8.

Questions for the team:

- Is the API meant for third parties (which would argue for an OpenAPI document and a
  compatibility policy) or only for internal tooling?
- Should activities become a first-class entity with their own management UI?
- What is the deployment target? Single Node process (the in-memory limiter is fine) or
  several instances (a shared store is needed)?
