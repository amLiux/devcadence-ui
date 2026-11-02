import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleCallWorkflow } from "./call-workflow";

function mockExecuteSubWorkflow(response: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    statusText: ok ? "OK" : "Bad Request",
    json: async () => response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleCallWorkflow", () => {
  it("fails when no target workflow is configured", async () => {
    const result = await handleCallWorkflow({});

    expect(result.success).toBe(false);
    expect(result.message).toContain("No workflow selected");
  });

  it("parses a valid JSON input and forwards it as-is", async () => {
    const fetchMock = mockExecuteSubWorkflow({ output: { ok: true } });

    const result = await handleCallWorkflow({
      workflowId: "wf-sub",
      input: '{"message":"hi","count":2}',
    });

    expect(result.success).toBe(true);
    expect(result.logs).toEqual([]);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      workflowId: "wf-sub",
      input: { message: "hi", count: 2 },
    });
  });

  it("warns and passes the raw text as `data` when the input is not JSON", async () => {
    const fetchMock = mockExecuteSubWorkflow({ output: null });
    const raw = '{\nmessage: "No vulnerabilities found"}}\n}';

    const result = await handleCallWorkflow({ workflowId: "wf-sub", input: raw });

    expect(result.success).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs?.[0]).toMatchObject({ type: "warning" });
    expect(result.logs?.[0].message).toMatch(/not valid JSON/i);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.input).toEqual({ data: raw });
  });

  it("keeps the warning when the sub-workflow fails", async () => {
    mockExecuteSubWorkflow({ error: "Workflow not found" }, false);

    const result = await handleCallWorkflow({
      workflowId: "wf-sub",
      input: "not json at all",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Workflow not found");
    expect(result.logs?.[0]).toMatchObject({ type: "warning" });
  });

  it("returns the sub-workflow output", async () => {
    mockExecuteSubWorkflow({ output: { message: "done" } });

    const result = await handleCallWorkflow({ workflowId: "wf-sub", input: "{}" });

    expect(result.data).toEqual({ message: "done" });
  });
});
