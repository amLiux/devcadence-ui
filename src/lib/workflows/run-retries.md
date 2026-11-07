# Run retries

How a failed workflow run is retried, and why the policy lives in the database
instead of in BullMQ.

## Current behavior (before this change)

- `WorkflowRun` records one row per execution. It has no attempt number, no link
  to a previous attempt and no next-retry timestamp.
- The BullMQ job in `src/lib/queue.ts` is created with `attempts: 3` and
  exponential backoff, but `executeWorkflow` **resolves** with
  `{ success: false }` when a node fails. BullMQ only retries a job whose
  processor throws, so node failures never retry. Only unexpected exceptions do.
- Jobs added by `src/lib/scheduler.ts` have no `attempts` or `backoff` at all.
- Webhooks execute inline in `src/app/api/webhooks/[connectionId]/route.ts` and
  never touch the queue.
- Sub-workflow runs execute inline in
  `src/app/api/workflows/execute-sub-workflow/route.ts`.
- `enqueueWorkflow` in `src/lib/queue.ts` has no callers.

The net result: there is no retry policy in practice, and no way to tell a dead
letter from a single failed run.

## Decision

Retries are a property of a **run**, not of a queue job.

- Every execution creates a `WorkflowRun`. A retry creates a new run linked with
  `retryOfRunId`; history is never mutated.
- One shared service decides and creates retries, so the queue, the inline
  webhook path and sub-workflows behave the same.
- BullMQ stays as transport only. Its `attempts` option is not used for workflow
  failures; it may still cover infrastructure exceptions raised before a run
  exists.
- The policy is pure code in `src/lib/workflows/retry.ts` and is unit tested
  without Redis or Postgres.

## Schema

`WorkflowRun` gains:

| Field | Meaning |
|---|---|
| `attempt` | 1 for the original run, N for the Nth attempt in the chain |
| `retryOfRunId` | The run this one retries, `null` for originals |
| `nextRetryAt` | When the next automatic attempt is due, `null` when none |

## Automatic retries

Attempts: **3 total** (original + 2 retries). Backoff: exponential, base 2s,
factor 4, capped at 5 minutes, with +/-20% jitter.

| Attempt | Base delay |
|---|---|
| 2 | 2s |
| 3 | 8s |
| 4 | 32s |
| 5+ | capped at 5 min |

Retryable failures:

- HTTP 408, 425, 429
- HTTP 5xx
- Network codes: `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EAI_AGAIN`,
  `ENOTFOUND`, `EPIPE`, undici timeout codes
- Messages that clearly describe a timeout, network problem or rate limit

Permanent failures:

- HTTP 4xx other than the ones above
- Validation, schema, template and parse errors
- Missing credentials, tokens or connections
- Anything unknown

Unknown failures are permanent on purpose. Retrying blindly is how a broken
workflow becomes an unbounded loop.

## Manual retries

A failed run can be retried from the run view. Manual retries:

- are **not** gated by the failure class, because the operator may have fixed
  the configuration;
- create a new run linked to the original, never mutate it;
- are throttled per chain:
  - one manual retry per run every 30 seconds
  - maximum chain length of 10 runs

Manual retries replay the payload stored on the original run. Webhook payloads
are stored sanitized, so a retry that depended on a redacted secret in the body
must be re-triggered from the source instead.

The throttle exists to stop a click loop from creating unbounded runs.

## Entry points

All of these go through the shared retry service:

- queue worker (`src/lib/queue.ts`)
- inline webhook execution (`src/app/api/webhooks/[connectionId]/route.ts`)
- sub-workflow execution (`src/app/api/workflows/execute-sub-workflow/route.ts`)
- manual retry endpoint

Test runs (`test-node`, `test-workflow`) are excluded: they are interactive and
already report errors to the caller.

## Out of scope

- Per-workflow retry configuration in the UI.
- Retrying a single failed node in place.
- Alerting changes; failure notifications keep working as they do today.
