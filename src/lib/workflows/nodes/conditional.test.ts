import { describe, it, expect } from "vitest";
import { handleConditional } from "./conditional";
import type { ContextStep } from "@/lib/workflow-context";

function chain(output: unknown): ContextStep {
  return { name: "HTTP Request", output, success: true, error: null };
}

describe("handleConditional", () => {
  it("fails when no expression is configured", async () => {
    const result = await handleConditional({}, undefined);

    expect(result.success).toBe(false);
    expect(result.message).toBe("No condition configured");
  });

  it("returns condition true for a truthy expression", async () => {
    const result = await handleConditional(
      { expression: "previousStep.status === 200" },
      chain({ status: 200 }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ condition: true, result: true });
    expect(result.message).toBe("Condition evaluated to true");
  });

  it("returns condition false for a falsy expression", async () => {
    const result = await handleConditional(
      { expression: "previousStep.status >= 500" },
      chain({ status: 404 }),
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ condition: false, result: false });
  });

  it("coerces truthy non-boolean results to a boolean", async () => {
    const result = await handleConditional({ expression: "previousStep.items.length" }, chain({ items: [1, 2] }));

    expect(result.data).toEqual({ condition: true, result: 2 });
  });

  it("falls back to the configured body when there is no ancestor chain", async () => {
    const result = await handleConditional(
      { expression: "previousStep.ok", body: '{"ok":true}' },
      undefined,
    );

    expect(result.data).toEqual({ condition: true, result: true });
  });

  it("returns a failure result instead of throwing on bad expressions", async () => {
    const result = await handleConditional({ expression: "previousStep." }, chain({}));

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/^Expression error:/);
  });
});
