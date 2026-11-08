import { resolveTemplates, type ContextStep } from "@/lib/workflow-context";
import { NodeHandlerResult } from "./types";

function parseValue(value: string, ancestorChain?: ContextStep): unknown {
  const resolved = resolveTemplates(value, ancestorChain);
  try {
    return JSON.parse(resolved);
  } catch {
    return resolved;
  }
}

function countFields(meta: Record<string, string>): number {
  let fieldCount = 0;
  for (const key of Object.keys(meta)) {
    if (!key.startsWith("inputName_")) continue;
    const index = parseInt(key.replace("inputName_", ""), 10);
    if (index > fieldCount) fieldCount = index;
  }
  return fieldCount;
}

function collectNamedFields(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Record<string, unknown> {
  const inputData: Record<string, unknown> = {};
  const fieldCount = countFields(meta);

  for (let index = 1; index <= fieldCount; index++) {
    const fieldName = meta[`inputName_${index}`] || String(index);
    const providedValue = meta[`input_${index}`];
    const defaultValue = meta[`inputDefault_${index}`];

    if (providedValue !== undefined && providedValue !== "") {
      inputData[fieldName] = parseValue(providedValue, ancestorChain);
    } else if (defaultValue !== undefined && defaultValue !== "") {
      inputData[fieldName] = parseValue(defaultValue, ancestorChain);
    }
  }

  return inputData;
}

function collectLegacyFields(
  meta: Record<string, string>,
  inputData: Record<string, unknown>,
  ancestorChain?: ContextStep,
): void {
  for (const [key, value] of Object.entries(meta)) {
    if (!key.startsWith("input_") || key === "input" || key.startsWith("__")) continue;
    const fieldIndex = key.replace("input_", "");
    if (meta[`inputName_${fieldIndex}`]) continue;
    inputData[fieldIndex] = parseValue(value, ancestorChain);
  }
}

export async function handleInput(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const inputData = collectNamedFields(meta, ancestorChain);
  collectLegacyFields(meta, inputData, ancestorChain);

  return {
    success: true,
    message:
      Object.keys(inputData).length > 0
        ? "Input received"
        : "Input received (using defaults)",
    data: inputData,
  };
}
