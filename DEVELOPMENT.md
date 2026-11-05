# Development

How to run devcadence locally, and how to recover when git and Prisma disagree.

## Quick start

```bash
git clone git@github.com:amLiux/devcadence-ui.git
cd devcadence-ui
npm install     # also generates the Prisma client (postinstall)
make dev        # services + client + migration check + Next.js
```

`make dev` does five things:

1. Creates `.env` from `.env.example` when it is missing.
2. Starts PostgreSQL and Redis with Docker Compose.
3. Regenerates the Prisma client (`npx prisma generate`).
4. Runs the migration doctor (`npm run doctor`): PostgreSQL migrations, Redis reachability and client freshness.
5. Starts Next.js at <http://localhost:3000>.

If the doctor finds a problem it stops before the app starts, with a fix. On a
brand-new database, run `make db-migrate` once first.

## Daily commands

| Command                  | What it does                                 |
| ------------------------ | -------------------------------------------- |
| `make dev`               | Services + client + doctor + dev server      |
| `make doctor`            | Client and migration check, no side effects  |
| `make env-init`          | Create `.env` from `.env.example` if missing |
| `make db-migrate`        | Create/apply migrations during development   |
| `make db-migrate-deploy` | Apply existing migrations (no new ones)      |
| `make db-reset`          | Drop and recreate the local database         |
| `make up`                | Everything, including the BullMQ worker      |
| `npm run test:unit`      | Unit tests                                   |
| `npm run typecheck`      | TypeScript                                   |
| `npm run lint`           | ESLint                                       |

`npm run dev` and `npm run build` also regenerate the Prisma client through
their `predev` / `prebuild` hooks, so a branch switch cannot leave a stale
client behind.

## Why the doctor exists

Two failures cost hours during the projects work (2026-11-04):

- Switching from the projects branch to the notifications branch left the
  generated Prisma client from the other branch. Pages compiled, then returned
  `500` because the client did not know the new models.
- A migration from an unmerged branch had been applied to the local database.
  `prisma migrate dev` refused to run because the database had a migration that
  the current branch did not contain.

Both are branch/database drift, not application bugs. `make doctor` catches
them before the server starts.

## Migration drift

The doctor compares the migration folders in `prisma/migrations` with the rows
in `_prisma_migrations`:

| State                        | Meaning                                     | Fix                                                |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Database behind the branch   | Folders exist that are not applied          | `make db-migrate`                                  |
| Database ahead of the branch | Applied migrations have no folder here      | See below                                          |
| Failed migration             | `finished_at` is null or it was rolled back | `npx prisma migrate status`, then resolve or reset |

When the database is **ahead of the branch**, `prisma migrate dev` refuses to
run. Pick one:

1. **Switch back** to the branch that owns those migrations. This is the right
   choice when you are only visiting another branch.
2. **Reset the local database** when the extra migrations are obsolete:

   ```bash
   make db-reset
   make db-migrate-deploy
   ```

   This destroys local data.

3. **Keep the data and drop an obsolete migration**: if the migration is
   obsolete and its leftover changes are harmless (for example an index that is
   never used), remove its row:

   ```bash
   make db-shell
   DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';
   ```

4. **Keep the data and register the migration**: restore its folder in the
   branch (from the original branch or PR), then:

   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

Never apply a migration from an unmerged branch to a database you care about.
If you need to test an unmerged branch, point `DATABASE_URL` at a separate
database.

## Other doctor warnings

- `⚠ Redis: cannot reach ...` — Redis is down. Run `make redis-up`. The UI still
  loads, but queues, schedules and workflow runs need Redis.
- `⚠ The Prisma client is older than prisma/schema.prisma` — run
  `npx prisma generate`. `make dev`, `npm run dev` and `npm run build` do it for
  you.

## Branch switch checklist

```bash
git switch <branch>
make doctor    # or just make dev, which runs it for you
```

If the doctor is green, the client matches the code and the database matches
the migrations. If it is not, fix that before debugging application code.

## Tests

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run build
```

CI runs the same commands on every PR, plus `prisma migrate deploy` and the
doctor against a real PostgreSQL service, so a broken migration fails before
merge.
