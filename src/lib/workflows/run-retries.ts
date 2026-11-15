/**
 * Retry orchestration: reads the run chain, applies the pure policy from
 * `retry.ts` and creates the linked run rows.
 *
 * Execution is left to the caller so this module stays free of the queue and of
 * Next.js request objects, which keeps it testable.
 */
import { prisma } from "@/lib/db";
import { canRetryRun, planAutoRetry, type FailureInput } from "./retry";
import { getRetryPolicy } from "./retry-store";

/** Sources whose runs can be replayed from their stored trigger payload. */
const REPLAYABLE_SOURCES = new Set(["manual", "schedule", "webhook", "discord-listen", "gmail-listen"]);

const MAX_CHAIN_WALK = 100;

export interface RetryChain {
  length: number;
  lastRetryAt: number | null;
}

export interface ManualRetryOutcome {
  ok: true;
  runId: string;
  attempt: number;
  source: string;
  body: unknown;
}

export interface ManualRetryFailure {
  ok: false;
  status: number;
  error: string;
}

export interface AutoRetryOutcome {
  runId: string;
  attempt: number;
  nextRetryAt: Date;
}

/** Walks up `retryOfRunId` and returns how many runs the chain has so far. */
export async function loadRetryChainLength(runId: string): Promise<number> {
  let length = 1;
  const seen = new Set([runId]);
  let cursor = await prisma.workflowRun.findUnique({
    where: { id: runId },
    select: { retryOfRunId: true },
  });

  while (cursor?.retryOfRunId && length < MAX_CHAIN_WALK) {
    if (seen.has(cursor.retryOfRunId)) break;
    seen.add(cursor.retryOfRunId);
    length++;
    cursor = await prisma.workflowRun.findUnique({
      where: { id: cursor.retryOfRunId },
      select: { retryOfRunId: true },
    });
  }

  return length;
}

/** Timestamp of the newest direct retry of this run, used by the cooldown. */
export async function getLastRetryAt(runId: string): Promise<number | null> {
  const last = await prisma.workflowRun.findFirst({
    where: { retryOfRunId: runId },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  return last ? last.startedAt.getTime() : null;
}

/**
 * Validates a manual retry and creates the linked run in `queued` state.
 * The caller executes it (the retry endpoint does so inline).
 */
export async function retryRunManually(
  workflowId: string,
  runId: string,
  now = Date.now(),
): Promise<ManualRetryOutcome | ManualRetryFailure> {
  const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
  if (!run || run.workflowId !== workflowId) {
    return { ok: false, status: 404, error: "Run not found" };
  }
  if (!REPLAYABLE_SOURCES.has(run.source)) {
    return { ok: false, status: 409, error: `${run.source} runs cannot be retried` };
  }

  const chainLength = await loadRetryChainLength(runId);
  const lastRetryAt = await getLastRetryAt(runId);
  const policy = await getRetryPolicy();
  const decision = canRetryRun({ status: run.status, chainLength, lastRetryAt }, now, {
    cooldownMs: policy.manualCooldownMs,
    maxChain: policy.maxChain,
  });
  if (!decision.allowed) {
    return { ok: false, status: 409, error: decision.reason };
  }

  const retry = await prisma.workflowRun.create({
    data: {
      workflowId,
      source: run.source,
      triggerPayload: run.triggerPayload ?? undefined,
      attempt: run.attempt + 1,
      retryOfRunId: run.id,
      status: "queued",
    },
  });

  return {
    ok: true,
    runId: retry.id,
    attempt: retry.attempt,
    source: retry.source,
    body: retry.triggerPayload,
  };
}

/**
 * Applies the automatic policy to a failed run. Returns the created run when
 * another attempt is due, `null` when the chain must stop.
 */
export async function scheduleAutoRetry(
  runId: string,
  failure: FailureInput,
): Promise<AutoRetryOutcome | null> {
  const run = await prisma.workflowRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "error") return null;
  if (!REPLAYABLE_SOURCES.has(run.source)) return null;

  const policy = await getRetryPolicy();
  const plan = planAutoRetry({
    attempt: run.attempt,
    failure,
    maxAttempts: policy.maxAttempts,
    baseDelayMs: policy.baseDelayMs,
    enabled: policy.enabled,
  });
  if (!plan.retry || plan.nextAttempt === null || plan.delayMs === null) return null;

  const nextRetryAt = new Date(Date.now() + plan.delayMs);
  const retry = await prisma.workflowRun.create({
    data: {
      workflowId: run.workflowId,
      source: run.source,
      triggerPayload: run.triggerPayload ?? undefined,
      attempt: plan.nextAttempt,
      retryOfRunId: run.id,
      status: "queued",
      nextRetryAt,
    },
  });

  return { runId: retry.id, attempt: retry.attempt, nextRetryAt };
}
