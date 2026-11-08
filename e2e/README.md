# E2E

Playwright covers the critical paths against a real Next.js server and a real
Postgres database.

## Local run

```bash
# 1. Point at a dedicated database, not your dev one.
export DATABASE_URL="postgresql://devdock:devdock@localhost:5432/devdock_e2e?schema=public"
export DEVDOCK_MASTER_KEY="<same key as .env>"

# 2. Apply migrations and build.
npx prisma migrate deploy
npm run build

# 3. Install the browser once, then run.
npm run e2e:install
npm run e2e
```

`e2e/global-setup.ts` reseeds the E2E workflows and the `E2E Target` project
before every run, so the suite is repeatable. It only deletes rows whose names
start with `E2E `.

## What it covers

- `workflow-run.spec.ts`: run a workflow from the editor and see the success in the run history.
- `move-workflow.spec.ts`: move a workflow to another project and see it under that project.
- `connection-crud.spec.ts`: create, edit and delete a connection without ever rendering the stored secret.

## CI

The `e2e` job in `.github/workflows/ci.yml` runs after `checks`, with Postgres
and Redis services. It uploads `test-results/` (traces, screenshots, video) when
it fails.
