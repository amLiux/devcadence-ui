# devdock

> An open-source admin dashboard for managing multiple repos, connections, and workflow automation — built for devs who ship.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)

---

## Vision

devdock is a **self-hosted, batteries-included operations dashboard** for individual developers and small teams. Instead of stitching together GitHub, webhooks, cron jobs, email alerts, and notification bots across a dozen SaaS tools, devdock gives you one place to wire them together visually.

Think of it as **Zapier + a GitHub dashboard that runs on your own server** — no per-seat pricing, no workflow limits, no vendor lock-in.

### Why devdock?

- **Free to host** — runs on a cheap VPS, your laptop, or any container platform
- **Visual workflow editor** — drag-and-drop nodes with a ReactFlow canvas
- **GitHub-native** — repos, commits, PRs, issues, labels, comments, actions
- **Connection-first** — plug in SMTP, PostgreSQL, Discord, Slack, Gmail, AI providers, webhooks
- **Async by default** — BullMQ + Redis handle long-running workflows reliably
- **Open source** — own your data and extend it however you want

---

## Features

### Dashboard

- Multi-repo overview
- Connection management (GitHub, SMTP, PostgreSQL, Discord, Slack, Gmail, AI, Webhooks)
- Workflow library and editor

### Workflow Editor

- **ReactFlow-powered** canvas with nodes and edges
- **Node types**:
  - **Triggers**: Webhook, Schedule, Listen Commits/PRs/Issues/Comments/Releases, Listen Discord Messages
  - **Actions**: Create Issue, Add Comment, Add Label, Request Review, HTTP Request, Transform Data, Send Email, Send Discord Message, Send Slack Message, PostgreSQL Query/Insert/Update/Delete, AI Prompt/Classify/Extract
  - **Logic**: Conditional, Array Iterator, Retry Loop, Call Workflow
- **Context flow**: each step receives output from the previous step via `previousStep` and named outputs
- **Testing**: test individual nodes or entire workflows with a built-in debug modal
- **Scheduling + workers**: cron triggers run through BullMQ workers

### Connections

Connect to external services once, reuse them across workflows:

- **GitHub** — personal access token
- **SMTP** — any email provider + MailHog for local testing
- **PostgreSQL** — query your own databases
- **Discord** — bot token
- **Slack** — bot token
- **Google** — one OAuth2 authorization for Gmail, Calendar, Drive, Sheets and Docs (see `/docs/google-oauth` in the app)
- **AI providers** — OpenAI, Claude, and OpenAI-compatible APIs
- **Webhooks** — incoming endpoints with HMAC verification

---

## Tech Stack

