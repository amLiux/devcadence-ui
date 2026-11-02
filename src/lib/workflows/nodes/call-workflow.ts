import { resolveTemplates } from "@/lib/workflow-context";
import { NodeHandlerResult, type LogEntry } from "./types";

export async function handleCallWorkflow(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const workflowId = resolveTemplates(meta.workflowId || "", ancestorChain);
  if (!workflowId) {
    return {
      success: false,
      message: "No workflow selected. Configure a target workflow in node settings.",
    };
  }

  const inputRaw = resolveTemplates(meta.input || "{}", ancestorChain);
  const logs: LogEntry[] = [];
  let inputData: Record<string, unknown>;

  try {
    inputData = JSON.parse(inputRaw);
  } catch {
    // Falling back silently made a malformed input look like a successful call
    // that forwarded the whole blob as a single string.
    inputData = { data: inputRaw };
    logs.push({
      type: "warning",
      message:
        "Input is not valid JSON, so it was sent to the sub-workflow as `data`. Quote keys and string values to send an object.",
      timestamp: new Date().toISOString(),
    });
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflows/execute-sub-workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workflowId,
      input: inputData,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    return {
      success: false,
      message: `Sub-workflow failed: ${error.error || response.statusText}`,
      logs,
    };
  }

  const result = await response.json();

  return {
    success: true,
    message: `Called workflow "${workflowId}" successfully`,
    data: result.output ?? result,
    logs,
  };
}
