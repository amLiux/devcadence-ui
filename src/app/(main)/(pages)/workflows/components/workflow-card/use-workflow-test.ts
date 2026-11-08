"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { readSseEvents } from "@/lib/sse";
import type { LogEntry, NodeDebugLog, Workflow, WorkflowContext } from "@/lib/types";

type WorkflowTestMessage =
  | { type: "step-start"; nodeId: string; title: string }
  | { type: "log"; nodeId: string; entry: LogEntry }
  | { type: "step"; step: NodeDebugLog }
  | { type: "result"; context?: WorkflowContext };

function errorStep(message: string): NodeDebugLog[] {
  return [
    {
      nodeId: "error",
      title: "Workflow",
      success: false,
      logs: [{ type: "error", message, timestamp: new Date().toISOString() }],
    },
  ];
}

function applyMessage(
  message: WorkflowTestMessage,
  pendingEntries: Map<string, LogEntry[]>,
  setSteps: Dispatch<SetStateAction<NodeDebugLog[]>>,
  setTesting: (value: boolean) => void,
): void {
  switch (message.type) {
    case "step-start": {
      pendingEntries.set(message.nodeId, []);
      setSteps((previous) => [
        ...previous,
        { nodeId: message.nodeId, title: message.title, success: false, logs: [] },
      ]);
      return;
    }
    case "log": {
      const entries = pendingEntries.get(message.nodeId);
      if (!entries) return;
      entries.push(message.entry);
      setSteps((previous) =>
        previous.map((step) =>
          step.nodeId === message.nodeId ? { ...step, logs: [...entries] } : step,
        ),
      );
      return;
    }
    case "step": {
      setSteps((previous) =>
        previous.map((step) => (step.nodeId === message.step.nodeId ? message.step : step)),
      );
      return;
    }
    case "result": {
      setTesting(false);
    }
  }
}

async function applyJsonResult(
  response: Response,
  setSteps: Dispatch<SetStateAction<NodeDebugLog[]>>,
  setTesting: (value: boolean) => void,
): Promise<void> {
  const result = await response.json();
  if (result.steps) {
    setSteps(result.steps);
  } else {
    setSteps(errorStep(result.error || result.message || "Unknown error"));
  }
  setTesting(false);
}

export function useWorkflowTest(workflow: Workflow) {
  const [testing, setTesting] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<NodeDebugLog[]>([]);

  const test = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setTesting(true);
    setDebugSteps([]);
    setDebugOpen(true);

    try {
      const response = await fetch("/api/workflows/test-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("event-stream")) {
        const pendingEntries = new Map<string, LogEntry[]>();
        await readSseEvents<WorkflowTestMessage>(response, (message) =>
          applyMessage(message, pendingEntries, setDebugSteps, setTesting),
        );
      } else {
        await applyJsonResult(response, setDebugSteps, setTesting);
      }
    } catch {
      setDebugSteps(errorStep("Request failed"));
      setTesting(false);
    }
  };

  return { testing, debugOpen, setDebugOpen, debugSteps, test };
}
