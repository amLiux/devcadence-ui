import { describe, it, expect } from "vitest";
import { aggregateDashboard, type AggregateInput, type RunRow } from "./aggregate";

const NOW = new Date("2026-11-02T12:00:00.000Z");

function run(overrides: Partial<RunRow> = {}): RunRow {
  return {
    workflowId: "wf-1",
    status: "success",
    source: "webhook",
    startedAt: new Date("2026-11-02T10:00:00.000Z"),
    finishedAt: new Date("2026-11-02T10:00:02.000Z"),
    error: null,
    ...overrides,
  };
}

function input(overrides: Partial<AggregateInput> = {}): AggregateInput {
  return {
    range: "7d",
    now: NOW,
    runs: [],
    previousRuns: [],
    aiTokens: 0,
    previousAiTokens: 0,
    errorLogs: [],
    workflows: [{ id: "wf-1", name: "Deploy alerts" }],
    ...overrides,
  };
}

describe("aggregateDashboard — empty window", () => {
  it("returns zeroed KPIs and empty tables", () => {
    const stats = aggregateDashboard(input());

    expect(stats.kpis.runs).toEqual({ value: 0, previous: 0, deltaPct: null });
    expect(stats.kpis.successRate).toEqual({ value: null, previous: null, deltaPp: null });
    expect(stats.kpis.p95DurationMs).toEqual({ value: null, previous: null, deltaPct: null });
    expect(stats.kpis.running).toBe(0);
    expect(stats.sources).toEqual([]);
    expect(stats.failingNodes).toEqual([]);
    expect(stats.workflows).toEqual([]);
  });

  it("still returns every volume bucket so the chart keeps its shape", () => {
    const stats = aggregateDashboard(input());

    expect(stats.volume.length).toBeGreaterThan(0);
    expect(stats.volume.every((point) => point.success === 0 && point.error === 0)).toBe(true);
  });
});

describe("aggregateDashboard — KPIs", () => {
  it("counts runs, successes and failures", () => {
    const stats = aggregateDashboard(
      input({
        runs: [
          run({ status: "success" }),
          run({ status: "success" }),
          run({ status: "success" }),
          run({ status: "error", error: "boom" }),
          run({ status: "running", finishedAt: null }),
        ],
      }),
    );

    expect(stats.kpis.runs.value).toBe(5);
    expect(stats.kpis.successRate.value).toBe(75);
    expect(stats.kpis.running).toBe(1);
  });

  it("computes p95 from finished runs only", () => {
    const stats = aggregateDashboard(
      input({
        runs: [
          run({ startedAt: new Date("2026-11-02T09:00:00Z"), finishedAt: new Date("2026-11-02T09:00:01Z") }),
          run({ startedAt: new Date("2026-11-02T10:00:00Z"), finishedAt: new Date("2026-11-02T10:00:05Z") }),
          run({ status: "running", finishedAt: null }),
        ],
      }),
    );

    expect(stats.kpis.p95DurationMs.value).toBe(5000);
  });

  it("compares against the previous window", () => {
    const stats = aggregateDashboard(
      input({
        runs: [run(), run()],
        previousRuns: [run(), run(), run(), run()],
        aiTokens: 3000,
        previousAiTokens: 2000,
      }),
    );

    expect(stats.kpis.runs.deltaPct).toBe(-50);
    expect(stats.kpis.aiTokens.deltaPct).toBe(50);
    expect(stats.kpis.successRate.deltaPp).toBe(0);
  });
});

describe("aggregateDashboard — volume and sources", () => {
  it("groups runs into their day buckets", () => {
    const stats = aggregateDashboard(
      input({
        runs: [
          run({ startedAt: new Date("2026-11-01T09:00:00Z") }),
          run({ startedAt: new Date("2026-11-01T15:00:00Z"), status: "error" }),
          run({ startedAt: new Date("2026-11-02T09:00:00Z") }),
        ],
      }),
    );

    const firstDay = stats.volume.find((point) => point.bucket.startsWith("2026-11-01"));
    const secondDay = stats.volume.find((point) => point.bucket.startsWith("2026-11-02"));

    expect(firstDay).toMatchObject({ success: 1, error: 1 });
    expect(secondDay).toMatchObject({ success: 1, error: 0 });
  });

  it("counts sources and sorts them by volume", () => {
    const stats = aggregateDashboard(
      input({
        runs: [
          run({ source: "webhook" }),
          run({ source: "webhook" }),
          run({ source: "schedule" }),
          run({ source: "manual" }),
        ],
      }),
    );

    expect(stats.sources).toEqual([
      { source: "webhook", count: 2 },
      { source: "manual", count: 1 },
      { source: "schedule", count: 1 },
    ]);
  });
});

describe("aggregateDashboard — failing nodes", () => {
  it("counts failures per node and keeps the latest error", () => {
    const stats = aggregateDashboard(
      input({
        errorLogs: [
          {
            nodeType: "HTTP Request",
            error: "timeout",
            startedAt: new Date("2026-11-02T09:00:00Z"),
          },
          {
            nodeType: "HTTP Request",
            error: "503 Service Unavailable",
            startedAt: new Date("2026-11-02T10:00:00Z"),
          },
          {
            nodeType: "Send Slack Message",
            error: "channel not found",
            startedAt: new Date("2026-11-02T11:00:00Z"),
          },
        ],
      }),
    );

    expect(stats.failingNodes).toHaveLength(2);
    expect(stats.failingNodes[0]).toMatchObject({
      nodeType: "HTTP Request",
      failures: 2,
      lastError: "503 Service Unavailable",
    });
    expect(stats.failingNodes[1]).toMatchObject({ nodeType: "Send Slack Message", failures: 1 });
  });
});

describe("aggregateDashboard — workflow health", () => {
  it("resolves names, counts runs and sorts the worst first", () => {
    const stats = aggregateDashboard(
      input({
        workflows: [
          { id: "wf-1", name: "Deploy alerts" },
          { id: "wf-2", name: "Nightly scan" },
        ],
        runs: [
          run({ workflowId: "wf-1", status: "success" }),
          run({ workflowId: "wf-1", status: "success" }),
          run({
            workflowId: "wf-2",
            status: "error",
            error: "boom",
            startedAt: new Date("2026-11-02T11:00:00Z"),
          }),
          run({ workflowId: "wf-2", status: "error", error: "boom" }),
        ],
      }),
    );

    expect(stats.workflows.map((workflow) => workflow.name)).toEqual([
      "Nightly scan",
      "Deploy alerts",
    ]);
    expect(stats.workflows[0]).toMatchObject({ successRate: 0, runs: 2, lastStatus: "error" });
    expect(stats.workflows[1]).toMatchObject({ successRate: 100, runs: 2 });
  });

  it("falls back to a placeholder name for deleted workflows", () => {
    const stats = aggregateDashboard(
      input({ workflows: [], runs: [run({ workflowId: "wf-gone" })] }),
    );

    expect(stats.workflows[0].name).toBe("Deleted workflow");
  });

  it("sorts workflows with no finished runs last", () => {
    const stats = aggregateDashboard(
      input({
        workflows: [
          { id: "wf-1", name: "Only running" },
          { id: "wf-2", name: "Healthy" },
        ],
        runs: [
          run({ workflowId: "wf-1", status: "running", finishedAt: null }),
          run({ workflowId: "wf-2", status: "success" }),
        ],
      }),
    );

    expect(stats.workflows.map((workflow) => workflow.name)).toEqual(["Healthy", "Only running"]);
  });
});
