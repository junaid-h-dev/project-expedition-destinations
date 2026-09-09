# Project Expedition — Destination Explorer

A small Next.js 16 (App Router) + TypeScript application for browsing the travel
destinations Project Expedition offers, with a JSON API alongside the UI.

The destinations are still the prototype's hardcoded list; Section 2 moves them
into the database.

The original candidate brief lives in [`ASSIGNMENT.md`](ASSIGNMENT.md); design notes,
trade-offs and open questions are in [`DISCUSSION.md`](DISCUSSION.md).

## Requirements

- Node.js 20.9+ and npm
- Docker (for the MySQL service in `docker-compose.yml`)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev                   # or: npm start (after npm run build)
```

Then open <http://localhost:3000>.

## Development workflow

| Command                | What it does                                           |
| ---------------------- | ------------------------------------------------------ |
| `npm run check`        | Lint, format check, type check and tests (the CI gate) |
| `npm run lint`         | ESLint (Next.js rules + React hooks)                   |
| `npm run format:check` | Prettier in check mode (`npm run format` to apply)     |
| `npm run typecheck`    | `next typegen` + `tsc --noEmit` (strict TypeScript)    |
| `npm test`             | Vitest: server suites in Node, UI suites in jsdom      |

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and push to `main`: lint,
format, type check, `npm audit`, the production build and the test suite.
Dependabot keeps npm packages and the Actions current.