| Layer       | Tech                                     |
| ----------- | ---------------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19       |
| Language    | TypeScript 5                             |
| Styling     | Tailwind CSS v4 + shadcn/ui + Geist font |
| Database    | PostgreSQL + Prisma 7                    |
| Queue/Cache | Redis + BullMQ                           |
| Canvas      | @xyflow/react (ReactFlow)                |
| Validation  | Zod + AJV                                |
| Charts      | Recharts                                 |
| DevOps      | Docker Compose + Makefile                |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 26+
- [Docker](https://www.docker.com/) or Podman with Compose (for PostgreSQL + Redis + MailHog)
- [npm](https://www.npmjs.com/) or compatible package manager

### 1. Clone and install

```bash
git clone git@github.com:amLiux/devcadence-ui.git
cd devcadence-ui
npm install
```

### 2. Start the backing services

```bash
make compose-up
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MailHog on `localhost:8025` (SMTP UI) and `localhost:1025` (SMTP server)

### 3. Configure environment

```bash
cp .env.example .env   # or: make env-init
```

The defaults point at the Docker services from step 2. Add real secrets through
the UI, or in `.env` for local development.

> ⚠️ `.env*` files are gitignored; `.env.example` is the tracked template.
> Never commit secrets.

Sign-in is optional. To delegate authentication to an OpenID Connect provider
(Hortus Clavis, Entra ID, Keycloak, Authentik…), see [`AUTH.md`](./AUTH.md).

### 4. Set up the database

```bash
make db-migrate   # first run only; make dev tells you if migrations are pending
```

### 5. Run the app

```bash
make dev
```

`make dev` starts PostgreSQL and Redis, regenerates the Prisma client, checks
that the database matches the migrations, and then starts Next.js. See
[DEVELOPMENT.md](DEVELOPMENT.md) for the migration doctor and the recovery
recipes.

Open [http://localhost:3000](http://localhost:3000).

To also run the workflow worker:

```bash
make worker
# or, in another terminal
make up   # starts services + dev server + worker together
```

---

## Development

### Makefile commands

```bash
make help           # Show all available commands
make compose-up     # Start PostgreSQL + Redis + MailHog
make compose-down   # Stop all services
make dev            # Services + client + migration check + dev server
make doctor         # Check the Prisma client and migrations match this branch
make env-init       # Create .env from .env.example when missing
make worker         # Start BullMQ worker
make up             # Start services + dev server + worker
make build          # Production build
make lint           # Run ESLint
make format         # Run Prettier
make db-migrate     # Run Prisma migrations
make db-studio      # Open Prisma Studio
make db-reset       # ⚠️ Drop and recreate DB
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the migration doctor, branch-switch
checklist and recovery steps.

### Project structure

```text
src/
  app/              # Next.js App Router pages and API routes
  components/       # React components (ui + composed)
  lib/              # Utilities, DB, workflow engine, node handlers
  hooks/            # Custom React hooks
  providers/        # Context providers
prisma/             # Prisma schema and migrations
scripts/            # Developer tooling (migration doctor)
```

### Key entry points

- `src/app/layout.tsx` — root layout with theme + font providers
- `src/app/(main)/layout.tsx` — main app shell (sidebar + info bar)
- `src/app/api/workflows/` — workflow CRUD, test, and execution APIs
- `src/lib/workflows/` — workflow engine, node registry, and execution logic
- `src/lib/queue.ts` — BullMQ queue setup
- `src/worker.ts` — long-running workflow worker

---

## Deployment

Self-hosting on a small VPS is the primary path: one Compose project, Postgres,
Redis, the Next.js app and the BullMQ worker. The full runbook lives in
[docs/self-hosting.md](docs/self-hosting.md).

```bash
cp .env.example .env && chmod 600 .env
# edit .env: DATABASE_URL, REDIS_URL, NEXT_PUBLIC_APP_URL,
# DEVDOCK_MASTER_KEY, AUTH_MODE, AUTH_SECRET
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```

The guide covers:

- Minimum host and DNS/TLS with Caddy.
- Required environment variables and secret generation.
- First admin setup for OIDC, Hortus API mode or a single-user install.
- Postgres/Redis persistence, nightly backups and a restore drill.
- Upgrade and rollback order (migrations before the new app).
- Security checklist: public ports, secret handling, rate limiting, backups.

Authentication details are in [AUTH.md](AUTH.md). "Bring your own IdP" is
documented in the app at `/docs/byo-idp`.

### Optional: managed platforms

Railway, Render and Fly.io are fine for the web process, but the worker must run
as a **separate service** from the same image. Vercel alone is not enough
because BullMQ needs a long-running process. Managed Postgres/Redis still need a
backup and restore plan.

---

## Workflow Concepts

### Context

Each workflow run carries a context object. Nodes read from `previousStep` and write their output for the next node:

```text
{{previousStep.subject}}
{{previousStep.items[0].id}}
```

### Named outputs

Nodes can expose named outputs for cleaner expressions:

```text
{{email.id}}
{{commit.sha}}
```

### Conditional routing

The Conditional node has two output handles:

- 🟢 **Yes** — expression evaluated truthy
- 🔴 **No** — expression evaluated falsy

### Templates

Text fields support Mustache-style templates:

```text
Hello {{previousStep.name}}, your issue #{{issue.number}} is ready.
```

---

## Status

devdock is under active development. Core systems are in place:

- ✅ Workflow editor + execution engine
- ✅ GitHub connection + triggers/actions
- ✅ SMTP, PostgreSQL, Discord, Slack nodes
- ✅ BullMQ + Redis async execution
- ✅ Conditional, iterator, retry-loop logic
- 🚧 Gmail / Calendar / Drive / Sheets / Docs nodes
- ✅ Google OAuth2 connection + self-hosted setup guide (`/docs/google-oauth`)
- 🚧 AI provider abstraction + AI nodes
- 🚧 Workflow templates library

See `progress.json` and `docs/` for detailed session history and testing guides.

---

## Contributing

Contributions are welcome. The project uses:

- ESLint + Prettier for code style
- TypeScript strict checks
- Prisma for database migrations
- Conventional commit messages

To contribute:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `make lint` and `npm run typecheck`
5. Open a pull request

Please keep PRs focused and include tests or screenshots where applicable.

---

## License

[MIT](LICENSE)

---

## Acknowledgments

Built with [Next.js](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com), [ReactFlow](https://reactflow.dev), [Prisma](https://prisma.io), and [BullMQ](https://bullmq.io).
