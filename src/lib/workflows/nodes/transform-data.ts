import {
  evaluateExpression,
  resolveExpressionInput,
  wrapTransformOutput,
  type ContextStep,
} from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

/** Handles Transform Data nodes — evaluates an expression against parent output. */
export async function handleTransformData(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> {
  if (!meta.expression) {
    return { success: false, message: "No expression configured" };
  }
  try {
    const input = resolveExpressionInput(meta, ancestorChain);
    const result = evaluateExpression(meta.expression, input);
    return {
      success: true,
      message: "Transform applied successfully",
      data: wrapTransformOutput(meta.outputName, result),
    };
  } catch (err) {
    return {
      success: false,
      message: `Expression error: ${err instanceof Error ? err.message : "invalid expression"}`,
    };
  }
}
