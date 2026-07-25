import {
  evaluateExpression,
  resolveExpressionInput,
  type ContextStep,
} from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

/** Handles Conditional nodes — evaluates a boolean expression against parent output. */
export async function handleConditional(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> {
  if (!meta.expression) {
    return { success: false, message: "No condition configured" };
  }
  try {
    const input = resolveExpressionInput(meta, ancestorChain);
    const result = evaluateExpression(meta.expression, input);
    const condition = Boolean(result);
    return {
      success: true,
      message: `Condition evaluated to ${condition}`,
      data: { condition, result },
    };
  } catch (err) {
    return {
      success: false,
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}
