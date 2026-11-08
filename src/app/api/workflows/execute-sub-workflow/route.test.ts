import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: { findUnique: mocks.findUnique },
    workflowRun: { create: mocks.create, update: mocks.update },
  },
}));

vi.mock("@/lib/workflows/execute-sub-workflow", () => ({
  runSubWorkflow: mocks.run,
}));

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/workflows/execute-sub-workflow", {
      method: "POST",
      body,
    }),
  );
}

const workflowRow = {
  id: "wf-1",
  type: "sub-workflow",
  nodes: JSON.stringify([{ id: "input", data: { title: "Input", metadata: {} } }]),
  edges: "[]",
};

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.create.mockReset();
  mocks.update.mockReset();
  mocks.run.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.findUnique.mockResolvedValue(workflowRow);
  mocks.create.mockResolvedValue({ id: "run-1" });
  mocks.update.mockResolvedValue({});
  mocks.run.mockResolvedValue({ debugLogs: [], context: {}, lastResult: null });
});

describe("POST /api/workflows/execute-sub-workflow", () => {
  it("rejects malformed JSON", async () => {
    const response = await post("{");
    expect(response.status).toBe(400);
  });

  it("rejects a missing workflowId", async () => {
    const response = await post(JSON.stringify({ input: {} }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("workflowId");
  });

  it("rejects a wrong input type", async () => {
    const response = await post(JSON.stringify({ workflowId: "wf-1", input: "nope" }));
    expect(response.status).toBe(400);
  });

  it("runs a valid payload", async () => {
    const response = await post(JSON.stringify({ workflowId: "wf-1", input: { id: 1 } }));

    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalled();
    expect((await response.json()).runId).toBe("run-1");
  });

  it("returns 404 when the workflow does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await post(JSON.stringify({ workflowId: "missing" }));
    expect(response.status).toBe(404);
  });
});
