import {
  evaluateExpression,
  resolveExpressionInput,
  resolveTemplateVariables,
  wrapTransformOutput,
  type ContextStep,
} from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

/** Handles Transform Data nodes — resolves templates then evaluates expression against parent output. */
export async function handleTransformData(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> {
  if (!meta.expression) {
    return { success: false, message: "No expression configured" };
  }
  try {
    const input = resolveExpressionInput(meta, ancestorChain);
    // Resolve {{template}} variables first, then evaluate as JS expression
    const resolvedExpr = resolveTemplateVariables(meta.expression, input);
    const result = evaluateExpression(resolvedExpr, input);
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
