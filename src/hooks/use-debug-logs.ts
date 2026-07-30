"use client";

import { useState, useCallback } from "react";
import type { EditorNode, EditorEdge, LogEntry, NodeDebugLog, WorkflowContext, Workflow } from "@/lib/types";

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
  const ts = (s: string) => new Date(s).toLocaleTimeString();
  const logs: LogEntry[] = [];
  logs.push({ type: "info", message: `Starting ${log.nodeType}...`, timestamp: log.startedAt });
  if (log.input && typeof log.input === "object" && Object.keys(log.input).length > 0) {
    logs.push({ type: "info", message: `Input: ${JSON.stringify(log.input, null, 2)}`, timestamp: log.startedAt });
  }
  logs.push({
    type: log.status === "success" ? "success" : "error",
    message: log.error ?? `${log.nodeType} completed in ${log.elapsedMs}ms`,
    timestamp: log.finishedAt,
  });
  if (log.output) {
    logs.push({ type: "info", message: `Output: ${JSON.stringify(log.output, null, 2)}`, timestamp: log.finishedAt });
  }
  if (log.controlFlow && Object.keys(log.controlFlow).length > 0) {
    logs.push({ type: "info", message: `Control Flow: ${JSON.stringify(log.controlFlow)}`, timestamp: log.finishedAt });
  }
  if (log.meta && Object.keys(log.meta).length > 0) {
    logs.push({ type: "info", message: `Meta: ${JSON.stringify(log.meta)}`, timestamp: log.finishedAt });
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
        const res = await fetch("/api/workflows/test-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node,
            workflowId,
            nodes,
            edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
            context,
          }),
        });

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("event-stream")) {
          const entries: LogEntry[] = [];
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error("No reader");
          let buf = "";
          for (;;) {
            const { done, value } = await reader.read();
            buf += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
              try {
                const msg = JSON.parse(data);
                if (msg.type === "log") {
                  entries.push(msg.entry);
                  setSteps([{ nodeId: node.id, title: node.data.title, success: false, logs: [...entries] }]);
                } else if (msg.type === "result") {
                  setSteps([{ nodeId: msg.nodeId, title: msg.title, success: msg.success, logs: msg.logs || entries }]);
                  if (msg.data !== undefined) {
                    options?.onNodeResult?.(
                      node.id,
                      msg.data,
                      msg.success,
                      msg.success ? null : (msg.logs?.find((l: { type: string }) => l.type === "error")?.message ?? null),
                    );
                  }
                }
              } catch { /* skip malformed */ }
            }
            if (done) break;
          }
        } else {
          const result = await res.json();
          setSteps([result]);
          if (result.data !== undefined) {
            options?.onNodeResult?.(node.id, result.data, result.success, result.success ? null : result.logs?.find((l: { type: string }) => l.type === "error")?.message ?? null);
          }
        }
      } catch {
        setSteps([
          {
            nodeId: node.id,
            title: node.data.title,
            success: false,
            logs: [
              {
                type: "error",
                message: "Request failed",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
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
        const res = await fetch("/api/workflows/test-workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: workflow.id,
            nodes,
            edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
          }),
        });

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("event-stream")) {
          const pendingEntries = new Map<string, LogEntry[]>();
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error("No reader");
          let buf = "";
          for (;;) {
            const { done, value } = await reader.read();
            buf += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;
              try {
                const msg = JSON.parse(data);
                if (msg.type === "step-start") {
                  pendingEntries.set(msg.nodeId, []);
                  setSteps((prev) => [...prev, { nodeId: msg.nodeId, title: msg.title, success: false, logs: [] }]);
                } else if (msg.type === "log") {
                  const entries = pendingEntries.get(msg.nodeId);
                  if (entries) {
                    entries.push(msg.entry);
                    setSteps((prev) =>
                      prev.map((s) => (s.nodeId === msg.nodeId ? { ...s, logs: [...entries] } : s)),
                    );
                  }
                } else if (msg.type === "step") {
                  setSteps((prev) =>
                    prev.map((s) => (s.nodeId === msg.step.nodeId ? msg.step : s)),
                  );
                } else if (msg.type === "result") {
                  if (msg.context) options?.onWorkflowResult?.(msg.context as WorkflowContext);
                  setRunning(false);
                }
              } catch { /* skip malformed */ }
            }
            if (done) break;
          }
        } else {
          const result = await res.json();
          if (result.steps) {
            setSteps(result.steps);
            if (result.context) options?.onWorkflowResult?.(result.context as WorkflowContext);
          } else {
            setSteps([
              {
                nodeId: "error",
                title: "Workflow",
                success: false,
                logs: [
                  {
                    type: "error",
                    message: result.error || result.message || "Unknown error",
                    timestamp: new Date().toISOString(),
                  },
                ],
              },
            ]);
          }
          setRunning(false);
        }
      } catch {
        setSteps([
          {
            nodeId: "error",
            title: "Workflow",
            success: false,
            logs: [
              {
                type: "error",
                message: "Request failed",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
        setRunning(false);
      }
    },
    [options],
  );

  return { steps, setSteps, open, setOpen, title, running, testNode, testWorkflow };
}
