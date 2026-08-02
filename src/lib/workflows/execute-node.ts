import { prisma } from "@/lib/db";
import type { ContextStep } from "@/lib/workflow-context";
import {
  handleTransformData,
  handleConditional,
  handleHttpRequest,
  handleGithubTrigger,
  handleGithubAction,
  handlePostgresQuery,
  handlePostgresInsert,
  handlePostgresUpdate,
  handlePostgresDelete,
  handleWebhookTrigger,
  handleScheduleTrigger,
  handlePrompt,
  handleClassify,
  handleExtract,
  handleCallWorkflow,
  handleInput,
  handleReturn,
  handleBuildJson,
  handleRetryLoop,
  handleSendEmail,
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, NodeDebugLog, LogEntry } from "@/lib/types";
import { sanitize } from "@/lib/workflows/sanitize";

export interface ExecuteNodeOptions {
  runId?: string;
  stepNr?: number;
  onLog?: (entry: LogEntry) => void;
}

function dispatchHandler(
  title: string,
  type: string,
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> | NodeHandlerResult {
  if (title === "Conditional") return handleConditional(meta, ancestorChain);
  if (title === "Transform Data") return handleTransformData(meta, ancestorChain);
  if (title === "Build JSON") return handleBuildJson(meta, ancestorChain);
  if (title === "Retry Loop") return handleRetryLoop(meta, ancestorChain);
  if (title === "HTTP Request") return handleHttpRequest(meta, ancestorChain);
  if (type === "Trigger" && title === "Webhook") return handleWebhookTrigger(meta);
  if (type === "Trigger" && title === "Schedule") return handleScheduleTrigger(meta);
  if (type === "GitHub" && title.startsWith("Listen")) return handleGithubTrigger(title, meta);
  if (title === "PostgreSQL Query") return handlePostgresQuery(meta, ancestorChain);
  if (title === "PostgreSQL Insert") return handlePostgresInsert(meta, ancestorChain);
  if (title === "PostgreSQL Update") return handlePostgresUpdate(meta, ancestorChain);
  if (title === "PostgreSQL Delete") return handlePostgresDelete(meta, ancestorChain);
  if (title === "Prompt") return handlePrompt(meta, ancestorChain);
  if (title === "Classify") return handleClassify(meta, ancestorChain);
  if (title === "Extract") return handleExtract(meta, ancestorChain);
  if (title === "Call Workflow") return handleCallWorkflow(meta, ancestorChain);
  if (title === "Input") return handleInput(meta, ancestorChain);
  if (title === "Return") return handleReturn(meta, ancestorChain);
  if (title === "Send Email") return handleSendEmail(meta, ancestorChain);
  return handleGithubAction(title, meta, ancestorChain);
}

export async function executeNode(
  node: EditorNode,
  ancestorChain: ContextStep | undefined,
  options: ExecuteNodeOptions = {},
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const meta = (node.data.metadata || {}) as Record<string, string>;
  const { title, type } = node.data;
  const now = () => new Date().toISOString();
  const startedAt = new Date();
  const logs: LogEntry[] = [];

  let inputSnapshot: unknown = undefined;
  try {
    inputSnapshot = sanitize(buildInputSnapshot(ancestorChain)).sanitized;
  } catch {
    inputSnapshot = null;
  }

  try {
    const result = await dispatchHandler(title, type, meta, ancestorChain);
    const finishedAt = new Date();
    const elapsedMs = finishedAt.getTime() - startedAt.getTime();

    if (result.logs) {
      logs.push(...result.logs);
    } else {
      logs.push({ type: "info", message: `Starting ${title}...`, timestamp: now() });
      if (inputSnapshot && typeof inputSnapshot === "object" && Object.keys(inputSnapshot as Record<string, unknown>).length > 0) {
        logs.push({ type: "info", message: `Input: ${JSON.stringify(inputSnapshot, null, 2)}`, timestamp: now() });
      }
      logs.push({
        type: result.success ? "success" : "error",
        message: result.message,
        timestamp: now(),
      });
      if (result.data) {
        logs.push({
          type: "info",
          message: `Output: ${JSON.stringify(result.data, null, 2)}`,
          timestamp: now(),
        });
      }
    }

    const outputSanitized = sanitize(result.data).sanitized;
    const errorStr = result.success ? null : result.message;

    if (options.onLog) {
      for (const log of logs) {
        options.onLog(log);
      }
    }

    if (options.runId) {
      await writeLog(options.runId, {
        nodeId: node.id,
        nodeType: title,
        stepNr: options.stepNr ?? 0,
        status: result.success ? "success" : "error",
        input: inputSnapshot ?? null,
        output: outputSanitized,
        error: errorStr,
        controlFlow: extractControlFlow(result.data as Record<string, unknown> | undefined),
        meta: extractMeta(result.data as Record<string, unknown> | undefined),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        elapsedMs,
      });
    }

    return {
      debugLog: { nodeId: node.id, title, success: result.success, logs },
      data: result.data,
    };
  } catch (error) {
    const finishedAt = new Date();
    const elapsedMs = finishedAt.getTime() - startedAt.getTime();
    const msg = error instanceof Error ? error.message : "Execution failed";
    logs.push({ type: "error", message: msg, timestamp: now() });

    if (options.onLog) {
      for (const log of logs) options.onLog(log);
    }

    if (options.runId) {
      await writeLog(options.runId, {
        nodeId: node.id,
        nodeType: title,
        stepNr: options.stepNr ?? 0,
        status: "error",
        input: inputSnapshot ?? null,
        output: null,
        error: msg,
        controlFlow: null,
        meta: null,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        elapsedMs,
      });
    }

    return {
      debugLog: { nodeId: node.id, title, success: false, logs },
      data: undefined,
    };
  }
}

function buildInputSnapshot(ancestorChain: ContextStep | undefined): Record<string, unknown> | null {
  if (!ancestorChain) return null;

  const flat: Record<string, unknown> = {};

  if (ancestorChain.outputName && ancestorChain.output && typeof ancestorChain.output === "object") {
    const wrapped = (ancestorChain.output as Record<string, unknown>)[ancestorChain.outputName];
    flat[ancestorChain.outputName] = wrapped !== undefined ? wrapped : ancestorChain.output;
  }
  if (ancestorChain.name === "Input" && ancestorChain.output && typeof ancestorChain.output === "object") {
    flat.input = ancestorChain.output;
  }

  let prev = ancestorChain.previousStep;
  while (prev) {
    if (prev.outputName && prev.output && typeof prev.output === "object") {
      const wrapped = (prev.output as Record<string, unknown>)[prev.outputName];
      flat[prev.outputName] = wrapped !== undefined ? wrapped : prev.output;
    }
    if (prev.name === "Input" && prev.output && typeof prev.output === "object") {
      flat.input = prev.output;
    }
    prev = prev.previousStep;
  }

  if (ancestorChain.output) {
    flat.previousStep = ancestorChain.output;
  }

  return Object.keys(flat).length > 0 ? flat : null;
}

function extractControlFlow(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!data) return null;
  const flow: Record<string, unknown> = {};
  if ("condition" in data) flow.condition = data.condition;
  if ("attempts" in data) flow.attempts = data.attempts;
  if ("maxAttempts" in data) flow.maxAttempts = data.maxAttempts;
  if ("attempt" in data) flow.attempt = data.attempt;
  return Object.keys(flow).length > 0 ? flow : null;
}

function extractMeta(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!data) return null;
  const m: Record<string, unknown> = {};
  if ("tokens" in data) m.ai_tokens = data.tokens;
  if ("model" in data) m.ai_model = data.model;
  if ("provider" in data) m.ai_provider = data.provider;
  if ("statusCode" in data) m.http_status = data.statusCode;
  if ("totalDuration" in data) m.http_latency = data.totalDuration;
  return Object.keys(m).length > 0 ? m : null;
}

interface WriteLogData {
  nodeId: string;
  nodeType: string;
  stepNr: number;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  controlFlow: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
}

async function writeLog(runId: string, data: WriteLogData): Promise<void> {
  await prisma.workflowLog.create({
    data: {
      runId,
      nodeId: data.nodeId,
      nodeType: data.nodeType,
      stepNr: data.stepNr,
      status: data.status,
      input: data.input as any,
      output: data.output as any,
      error: data.error,
      controlFlow: data.controlFlow as any,
      meta: data.meta as any,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      elapsedMs: data.elapsedMs,
    },
  });
}
