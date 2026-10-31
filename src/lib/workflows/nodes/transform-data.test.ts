import { describe, it, expect } from "vitest";
import { handleTransformData } from "./transform-data";
import type { ContextStep } from "@/lib/workflow-context";

function chain(output: unknown, outputName?: string): ContextStep {
  return {
    name: "HTTP Request",
    outputName,
    output,
    success: true,
    error: null,
  };
}

describe("handleTransformData", () => {
  it("fails when no expression is configured", async () => {
    const result = await handleTransformData({}, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toBe("No expression configured");
  });

  it("evaluates an expression against the parent output", async () => {
    const result = await handleTransformData(
      { expression: "previousStep.status === 200" },
      chain({ status: 200 }),
    );

    expect(result).toEqual({
      success: true,
      message: "Transform applied successfully",
      data: true,
    });
  });

  it("resolves {{templates}} before evaluating", async () => {
    const result = await handleTransformData(
      { expression: "{{previousStep.count}} * 2" },
      chain({ count: 21 }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });

  it("wraps the result when an output name is set", async () => {
    const result = await handleTransformData(
      { expression: "previousStep.count * 2", outputName: "doubled" },
      chain({ count: 21 }),
    );

    expect(result.data).toEqual({ doubled: 42 });
  });

  it("exposes named ancestor outputs as top-level variables", async () => {
    const result = await handleTransformData(
      { expression: "total + 1" },
      chain({ total: 10 }, "total"),
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(11);
  });

  it("returns a failure result instead of throwing on bad expressions", async () => {
    const result = await handleTransformData({ expression: "(" }, chain({}));

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/^Expression error:/);
  });

  it("falls back to the configured body when there is no ancestor chain", async () => {
    const result = await handleTransformData(
      { expression: "previousStep.a + previousStep.b", body: '{"a":2,"b":3}' },
      undefined,
    );

    expect(result.data).toBe(5);
  });
});
