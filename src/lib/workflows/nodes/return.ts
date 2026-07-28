import { resolveTemplates } from "@/lib/workflow-context";
import { NodeHandlerResult } from "./types";

export async function handleReturn(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const outputData: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (key.startsWith("return_name_")) {
      const index = key.replace("return_name_", "");
      const name = resolveTemplates(value, ancestorChain);
      const valueKey = `return_value_${index}`;
      const rawValue = meta[valueKey] || "";
      const resolvedValue = resolveTemplates(rawValue, ancestorChain);

      try {
        outputData[name] = JSON.parse(resolvedValue);
      } catch {
        outputData[name] = resolvedValue;
      }
    }
  }

  if (Object.keys(outputData).length === 0 && meta.value) {
    const resolved = resolveTemplates(meta.value, ancestorChain);
    try {
      outputData.output = JSON.parse(resolved);
    } catch {
      outputData.output = resolved;
    }
  }

  return {
    success: true,
    message: "Return values exported",
    data: outputData,
  };
}
