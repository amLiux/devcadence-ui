import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
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
  handleSendMessage,
  handleSendDiscordMessage,
  handleReadDiscordMessages,
  handleSendDirectMessage,
  handleListenDiscordMessages,
  handleScanDependencies,
  type NodeHandlerResult,
} from "@/lib/workflows/nodes";
import type { EditorNode, NodeDebugLog, LogEntry } from "@/lib/types";
import { sanitize } from "@/lib/workflows/sanitize";
import { withWorkflowVariables } from "@/lib/workflow-context";

const now = () => new Date().toISOString();

export interface ExecuteNodeOptions {
  runId?: string;
  stepNr?: number;
  onLog?: (entry: LogEntry) => void;
  variables?: Record<string, string> | null;
}

type Handler = (
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
) => Promise<NodeHandlerResult> | NodeHandlerResult;

const TITLE_HANDLERS: Record<string, Handler> = {
  Conditional: handleConditional,
  "Transform Data": handleTransformData,
  "Build JSON": handleBuildJson,
  "Retry Loop": handleRetryLoop,
  "HTTP Request": handleHttpRequest,
  "PostgreSQL Query": handlePostgresQuery,
  "PostgreSQL Insert": handlePostgresInsert,
  "PostgreSQL Update": handlePostgresUpdate,
  "PostgreSQL Delete": handlePostgresDelete,
  Prompt: handlePrompt,
  Classify: handleClassify,
  Extract: handleExtract,
  "Call Workflow": handleCallWorkflow,
  Input: handleInput,
  Return: handleReturn,
  "Send Email": handleSendEmail,
  "Send Slack Message": handleSendMessage,
  "Send Discord Message": handleSendDiscordMessage,
  "Read Discord Messages": handleReadDiscordMessages,
  "Send Direct Message": handleSendDirectMessage,
  "Listen Discord Messages": handleListenDiscordMessages,
  "Scan Dependencies": handleScanDependencies,
};

function dispatchHandler(
  title: string,
  type: string,
  meta: Record<string, string>,
  ancestorChain: ContextStep | undefined,
): Promise<NodeHandlerResult> | NodeHandlerResult {
  const handler = TITLE_HANDLERS[title];
  if (handler) return handler(meta, ancestorChain);

  if (type === "Trigger" && title === "Webhook") return handleWebhookTrigger(meta);
  if (type === "Trigger" && title === "Schedule") return handleScheduleTrigger(meta);
  if (type === "GitHub" && title.startsWith("Listen")) return handleGithubTrigger(title, meta);
  return handleGithubAction(title, meta, ancestorChain);
}

function buildResultLogs(
  title: string,
  result: NodeHandlerResult,
  inputSnapshot: unknown,
): LogEntry[] {
  if (result.logs) return [...result.logs];

  const logs: LogEntry[] = [
    { type: "info", message: `Starting ${title}...`, timestamp: now() },
  ];
  if (
    inputSnapshot &&
    typeof inputSnapshot === "object" &&
    Object.keys(inputSnapshot as Record<string, unknown>).length > 0
  ) {
    logs.push({
      type: "info",
      message: `Input: ${JSON.stringify(inputSnapshot, null, 2)}`,
      timestamp: now(),
    });
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
  return logs;
}

async function handleNodeSuccess({
  node,
  title,
  result,
  inputSnapshot,
  startedAt,
  options,
}: {
  node: EditorNode;
  title: string;
  result: NodeHandlerResult;
  inputSnapshot: unknown;
  startedAt: Date;
  options: ExecuteNodeOptions;
}): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const finishedAt = new Date();
  const logs = buildResultLogs(title, result, inputSnapshot);

  for (const log of logs) options.onLog?.(log);

  if (options.runId) {
    await writeLog(options.runId, {
      nodeId: node.id,
      nodeType: title,
      stepNr: options.stepNr ?? 0,
      status: result.success ? "success" : "error",
      input: inputSnapshot ?? null,
      output: sanitize(result.data).sanitized,
      error: result.success ? null : result.message,
      controlFlow: extractControlFlow(result.data as Record<string, unknown> | undefined),
      meta: extractMeta(result.data as Record<string, unknown> | undefined),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    });
  }

  return {
    debugLog: { nodeId: node.id, title, success: result.success, logs },
    data: result.data,
  };
}

