import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleForEach } from "./for-each";
import type { ContextStep } from "@/lib/workflow-context";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function chainWithItems(items: unknown[]): ContextStep {
  return {
    name: "Transform Data",
    output: { items },
    success: true,
    error: null,
  };
}

function okResponse(output: unknown) {
  return new Response(JSON.stringify({ output }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function failResponse(message = "boom") {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}

describe("handleForEach", () => {
  it("requires a target workflow", async () => {
    const result = await handleForEach({ items: "previousStep.items" }, chainWithItems([1]));

    expect(result).toEqual({
      success: false,
      message: "No workflow selected. Configure a target workflow in node settings.",
    });
  });

  it("requires an array", async () => {
    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.value" },
      { name: "Transform Data", output: { value: 42 }, success: true, error: null },
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe("The items expression did not return an array");
  });

  it("runs the sub-workflow once per item with loop.item and loop.index", async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse({ doubled: 2 }))
      .mockResolvedValueOnce(okResponse({ doubled: 4 }));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items" },
      chainWithItems([1, 2]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ workflowId: "wf-1", input: { loop: { item: 1, index: 0 } } }),
    );
    expect(fetchMock.mock.calls[1][1].body).toBe(
      JSON.stringify({ workflowId: "wf-1", input: { loop: { item: 2, index: 1 } } }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      results: [
        { index: 0, ok: true, output: { doubled: 2 } },
        { index: 1, ok: true, output: { doubled: 4 } },
      ],
      count: 2,
      succeeded: 2,
      failed: 0,
      skipped: 0,
    });
  });

  it("accepts a template expression", async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true }));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "{{previousStep.items}}" },
      chainWithItems(["a"]),
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("merges extra input and supports custom item/index names", async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true }));

    await handleForEach(
      {
        workflowId: "wf-1",
        items: "previousStep.items",
        input: '{"team":"platform"}',
        itemName: "ticket",
        indexName: "position",
      },
      chainWithItems(["T-1"]),
    );

    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({
        workflowId: "wf-1",
        input: { loop: { ticket: "T-1", position: 0 }, team: "platform" },
      }),
    );
  });

  it("fails instead of silently dropping items above the limit", async () => {
    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items", maxItems: "2" },
      chainWithItems([1, 2, 3]),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("above the limit of 2");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records failures and continues when configured", async () => {
    fetchMock
      .mockResolvedValueOnce(failResponse("item exploded"))
      .mockResolvedValueOnce(okResponse({ ok: true }));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items", onError: "continue" },
      chainWithItems([1, 2]),
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ count: 2, succeeded: 1, failed: 1, skipped: 0 });
    expect(result.data.results[0]).toEqual({
      index: 0,
      ok: false,
      error: "item exploded",
    });
  });

  it("skips failed items when configured", async () => {
    fetchMock
      .mockResolvedValueOnce(failResponse("skip me"))
      .mockResolvedValueOnce(okResponse({ ok: true }));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items", onError: "skip" },
      chainWithItems([1, 2]),
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ count: 1, succeeded: 1, failed: 1, skipped: 1 });
    expect(result.data.results).toHaveLength(1);
  });

  it("aborts on the first failure when configured", async () => {
    fetchMock.mockResolvedValue(failResponse("abort me"));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items", onError: "abort" },
      chainWithItems([1, 2]),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("aborted at item 1/2");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty result for an empty array", async () => {
    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items" },
      chainWithItems([]),
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ results: [], count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wraps the result in the configured output name", async () => {
    fetchMock.mockResolvedValue(okResponse({ ok: true }));

    const result = await handleForEach(
      { workflowId: "wf-1", items: "previousStep.items", outputName: "batch" },
      chainWithItems(["a"]),
    );

    expect(result.data).toHaveProperty("batch.results");
  });
});
