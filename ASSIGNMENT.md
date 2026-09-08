## Project Expedition - JavaScript Candidate Assignment

> Original brief, kept for reference. The project README describes the
> application as it is now.

## Guidelines

- **Time** — Please limit yourself to 3-4 hours of focused work. We want to see what you can accomplish in a realistic window, not how many hours you can pour in. Use `DISCUSSION.md` to document your thought process, any tradeoffs you made, and questions or comments you have about this assessment.

- **AI Tools** — Please refrain from using AI-assisted coding tools for this assignment. Project Expedition is an AI-forward company and we use these tools daily. However, we also value deep understanding. In order to properly assess your skills, there will be a short live coding exercise during the technical interview where we'll explore your work together.

---

This is a [Next.js](https://nextjs.org/) project (App Router) using [React](https://react.dev/) Server and Client Components with TypeScript.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm start
```

## Database Setup

The app is configured to return a default list of destinations from hardcoded data. This will allow you to get the app up and running without needing to configure a database. If you'd like to configure a database, you're encouraged to do so. You can uncomment the database connection in `.env` and the database query in `src/components/DestinationExplorer.tsx` to retrieve destinations from the database.

1. A `docker-compose.yml` is provided for MySQL. Start it with:

```bash
docker compose up -d
```

2. Uncomment the MySQL connection settings in `.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pe_destinations
DB_USERNAME=laravel
DB_PASSWORD=password
```

3. Run migrations:

```bash
npm run db:migrate
```

4. Seed the database:

```bash
npm run db:seed
```

Or use the API endpoint:

```bash
curl -X POST http://localhost:3000/api/seed
```

---

## Assignment

This app is a simple tool for browsing travel destinations offered by Project Expedition. The current implementation works — or at least it appears to — but the codebase has issues across every layer. Your job is to take this from a rough prototype to something you'd be comfortable shipping to production.

Use a **branch-per-section** workflow. Create a new branch for each section below and open a PR (or be ready to walk through your commits).

### Section 1: Project Setup

Set up the development infrastructure a real project needs. What you choose to include — and what you leave out — will matter.

### Section 2: Database & API

The app currently relies on hardcoded data. Make it real — connect it to the database, and make the API endpoints production-worthy.

### Section 3: User Interface

The `DestinationExplorer` component has problems. Review it thoroughly — there are bugs, code quality issues, and UX shortcomings throughout. Fix what you find and improve the overall component architecture.

### Section 4: Authentication (Bonus)

The API currently has no access control. Add appropriate protections.

### DISCUSSION.md

As you work, keep notes in `DISCUSSION.md`. We want to understand your thought process:

- What tradeoffs did you make and why?
- What would you do differently with more time?
- Any architectural decisions worth calling out?

This is as important as the code. We want to see how you think.

---

## What We're Looking For

- **Code quality** — Clean, readable, well-organized code.
- **Problem-solving** — Can you identify issues and fix them thoughtfully?
- **Full-stack thinking** — Comfortable across the database, API, and UI layers.
- **Next.js & TypeScript proficiency** — Proper use of the App Router, Server and Client Components, Route Handlers, the data layer, and Node/TypeScript conventions.
- **Communication** — Your DISCUSSION.md and commit messages tell us how you work.

Good luck. Show us what you've got.

---

## Submission

When you are finished, please submit one of the following:

1. A **zip file** of your completed project
2. A **link to your GitHub repo**

Please send your submission to:

- steve@projectexpedition.com
- eunice@projectexpedition.com
