import {
  evaluateExpression,
  resolveExpressionInput,
  resolveTemplates,
  resolveTemplateVariables,
  wrapTransformOutput,
} from "@/lib/workflow-context";
import type { LogEntry, NodeHandlerResult } from "./types";

const DEFAULT_MAX_ITEMS = 25;
const HARD_MAX_ITEMS = 100;
const SUB_WORKFLOW_TIMEOUT_MS = 60_000;

type OnError = "abort" | "continue" | "skip";

interface LoopItemResult {
  index: number;
  ok: boolean;
  output?: unknown;
  error?: string;
}

interface LoopConfig {
  workflowId: string;
  items: unknown[];
  onError: OnError;
  itemName: string;
  indexName: string;
  baseInput: Record<string, unknown>;
  logs: LogEntry[];
}

function now(): string {
  return new Date().toISOString();
}

function resolveMaxItems(value: string | undefined): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_ITEMS;
  return Math.min(Math.max(parsed, 1), HARD_MAX_ITEMS);
}

function resolveOnError(value: string | undefined): OnError {
  return value === "continue" || value === "skip" ? value : "abort";
}

function parseBaseInput(raw: string | undefined, logs: LogEntry[]): Record<string, unknown> {
  if (!raw?.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to the warning below.
  }

  logs.push({
    type: "warning",
    message: "Input must be a JSON object; the loop fields were sent without extra input.",
    timestamp: now(),
  });
  return {};
}

/** Resolves the array to iterate from an expression or a JSON string. */
function resolveItems(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): { items?: unknown[]; error?: string } {
  const input = resolveExpressionInput(meta, ancestorChain);
  const expression = meta.items?.trim();

  let value: unknown;
  if (expression) {
    try {
      const single = expression.match(/^\{\{\s*(.*?)\s*\}\}$/);
      value = single
        ? evaluateExpression(single[1], input)
        : evaluateExpression(resolveTemplateVariables(expression, input), input);
    } catch (error) {
      return {
        error: `Items expression failed: ${error instanceof Error ? error.message : "invalid expression"}`,
      };
    }
  } else {
    value = input?.previousStep;
  }

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { error: "The items expression did not return an array" };
    }
  }

  if (!Array.isArray(value)) {
    return { error: "The items expression did not return an array" };
  }

  return { items: value };
}

function buildConfig(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): { config?: LoopConfig; error?: string } {
  const workflowId = resolveTemplates(meta.workflowId || "", ancestorChain).trim();
  if (!workflowId) {
    return { error: "No workflow selected. Configure a target workflow in node settings." };
  }

  const { items, error } = resolveItems(meta, ancestorChain);
  if (error) return { error };
  if (!items) return { error: "The items expression did not return an array" };

  const maxItems = resolveMaxItems(meta.maxItems);
  if (items.length > maxItems) {
    return {
      error: `Array has ${items.length} items, above the limit of ${maxItems}. Raise the limit or slice the array first.`,
    };
  }

  const logs: LogEntry[] = [];
  const baseInput = parseBaseInput(meta.input, logs);

  return {
    config: {
      workflowId,
      items,
      onError: resolveOnError(meta.onError),
      itemName: meta.itemName?.trim() || "item",
      indexName: meta.indexName?.trim() || "index",
      baseInput,
      logs,
    },
  };
}

async function runSubWorkflowItem({
  workflowId,
  input,
}: {
  workflowId: string;
  input: Record<string, unknown>;
}): Promise<unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/workflows/execute-sub-workflow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, input }),
    signal: AbortSignal.timeout(SUB_WORKFLOW_TIMEOUT_MS),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || response.statusText || `HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.output ?? result;
}

interface ItemOutcome {
  result: LoopItemResult;
  log: LogEntry;
}

async function processItem(
  config: LoopConfig,
  item: unknown,
  index: number,
): Promise<ItemOutcome> {
  // `loop` is reserved and always the first field the sub-workflow receives.
  const rest = { ...config.baseInput };
  delete rest.loop;
  const input = {
    loop: { [config.itemName]: item, [config.indexName]: index },
    ...rest,
  };

  try {
    const output = await runSubWorkflowItem({ workflowId: config.workflowId, input });
    return {
      result: { index, ok: true, output },
      log: {
        type: "success",
        message: `Item ${index + 1}/${config.items.length} succeeded`,
        timestamp: now(),
      },
    };
  } catch (error) {
    return {
      result: {
        index,
        ok: false,
        error: error instanceof Error ? error.message : "Sub-workflow failed",
      },
      log: {
        type: "error",
        message: `Item ${index + 1}/${config.items.length} failed: ${
          error instanceof Error ? error.message : "Sub-workflow failed"
        }`,
        timestamp: now(),
      },
    };
  }
}

function buildOutput(
  meta: Record<string, string>,
  results: LoopItemResult[],
  counts: { succeeded: number; failed: number; skipped: number },
) {
  return wrapTransformOutput(meta.outputName, {
    results,
    count: results.length,
    ...counts,
  });
}

/**
 * Handles For Each nodes: runs a reusable sub-workflow once per array item and
 * collects the results. Items are processed sequentially to keep one loop from
 * saturating the instance.
 */
export async function handleForEach(
  meta: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ancestorChain?: any,
): Promise<NodeHandlerResult> {
  const { config, error } = buildConfig(meta, ancestorChain);
  if (error || !config) return { success: false, message: error || "Invalid loop configuration" };

  if (config.items.length === 0) {
    return {
      success: true,
      message: "No items to process",
      data: buildOutput(meta, [], { succeeded: 0, failed: 0, skipped: 0 }),
    };
  }

  const results: LoopItemResult[] = [];
  const counts = { succeeded: 0, failed: 0, skipped: 0 };

  for (let index = 0; index < config.items.length; index += 1) {
    const outcome = await processItem(config, config.items[index], index);
    config.logs.push(outcome.log);

    if (outcome.result.ok) {
      results.push(outcome.result);
      counts.succeeded += 1;
      continue;
    }

    counts.failed += 1;

    if (config.onError === "skip") {
      counts.skipped += 1;
      continue;
    }

    results.push(outcome.result);

    if (config.onError === "abort") {
      return {
        success: false,
        message: `Loop aborted at item ${index + 1}/${config.items.length}: ${outcome.result.error}`,
        data: buildOutput(meta, results, counts),
        logs: config.logs,
      };
    }
  }

  return {
    success: true,
    message: `Processed ${config.items.length} item(s): ${counts.succeeded} succeeded, ${counts.failed} failed, ${counts.skipped} skipped`,
    data: buildOutput(meta, results, counts),
    logs: config.logs,
  };
}
