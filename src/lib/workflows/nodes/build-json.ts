import { evaluateExpression, resolveExpressionInput, wrapTransformOutput, type ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

export async function handleBuildJson(
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> {
  const input = resolveExpressionInput(meta, ancestorChain);
  const result: Record<string, unknown> = {};

  let fieldCount = 0;
  for (const key of Object.keys(meta)) {
    if (key.startsWith("mapKey_")) {
      const idx = parseInt(key.replace("mapKey_", ""), 10);
      if (idx > fieldCount) fieldCount = idx;
    }
  }

  for (let i = 1; i <= fieldCount; i++) {
    const propKey = meta[`mapKey_${i}`];
    const propValue = meta[`mapValue_${i}`];
    if (!propKey || !propValue) continue;

    try {
      const evaluated = evaluateExpression(propValue, input);
      result[propKey] = evaluated;
    } catch {
      result[propKey] = propValue;
    }
  }

  return {
    success: true,
    message: "JSON built successfully",
    data: wrapTransformOutput(meta.outputName, result),
  };
}
