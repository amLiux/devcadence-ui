import { resolveTemplates } from "@/lib/workflow-context";
import { NodeHandlerResult } from "./types";

export async function handleInput(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const inputData: Record<string, unknown> = {};

  // Find how many fields are configured by scanning inputName_X keys
  let fieldCount = 0;
  for (const key of Object.keys(meta)) {
    if (key.startsWith("inputName_")) {
      const idx = parseInt(key.replace("inputName_", ""), 10);
      if (idx > fieldCount) fieldCount = idx;
    }
  }

  // For each configured field, use provided value or fall back to default
  for (let i = 1; i <= fieldCount; i++) {
    const fieldName = meta[`inputName_${i}`] || String(i);
    const providedValue = meta[`input_${i}`];
    const defaultValue = meta[`inputDefault_${i}`];

    if (providedValue !== undefined && providedValue !== "") {
      const resolved = resolveTemplates(providedValue, ancestorChain);
      try {
        inputData[fieldName] = JSON.parse(resolved);
      } catch {
        inputData[fieldName] = resolved;
      }
    } else if (defaultValue !== undefined && defaultValue !== "") {
      const resolved = resolveTemplates(defaultValue, ancestorChain);
      try {
        inputData[fieldName] = JSON.parse(resolved);
      } catch {
        inputData[fieldName] = resolved;
      }
    }
  }

  // Legacy: also handle raw input_X keys without inputName_X (backward compat)
  for (const [key, value] of Object.entries(meta)) {
    if (key.startsWith("input_") && key !== "input" && !key.startsWith("__")) {
      const fieldIndex = key.replace("input_", "");
      if (meta[`inputName_${fieldIndex}`]) continue; // already handled above
      const resolved = resolveTemplates(value, ancestorChain);
      const fieldName = fieldIndex;
      try {
        inputData[fieldName] = JSON.parse(resolved);
      } catch {
        inputData[fieldName] = resolved;
      }
    }
  }

  return {
    success: true,
    message: inputData && Object.keys(inputData).length > 0
      ? "Input received"
      : "Input received (using defaults)",
    data: inputData,
  };
}
