import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryRunManually, scheduleAutoRetry, loadRetryChainLength } from "./run-retries";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  retrySettingFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflowRun: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
    retrySetting: {
      findUnique: mocks.retrySettingFindUnique,
    },
  },
}));

type Row = Record<string, unknown> & { id: string; retryOfRunId?: string | null };

function setRows(rows: Row[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  mocks.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(byId.get(where.id) ?? null),
  );
}

function run(overrides: Partial<Row> = {}): Row {
  return {
    id: "run-1",
    workflowId: "wf-1",
    status: "error",
    source: "webhook",
    attempt: 1,
    retryOfRunId: null,
    triggerPayload: { event: "push" },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.findFirst.mockReset();
  mocks.create.mockReset();
  mocks.retrySettingFindUnique.mockReset();
  mocks.findFirst.mockResolvedValue(null);
  mocks.retrySettingFindUnique.mockResolvedValue(null);
});

describe("loadRetryChainLength", () => {
  it("counts the original run as one", async () => {
    setRows([run()]);
    expect(await loadRetryChainLength("run-1")).toBe(1);
  });

  it("walks up the retry links", async () => {
    setRows([
      run({ id: "run-3", retryOfRunId: "run-2" }),
      run({ id: "run-2", retryOfRunId: "run-1" }),
      run({ id: "run-1", retryOfRunId: null }),
    ]);
    expect(await loadRetryChainLength("run-3")).toBe(3);
  });
});

describe("retryRunManually", () => {
  it("rejects an unknown run", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const result = await retryRunManually("wf-1", "missing");
    expect(result).toEqual({ ok: false, status: 404, error: "Run not found" });
  });

  it("rejects a run from another workflow", async () => {
    setRows([run({ workflowId: "wf-2" })]);
    const result = await retryRunManually("wf-1", "run-1");
    expect(result.ok).toBe(false);
  });

  it("rejects sub-workflow runs", async () => {
    setRows([run({ source: "subWorkflow" })]);
    const result = await retryRunManually("wf-1", "run-1");
    expect(result).toEqual({ ok: false, status: 409, error: "subWorkflow runs cannot be retried" });
  });

  it("rejects runs that are not failed", async () => {
    setRows([run({ status: "success" })]);
    const result = await retryRunManually("wf-1", "run-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("only failed runs");
  });

  it("rejects a chain that reached the limit", async () => {
    const rows: Row[] = [];
    for (let i = 1; i <= 10; i++) {
      rows.push(run({ id: `run-${i}`, retryOfRunId: i < 10 ? `run-${i + 1}` : null }));
    }
    setRows(rows);

    const result = await retryRunManually("wf-1", "run-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("chain limit");
  });

  it("enforces the cooldown", async () => {
    const now = 1_000_000;
    setRows([run()]);
    mocks.findFirst.mockResolvedValue({ startedAt: new Date(now - 1_000) });

    const result = await retryRunManually("wf-1", "run-1", now);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cooldown");
  });

  it("creates a linked run in queued state", async () => {
    setRows([run()]);
    mocks.create.mockResolvedValue({
      id: "run-2",
      attempt: 2,
      source: "webhook",
      triggerPayload: { event: "push" },
    });

    const result = await retryRunManually("wf-1", "run-1", 1_000_000);

    expect(result).toMatchObject({ ok: true, runId: "run-2", attempt: 2, source: "webhook" });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        workflowId: "wf-1",
        source: "webhook",
        triggerPayload: { event: "push" },
        attempt: 2,
        retryOfRunId: "run-1",
        status: "queued",
      },
    });
  });
});

describe("scheduleAutoRetry", () => {
  it("creates the next attempt for a retryable failure", async () => {
    setRows([run({ source: "schedule", attempt: 1 })]);
    mocks.create.mockResolvedValue({ id: "run-2", attempt: 2 });

    const result = await scheduleAutoRetry("run-1", { status: 503 });

    expect(result).not.toBeNull();
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workflowId: "wf-1",
        attempt: 2,
        retryOfRunId: "run-1",
        status: "queued",
        nextRetryAt: expect.any(Date),
      }),
    });
  });

  it("does not retry permanent failures", async () => {
    setRows([run({ source: "schedule" })]);
    expect(await scheduleAutoRetry("run-1", { status: 400 })).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("stops when the attempt budget is exhausted", async () => {
    setRows([run({ source: "schedule", attempt: 3 })]);
    expect(await scheduleAutoRetry("run-1", { status: 503 })).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not retry sub-workflows", async () => {
    setRows([run({ source: "subWorkflow" })]);
    expect(await scheduleAutoRetry("run-1", { status: 503 })).toBeNull();
  });

  it("does not retry a run that is not failed", async () => {
    setRows([run({ source: "schedule", status: "running" })]);
    expect(await scheduleAutoRetry("run-1", { status: 503 })).toBeNull();
  });
});
