# Project Expedition — Destination Explorer

A small Next.js 16 (App Router) + TypeScript application for browsing the travel
destinations Project Expedition offers, with a JSON API alongside the UI.

The original candidate brief lives in [`ASSIGNMENT.md`](ASSIGNMENT.md); design notes,
trade-offs and open questions are in [`DISCUSSION.md`](DISCUSSION.md).

## Requirements

- Node.js 20.9+ and npm
- Docker (only for the MySQL service; optional with SQLite)

## Quick start

```bash
docker compose up -d --wait   # MySQL 8.4 on 127.0.0.1:3306 (skip when using SQLite)
npm run setup                 # npm install, .env, migrate, production build
npm run db:seed               # load the destination catalogue (safe to re-run)
npm run dev                   # or: npm start (after npm run build)
```

Then open <http://localhost:3000>. The explorer supports free-text search, region and
cost-level filters, sortable columns and pagination; the state lives in the URL
(for example `/?q=peru&sort=annual_visitors&direction=desc`), so a view can be shared.

### Database

`.env.example` points at the MySQL service defined in `docker-compose.yml`; docker
compose reads the same `.env`, so the credentials only live in one place.

For a zero-dependency setup switch `.env` to SQLite (the file is created by the first
migration):

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

The schema lives in code (`src/db/migrations`) and is applied with `npm run db:migrate`;
the same migrations run on both engines.

## Development workflow

| Command                | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run check`        | Lint, format check, type check and tests (the CI gate)        |
| `npm run lint`         | ESLint (Next.js rules + React hooks)                          |
| `npm run format:check` | Prettier in check mode (`npm run format` to apply)            |
| `npm run typecheck`    | `next typegen` + `tsc --noEmit` (strict TypeScript)           |
| `npm test`             | Vitest: server suites on SQLite in-memory, UI suites in jsdom |
| `npm run db:migrate`   | Apply pending migrations                                      |
| `npm run db:seed`      | Upsert the destination catalogue (safe to re-run)             |

Tests run against an in-memory SQLite database by default. To run them against MySQL
locally (as CI does), export `DB_CONNECTION=mysql` and the `DB_*` credentials of a
_separate_ test database, then run `npm test -- --no-file-parallelism`.

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`: lint,
format, type check, `npm audit`, the production build, and the test suite on both
SQLite and MySQL 8. Dependabot keeps npm packages and the Actions current.

### Deploying

`npm ci && npm run build`, then on each release `npm run db:migrate` followed by
`npm run db:seed`, then `npm start`. The CLI scripts run through `tsx`, which is a
runtime dependency for that reason.

With `APP_ENV=production` the server refuses to start unless `APP_URL`, `DB_CONNECTION`
and `TRUSTED_PROXY_HOPS` are set explicitly: their development defaults would put
`localhost` in the API's pagination links, quietly serve an empty SQLite file, and trust
an `X-Forwarded-For` header no proxy wrote. `TRUSTED_PROXY_HOPS` is the number of reverse
proxies in front of the app; `0` ignores the header altogether, which is right when there
is no proxy but puts every anonymous client in one rate-limit bucket, since a route
handler cannot see the socket address. An unset `APP_ENV` on a production build is
treated as production, so the seed endpoint stays hidden either way.

Responses carry `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and
`Permissions-Policy` (see `next.config.ts`); HSTS belongs at the TLS terminator.
`GET /api/health` answers `200` while the database responds and `503` otherwise, for
load balancers and uptime checks.

## API

All endpoints live under `/api/v1`, always respond with JSON (including 404s for
unknown `/api` paths), and are rate-limited to 60 requests per minute per client
(per token holder when a bearer token is sent, otherwise per address as reported by the
trusted proxy). Every response reports the budget in `X-RateLimit-Limit`,
`X-RateLimit-Remaining` and `X-RateLimit-Reset`, and is marked `Cache-Control: no-store`
so a shared cache cannot serve one client's listing — or its 429 — to another.

| Method | Path                        | Description                                         |
| ------ | --------------------------- | --------------------------------------------------- |
| GET    | `/api/v1/destinations`      | Paginated catalogue with filtering and sorting      |
| GET    | `/api/v1/destinations/{id}` | A single destination                                |
| POST   | `/api/v1/destinations/seed` | Load/refresh the seed catalogue (not in production) |

### Listing parameters

| Parameter    | Values                                                                               | Default |
| ------------ | ------------------------------------------------------------------------------------ | ------- |
| `search`     | Free text, case-insensitive, matched against name, country, region, activities       | —       |
| `region`     | Region name, e.g. `Asia`                                                             | —       |
| `cost_level` | `Budget`, `Moderate`, `Premium`, `Luxury`                                            | —       |
| `activity`   | Activity name, e.g. `Surfing`                                                        | —       |
| `sort`       | `name`, `country`, `region`, `cost_level`, `average_daily_budget`, `annual_visitors` | `name`  |
| `direction`  | `asc`, `desc`                                                                        | `asc`   |
| `per_page`   | 1–100                                                                                | 15      |
| `page`       | ≥ 1, clamped to `last_page`                                                          | 1       |

Invalid parameters return `422` with per-field errors, and `sort` and `cost_level` are
validated against their allowed values, so they are case-sensitive. Sorting by
`cost_level` follows the price tier (Budget → Luxury), not the alphabet. A `page` beyond
the end returns the last page rather than an empty one, and says so in `meta.current_page`.
`region` matches the way the database compares strings — case-insensitively on MySQL's
default collation, case-sensitively on SQLite — while `activity` is an exact,
element-wise match against the JSON array.

```bash
curl 'http://localhost:3000/api/v1/destinations?region=Europe&sort=average_daily_budget&direction=desc&per_page=5'
curl http://localhost:3000/api/v1/destinations/1
curl -X POST http://localhost:3000/api/v1/destinations/seed
```

Responses use a `data` / `links` / `meta` envelope:

```json
{
  "data": [
    {
      "id": 15,
      "name": "Swiss Alps",
      "country": "Switzerland",
      "region": "Europe",
      "cost_level": "Luxury",
      "activities": ["Skiing & Snowboarding", "Hiking & Trekking", "Rock Climbing", "Photography"],
      "average_daily_budget": 400,
      "annual_visitors": 1200000,
      "created_at": "2026-09-06T12:00:00.000Z",
      "updated_at": "2026-09-06T12:00:00.000Z"
    }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
  "meta": { "current_page": 1, "from": 1, "last_page": 3, "per_page": 5, "to": 5, "total": 15 }
}
```

The seed endpoint upserts the catalogue from `src/db/seed/catalogue.ts` and returns the
catalogue rows; it is idempotent, throttled to 5 calls per minute, and answers `404`
when `APP_ENV=production`, so production does not reveal that the route exists (seed
production with `npm run db:seed` during deployment instead).
