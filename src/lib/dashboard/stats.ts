import { prisma } from "@/lib/db";
import { aggregateDashboard, type ErrorLogRow, type RunRow } from "./aggregate";
import { rangeWindow } from "./format";
import type { DashboardRange, DashboardStats } from "./types";

const AI_NODE_TYPES = ["Prompt", "Classify", "Extract"];

/** Test runs are dev-time noise, so the dashboard tracks real executions only. */
const PRODUCTION_ONLY = { not: "test" } as const;

function sumTokens(logs: { meta: unknown }[]): number {
  let total = 0;

  for (const log of logs) {
    if (!log.meta || typeof log.meta !== "object") continue;
    const tokens = (log.meta as Record<string, unknown>).ai_tokens;
    if (typeof tokens === "number" && Number.isFinite(tokens)) total += tokens;
  }

  return total;
}

export async function getDashboardStats(
  range: DashboardRange,
  now: Date = new Date(),
): Promise<DashboardStats> {
  const { from, to, previousFrom, previousTo } = rangeWindow(range, now);

  const [runs, previousRuns, aiLogs, previousAiLogs, errorLogs, workflows] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { startedAt: { gte: from, lt: to }, source: PRODUCTION_ONLY },
      select: {
        workflowId: true,
        status: true,
        source: true,
        startedAt: true,
        finishedAt: true,
        error: true,
      },
      orderBy: { startedAt: "asc" },
    }),
    prisma.workflowRun.findMany({
      where: {
        startedAt: { gte: previousFrom, lt: previousTo },
        source: PRODUCTION_ONLY,
      },
      select: {
        workflowId: true,
        status: true,
        source: true,
        startedAt: true,
        finishedAt: true,
        error: true,
      },
    }),
    prisma.workflowLog.findMany({
      where: {
        nodeType: { in: AI_NODE_TYPES },
        run: { startedAt: { gte: from, lt: to }, source: PRODUCTION_ONLY },
      },
      select: { meta: true },
    }),
    prisma.workflowLog.findMany({
      where: {
        nodeType: { in: AI_NODE_TYPES },
        run: { startedAt: { gte: previousFrom, lt: previousTo }, source: PRODUCTION_ONLY },
      },
      select: { meta: true },
    }),
    prisma.workflowLog.findMany({
      where: {
        status: "error",
        run: { startedAt: { gte: from, lt: to }, source: PRODUCTION_ONLY },
      },
      select: { nodeType: true, error: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.workflow.findMany({ select: { id: true, name: true } }),
  ]);

  return aggregateDashboard({
    range,
    now,
    runs: runs as RunRow[],
    previousRuns: previousRuns as RunRow[],
    aiTokens: sumTokens(aiLogs),
    previousAiTokens: sumTokens(previousAiLogs),
    errorLogs: errorLogs as ErrorLogRow[],
    workflows,
  });
}