async function handleNodeFailure({
  node,
  title,
  error,
  inputSnapshot,
  startedAt,
  options,
}: {
  node: EditorNode;
  title: string;
  error: unknown;
  inputSnapshot: unknown;
  startedAt: Date;
  options: ExecuteNodeOptions;
}): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const finishedAt = new Date();
  const message = error instanceof Error ? error.message : "Execution failed";
  const logs: LogEntry[] = [{ type: "error", message, timestamp: now() }];

  for (const log of logs) options.onLog?.(log);

  if (options.runId) {
    await writeLog(options.runId, {
      nodeId: node.id,
      nodeType: title,
      stepNr: options.stepNr ?? 0,
      status: "error",
      input: inputSnapshot ?? null,
      output: null,
      error: message,
      controlFlow: null,
      meta: null,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    });
  }

  return {
    debugLog: { nodeId: node.id, title, success: false, logs },
    data: undefined,
  };
}

export async function executeNode(
  node: EditorNode,
  ancestorChain: ContextStep | undefined,
  options: ExecuteNodeOptions = {},
): Promise<{ debugLog: NodeDebugLog; data: unknown }> {
  const meta = (node.data.metadata || {}) as Record<string, string>;
  const { title, type } = node.data;
  const startedAt = new Date();
  const chain = withWorkflowVariables(ancestorChain, options.variables);

  let inputSnapshot: unknown = undefined;
  try {
    inputSnapshot = sanitize(buildInputSnapshot(chain)).sanitized;
  } catch {
    inputSnapshot = null;
  }

  try {
    const result = await dispatchHandler(title, type, meta, chain);
    return await handleNodeSuccess({ node, title, result, inputSnapshot, startedAt, options });
  } catch (error) {
    return await handleNodeFailure({ node, title, error, inputSnapshot, startedAt, options });
  }
}

function applyStepSnapshot(flat: Record<string, unknown>, step: ContextStep): void {
  if (step.outputName && step.output && typeof step.output === "object") {
    const wrapped = (step.output as Record<string, unknown>)[step.outputName];
    flat[step.outputName] = wrapped !== undefined ? wrapped : step.output;
  }
  if (step.name === "Input" && step.output && typeof step.output === "object") {
    flat.input = step.output;
  }
}

function buildInputSnapshot(
  ancestorChain: ContextStep | undefined,
): Record<string, unknown> | null {
  if (!ancestorChain) return null;

  const flat: Record<string, unknown> = {};
  applyStepSnapshot(flat, ancestorChain);

  let previous = ancestorChain.previousStep;
  while (previous) {
    applyStepSnapshot(flat, previous);
    previous = previous.previousStep;
  }

  if (ancestorChain.output) flat.previousStep = ancestorChain.output;
  return Object.keys(flat).length > 0 ? flat : null;
}

function extractControlFlow(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
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
  const meta: Record<string, unknown> = {};
  if ("tokens" in data) meta.ai_tokens = data.tokens;
  if ("model" in data) meta.ai_model = data.model;
  if ("provider" in data) meta.ai_provider = data.provider;
  if ("statusCode" in data) meta.http_status = data.statusCode;
  if ("totalDuration" in data) meta.http_latency = data.totalDuration;
  return Object.keys(meta).length > 0 ? meta : null;
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
      input: data.input as Prisma.InputJsonValue,
      output: data.output as Prisma.InputJsonValue,
      error: data.error,
      controlFlow: data.controlFlow as Prisma.InputJsonValue,
      meta: data.meta as Prisma.InputJsonValue,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
      elapsedMs: data.elapsedMs,
    },
  });
}
