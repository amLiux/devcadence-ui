import {
  bucketStart,
  bucketStarts,
  deltaPct,
  percentile,
  rangeWindow,
  successRate,
} from "./format";
import type {
  DashboardFailingNode,
  DashboardSource,
  DashboardStats,
  DashboardVolumePoint,
  DashboardWorkflowHealth,
} from "./types";
import type { DashboardRange } from "./types";

export interface RunRow {
  workflowId: string;
  status: string;
  source: string;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
}

export interface ErrorLogRow {
  nodeType: string;
  error: string | null;
  startedAt: Date;
}

export interface WorkflowRow {
  id: string;
  name: string;
}

export interface AggregateInput {
  range: DashboardRange;
  now: Date;
  runs: RunRow[];
  previousRuns: RunRow[];
  aiTokens: number;
  previousAiTokens: number;
  errorLogs: ErrorLogRow[];
  workflows: WorkflowRow[];
}

function durations(runs: RunRow[]): number[] {
  const values: number[] = [];

  for (const run of runs) {
    if (!run.finishedAt) continue;
    const ms = run.finishedAt.getTime() - run.startedAt.getTime();
    if (ms >= 0) values.push(ms);
  }

  return values;
}

function countByStatus(runs: RunRow[], status: string): number {
  return runs.filter((run) => run.status === status).length;
}

function buildVolume(runs: RunRow[], from: Date, to: Date, range: DashboardRange): DashboardVolumePoint[] {
  const buckets = new Map<string, { success: number; error: number }>();

  for (const start of bucketStarts(from, to, range)) {
    buckets.set(start.toISOString(), { success: 0, error: 0 });
  }

  for (const run of runs) {
    const key = bucketStart(run.startedAt, range).toISOString();
    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (run.status === "success") bucket.success += 1;
    if (run.status === "error") bucket.error += 1;
  }

  return [...buckets.entries()].map(([bucket, counts]) => ({ bucket, ...counts }));
}

function buildSources(runs: RunRow[]): DashboardSource[] {
  const counts = new Map<string, number>();
  for (const run of runs) counts.set(run.source, (counts.get(run.source) ?? 0) + 1);

  return [...counts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

function buildFailingNodes(errorLogs: ErrorLogRow[]): DashboardFailingNode[] {
  const byNode = new Map<string, { failures: number; lastError: string | null; lastFailedAt: Date }>();

  for (const log of errorLogs) {
    const current = byNode.get(log.nodeType);

    if (!current) {
      byNode.set(log.nodeType, {
        failures: 1,
        lastError: log.error,
        lastFailedAt: log.startedAt,
      });
      continue;
    }

    current.failures += 1;
    if (log.startedAt > current.lastFailedAt) {
      current.lastFailedAt = log.startedAt;
      current.lastError = log.error;
    }
  }

  return [...byNode.entries()]
    .map(([nodeType, value]) => ({
      nodeType,
      failures: value.failures,
      lastError: value.lastError,
      lastFailedAt: value.lastFailedAt.toISOString(),
    }))
    .sort((a, b) => b.failures - a.failures || a.nodeType.localeCompare(b.nodeType));
}

function buildWorkflowHealth(
  runs: RunRow[],
  workflows: WorkflowRow[],
): DashboardWorkflowHealth[] {
  const names = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));
  const grouped = new Map<string, RunRow[]>();

  for (const run of runs) {
    const list = grouped.get(run.workflowId);
    if (list) list.push(run);
    else grouped.set(run.workflowId, [run]);
  }

  const health: DashboardWorkflowHealth[] = [];

  for (const [workflowId, workflowRuns] of grouped) {
    const successes = countByStatus(workflowRuns, "success");
    const errors = countByStatus(workflowRuns, "error");
    const last = workflowRuns.reduce((latest, run) =>
      run.startedAt > latest.startedAt ? run : latest,
    );

    health.push({
      id: workflowId,
      name: names.get(workflowId) ?? "Deleted workflow",
      runs: workflowRuns.length,
      successRate: successRate(successes, successes + errors),
      p95DurationMs: percentile(durations(workflowRuns), 0.95),
      lastRunAt: last.startedAt.toISOString(),
      lastStatus: last.status,
      lastError: last.error,
    });
  }

  return health.sort((a, b) => {
    const rateA = a.successRate ?? Number.POSITIVE_INFINITY;
    const rateB = b.successRate ?? Number.POSITIVE_INFINITY;
    return rateA - rateB || b.runs - a.runs || a.name.localeCompare(b.name);
  });
}

/**
 * Turns raw rows into the dashboard payload. Pure on purpose: the queries live
 * in stats.ts, so the metric math can be tested without a database.
 *
 * `runs` must already exclude test runs, which are dev-time noise.
 */
export function aggregateDashboard(input: AggregateInput): DashboardStats {
  const { range, now, runs, previousRuns, aiTokens, previousAiTokens, errorLogs, workflows } = input;
  const { from, to, previousFrom, previousTo } = rangeWindow(range, now);

  const successes = countByStatus(runs, "success");
  const errors = countByStatus(runs, "error");
  const rate = successRate(successes, successes + errors);

  const previousSuccesses = countByStatus(previousRuns, "success");
  const previousErrors = countByStatus(previousRuns, "error");
  const previousRate = successRate(previousSuccesses, previousSuccesses + previousErrors);

  const p95 = percentile(durations(runs), 0.95);
  const previousP95 = percentile(durations(previousRuns), 0.95);

  return {
    range,
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
    },
    kpis: {
      runs: {
        value: runs.length,
        previous: previousRuns.length,
        deltaPct: deltaPct(runs.length, previousRuns.length),
      },
      successRate: {
        value: rate,
        previous: previousRate,
        deltaPp: rate !== null && previousRate !== null ? rate - previousRate : null,
      },
      p95DurationMs: {
        value: p95,
        previous: previousP95,
        deltaPct: p95 !== null && previousP95 !== null ? deltaPct(p95, previousP95) : null,
      },
      aiTokens: {
        value: aiTokens,
        previous: previousAiTokens,
        deltaPct: deltaPct(aiTokens, previousAiTokens),
      },
      running: countByStatus(runs, "running"),
    },
    volume: buildVolume(runs, from, to, range),
    sources: buildSources(runs),
    failingNodes: buildFailingNodes(errorLogs),
    workflows: buildWorkflowHealth(runs, workflows),
  };
}
