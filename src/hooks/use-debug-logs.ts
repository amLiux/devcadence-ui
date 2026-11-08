"use client";

import { useState, useCallback } from "react";
import { readSseEvents } from "@/lib/sse";
import type {
  EditorNode,
  EditorEdge,
  LogEntry,
  NodeDebugLog,
  WorkflowContext,
  Workflow,
} from "@/lib/types";

interface WorkflowLog {
  id: string;
  nodeId: string;
  nodeType: string;
  stepNr: number;
  status: string;
  error: string | null;
  elapsedMs: number;
  startedAt: string;
  finishedAt: string;
  meta: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  input: Record<string, unknown> | null;
  controlFlow: Record<string, unknown> | null;
}

export function logToDebug(log: WorkflowLog): NodeDebugLog {
  const logs: LogEntry[] = [];
  logs.push({ type: "info", message: `Starting ${log.nodeType}...`, timestamp: log.startedAt });
  if (log.input && typeof log.input === "object" && Object.keys(log.input).length > 0) {
    logs.push({
      type: "info",
      message: `Input: ${JSON.stringify(log.input, null, 2)}`,
      timestamp: log.startedAt,
    });
  }
  logs.push({
    type: log.status === "success" ? "success" : "error",
    message: log.error ?? `${log.nodeType} completed in ${log.elapsedMs}ms`,
    timestamp: log.finishedAt,
  });
  if (log.output) {
    logs.push({
      type: "info",
      message: `Output: ${JSON.stringify(log.output, null, 2)}`,
      timestamp: log.finishedAt,
    });
  }
  if (log.controlFlow && Object.keys(log.controlFlow).length > 0) {
    logs.push({
      type: "info",
      message: `Control Flow: ${JSON.stringify(log.controlFlow)}`,
      timestamp: log.finishedAt,
    });
  }
  if (log.meta && Object.keys(log.meta).length > 0) {
    logs.push({
      type: "info",
      message: `Meta: ${JSON.stringify(log.meta)}`,
      timestamp: log.finishedAt,
    });
  }
  if (log.error) {
    logs.push({ type: "error", message: log.error, timestamp: log.finishedAt });
  }
  return { nodeId: log.nodeId, title: log.nodeType, success: log.status === "success", logs };
}

interface UseDebugLogsOptions {
  onWorkflowResult?: (context: WorkflowContext) => void;
  onNodeResult?: (nodeId: string, data: unknown, success: boolean, error: string | null) => void;
}

type NodeMessage =
  | { type: "log"; entry: LogEntry }
  | {
      type: "result";
      nodeId: string;
      title: string;
      success: boolean;
      logs?: LogEntry[];
      data?: unknown;
    };

type WorkflowMessage =
  | { type: "step-start"; nodeId: string; title: string }
  | { type: "log"; nodeId: string; entry: LogEntry }
  | { type: "step"; step: NodeDebugLog }
  | { type: "result"; context?: WorkflowContext };

function errorStep(nodeId: string, title: string, message: string): NodeDebugLog {
  return {
    nodeId,
    title,
    success: false,
    logs: [{ type: "error", message, timestamp: new Date().toISOString() }],
  };
}

export function useDebugLogs(options?: UseDebugLogsOptions) {
  const [steps, setSteps] = useState<NodeDebugLog[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [running, setRunning] = useState(false);

  const testNode = useCallback(
    async (
      node: EditorNode,
      workflowId: string,
      nodes: EditorNode[],
      edges: EditorEdge[],
      context: WorkflowContext,
    ) => {
      setTitle(`Test: ${node.data.title}`);
      setSteps([{ nodeId: node.id, title: node.data.title, success: false, logs: [] }]);
      setOpen(true);

      try {
        const response = await fetch("/api/workflows/test-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node,
            workflowId,
            nodes,
            edges: edges.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
            })),
            context,
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("event-stream")) {
          const entries: LogEntry[] = [];
          await readSseEvents<NodeMessage>(response, (message) => {
            if (message.type === "log") {
              entries.push(message.entry);
              setSteps([
                {
                  nodeId: node.id,
                  title: node.data.title,
                  success: false,
                  logs: [...entries],
                },
              ]);
            } else if (message.type === "result") {
              setSteps([
                {
                  nodeId: message.nodeId,
                  title: message.title,
                  success: message.success,
                  logs: message.logs || entries,
                },
              ]);
              if (message.data !== undefined) {
                options?.onNodeResult?.(
                  node.id,
                  message.data,
                  message.success,
                  message.success
                    ? null
                    : (message.logs?.find((entry) => entry.type === "error")?.message ?? null),
                );
              }
            }
          });
        } else {
          const result = await response.json();
          setSteps([result]);
          if (result.data !== undefined) {
            options?.onNodeResult?.(
              node.id,
              result.data,
              result.success,
              result.success
                ? null
                : (result.logs?.find((entry: LogEntry) => entry.type === "error")?.message ?? null),
            );
          }
        }
      } catch {
        setSteps([errorStep(node.id, node.data.title, "Request failed")]);
      }
    },
    [options],
  );

  const testWorkflow = useCallback(
    async (workflow: Workflow, nodes: EditorNode[], edges: EditorEdge[]) => {
      setRunning(true);
      setTitle(`Test: ${workflow.name}`);
      setSteps([]);
      setOpen(true);

      try {
        const response = await fetch("/api/workflows/test-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: workflow.id,
            nodes,
            edges: edges.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
            })),
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("event-stream")) {
          const pendingEntries = new Map<string, LogEntry[]>();
          await readSseEvents<WorkflowMessage>(response, (message) => {
            if (message.type === "step-start") {
              pendingEntries.set(message.nodeId, []);
              setSteps((previous) => [
                ...previous,
                { nodeId: message.nodeId, title: message.title, success: false, logs: [] },
              ]);
            } else if (message.type === "log") {
              const entries = pendingEntries.get(message.nodeId);
              if (entries) {
                entries.push(message.entry);
                setSteps((previous) =>
                  previous.map((step) =>
                    step.nodeId === message.nodeId ? { ...step, logs: [...entries] } : step,
                  ),
                );
              }
            } else if (message.type === "step") {
              setSteps((previous) =>
                previous.map((step) =>
                  step.nodeId === message.step.nodeId ? message.step : step,
                ),
              );
            } else if (message.type === "result") {
              if (message.context) options?.onWorkflowResult?.(message.context);
              setRunning(false);
            }
          });
        } else {
          const result = await response.json();
          if (result.steps) {
            setSteps(result.steps);
            if (result.context) options?.onWorkflowResult?.(result.context as WorkflowContext);
          } else {
            setSteps([
              errorStep(
                "error",
                "Workflow",
                result.error || result.message || "Unknown error",
              ),
            ]);
          }
          setRunning(false);
        }
      } catch {
        setSteps([errorStep("error", "Workflow", "Request failed")]);
        setRunning(false);
      }
    },
    [options],
  );

  return { steps, setSteps, open, setOpen, title, running, testNode, testWorkflow };
}
