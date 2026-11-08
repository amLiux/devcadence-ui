import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    workflow: { findUnique: mocks.findUnique },
    workflowRun: { create: mocks.create },
  },
}));

vi.mock("@/lib/workflows/test-workflow-stream", () => ({
  runTestWorkflowStream: mocks.run,
}));

function post(body: string): Promise<Response> {
  return POST(
    new Request("http://localhost/api/workflows/test-workflow", {
      method: "POST",
      body,
    }),
  );
}

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.create.mockReset();
  mocks.run.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.create.mockResolvedValue({ id: "run-1" });
  mocks.run.mockResolvedValue(undefined);
});

describe("POST /api/workflows/test-workflow", () => {
  it("rejects malformed JSON", async () => {
    const response = await post("{");
    expect(response.status).toBe(400);
  });

  it("rejects a missing workflowId", async () => {
    const response = await post("{}");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("workflowId");
  });

  it("rejects a wrong type", async () => {
    const response = await post(JSON.stringify({ workflowId: 42 }));
    expect(response.status).toBe(400);
  });

  it("streams a valid payload with client nodes", async () => {
    const response = await post(
      JSON.stringify({ workflowId: "wf-1", nodes: [{ id: "a" }], edges: [] }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await response.text();
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "run-1", nodes: [{ id: "a" }] }),
    );
  });

  it("returns 404 when the workflow does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await post(JSON.stringify({ workflowId: "missing" }));
    expect(response.status).toBe(404);
  });
});
