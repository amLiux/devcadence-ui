# Spike: Developer Experience and Quality Improvements

**Ticket:** `dd-74`  
**Date:** 2026-10-30  
**Status:** Completed — recommendations approved, follow-up tickets created.

---

## Goal

Audit the current developer experience (DX) for the devdock repo, identify the highest-ROI pain points, and recommend a small set of concrete improvements that make the codebase safer and easier to ship.

---

## Audit method

- Inspected `package.json`, `Makefile`, `docker-compose.yml`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `README.md`.
- Searched for GitHub Actions / CI workflows.
- Searched the test suite (`src/**/*.test.{ts,tsx}`).
- Searched Prisma migrations.
- Ran `npm run lint`, `npm run typecheck`, and `npm run test:unit` on `main` at commit `2eaa2d2`.

---

## Current state

### What works well

| Area | State | Notes |
|---|---|---|
| Local orchestration | Good | `Makefile` covers DB, Redis, worker, dev server, migrations, and the new `dev-and-worker` target. `docker-compose.yml` has healthchecks for Postgres and Redis. |
| README | Good | Clear quick-start, stack overview, deployment options, and contribution guide. |
| Test framework | Set up | Vitest + React Testing Library + jsdom configured; mocks for `next/image` and `next/navigation` in place. |
| Prisma migrations | Manageable | 9 migrations; latest (`add_trigger_state`) landed cleanly. |

### Pain points found

#### 1. No CI / quality gate

- **Finding:** `.github/workflows/` does not exist. Nothing runs lint, typecheck, or tests on PRs or pushes.
- **Impact:** Bad code can reach `main`. Recent merge of `dd-65` passed tests but still has typecheck errors and lint errors (see below).
- **Evidence:** `git log` shows PRs #14–#19 merged without automated checks.

#### 2. Lint and typecheck are red on `main`

- **Lint:** `npm run lint` reports **68 problems (56 errors, 12 warnings)**.
  - `src/lib/workflows/execute-node.ts`: 4 `no-explicit-any` errors.
  - `src/lib/workflows/nodes/ai.ts`: 2 `no-unused-vars` errors.
  - `src/lib/workflows/execute-node.ts`, `src/lib/queue.ts`, `src/worker.ts`: multiple `no-console` warnings.
  - `src/app/(main)/(pages)/docs/components/docs-context.tsx`: `react-hooks/set-state-in-effect` warning.
  - `src/lib/workflows/nodes/webhook.ts`: unused `eslint-disable` directive warning.
- **Typecheck:** `npm run typecheck` reports **2 errors** in the newly merged test file:
  - `editor-canvas-sidebar.test.tsx(86,9)`: missing `completed`, `current`, `metadata` properties on a mock `EditorNodeData`.
  - `editor-canvas-sidebar.test.tsx(155,24)`: `DragEvent<Element>` not assignable to `Event`.

- **Impact:** Local feedback loop is broken. Every future PR will carry these errors unless fixed first, making it harder to spot new regressions.

#### 3. Test coverage is tiny and config has a warning

- **Finding:** Only **1 test file** with **7 tests** (sidebar categories). Critical paths — workflow execution, node handlers, connection CRUD, API routes — are untested.
- **Vitest warning:** `vitest.config.ts` is loaded as CommonJS despite ESM syntax. Vite recommends renaming to `.mjs` or adding `"type": "module"`.
- **Impact:** High risk of regressions in the workflow engine; new contributors have no examples for testing business logic.

#### 4. `Makefile` has a small inconsistency

- **Finding:** `make up` duplicates the `concurrently` command instead of reusing the new `dev-and-worker` target. The local `Makefile` change the user kept adds `dev-and-worker`; `up` should probably depend on it.
- **Impact:** Minor duplication, easy win.

---

## Recommendations (ranked by ROI)

### 1. Add a GitHub Actions CI workflow — highest ROI

**What:** Run `npm run lint`, `npm run typecheck`, and `npm run test:unit` on every PR and push to `main`.

**Why it wins:**
- Stops broken code from merging.
- Forces the repo into a green state (which unblocks every other improvement).
- ~30 minutes of setup, pays off on every future PR.

**Follow-up ticket:** `dd-75`

---

### 2. Fix lint + typecheck errors on `main`

**What:** Address the 56 lint errors and 2 typecheck errors. Most are mechanical:
- Replace `any` in `execute-node.ts` with proper types or narrow `unknown`.
- Remove unused `NODE_INSTRUCTIONS` / `fields` in `ai.ts`.
- Fix test mock data in `editor-canvas-sidebar.test.tsx`.
- Resolve `DragEvent` type mismatch (use `@testing-library/react` fire-event or correct event type).

**Why it wins:**
- Unblocks CI; makes local `make lint` / `npm run typecheck` trustworthy again.
- Low-risk cleanup with immediate signal-to-noise improvement.

**Follow-up ticket:** `dd-76`

---

### 3. Expand unit tests for critical paths and fix Vitest config

**What:**
- Rename `vitest.config.ts` → `vitest.config.mjs` (or set `"type": "module"`) to remove the ESM warning.
- Add focused tests for:
  - Workflow execution helpers (`src/lib/workflows/execute-node.ts`, `src/lib/workflow-context.ts`).
  - Node handlers with pure logic (Transform Data, Conditional, HTTP Request URL/body templating).
  - Connection API validation (Zod schemas / route handlers).
- Keep tests fast and deterministic (mock external APIs).

**Why it wins:**
- Prevents regressions in the engine, which is the core differentiator.
- Gives contributors a pattern to follow.

**Follow-up ticket:** `dd-77`

---

### Optional nice-to-haves (defer)

| Idea | Value | Effort | Suggested timing |
|---|---|---|---|
| Pre-commit hooks (`lint-staged` + Husky) | Catches issues before push | Low | After CI is green |
| Storybook for UI components | Visual regression + docs | Medium | After test coverage grows |
| Coverage thresholds in CI | Enforces test discipline | Low | After dd-77 |
| `make up` reuses `dev-and-worker` | Removes duplication | Trivial | Any chore PR |

---

## Decision

Proceed with the top 3 recommendations in order:

1. `dd-75` — GitHub Actions CI  
2. `dd-76` — Lint + typecheck cleanup  
3. `dd-77` — Unit test expansion + Vitest config fix  

Expected outcome: every future PR has a green, fast quality gate; `main` stays shippable; contributors have a clear testing pattern.
