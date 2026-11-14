import { appendRows, readRows } from "@/lib/google-sheets/client";
import { resolveTemplates } from "@/lib/workflow-context";
import type { ContextStep } from "@/lib/workflow-context";
import type { NodeHandlerResult } from "./types";

const now = () => new Date().toISOString();

type Log = { type: "info" | "success" | "error"; message: string; timestamp: string };

function failure(message: string, logs: Log[]): NodeHandlerResult {
  logs.push({ type: "error", message, timestamp: now() });
  return { success: false, message, logs };
}

/**
 * Rows may come from a JSON array literal or from a resolved expression such as
 * {{previousStep.rows}}. Single rows are wrapped so users can paste a line.
 */
export function parseRows(raw: string): string[][] | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    if (Array.isArray(parsed[0])) {
      return (parsed as unknown[][]).map((row) => row.map((cell) => String(cell ?? "")));
    }
    return [(parsed as unknown[]).map((cell) => String(cell ?? ""))];
  } catch {
    return null;
  }
}

export async function handleReadRows(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const spreadsheetId = resolveTemplates(meta.spreadsheetId || "", ancestorChain).trim();
  const range = resolveTemplates(meta.range || "", ancestorChain).trim();

  if (!spreadsheetId) return failure("Spreadsheet ID is required", logs);
  if (!range) return failure("Range is required (e.g. Sheet1!A1:D50)", logs);

  try {
    logs.push({ type: "info", message: `Reading ${range}`, timestamp: now() });
    const result = await readRows({ spreadsheetId, range });
    logs.push({
      type: "success",
      message: `Read ${result.rowCount} row${result.rowCount === 1 ? "" : "s"}`,
      timestamp: now(),
    });
    return {
      success: true,
      message: `Read ${result.rowCount} rows`,
      data: result,
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to read rows", logs);
  }
}

export async function handleAppendRows(
  meta: Record<string, string>,
  ancestorChain?: ContextStep,
): Promise<NodeHandlerResult> {
  const logs: Log[] = [];
  const spreadsheetId = resolveTemplates(meta.spreadsheetId || "", ancestorChain).trim();
  const range = resolveTemplates(meta.range || "", ancestorChain).trim();
  const rows = parseRows(resolveTemplates(meta.rows || "", ancestorChain));

  if (!spreadsheetId) return failure("Spreadsheet ID is required", logs);
  if (!range) return failure("Range is required (e.g. Sheet1!A1)", logs);
  if (!rows || rows.length === 0) {
    return failure("Rows must be a JSON array, e.g. [[\"a\",\"b\"]]", logs);
  }

  try {
    logs.push({ type: "info", message: `Appending ${rows.length} row(s)`, timestamp: now() });
    const result = await appendRows({ spreadsheetId, range, rows });
    logs.push({ type: "success", message: `Appended to ${result.updatedRange}`, timestamp: now() });
    return {
      success: true,
      message: `Appended ${result.updatedRows} row(s)`,
      data: result,
      logs,
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Failed to append rows", logs);
  }
}
