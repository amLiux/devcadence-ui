"use client";

import { useState } from "react";
import type { LogEntry, NodeDebugLog, Workflow } from "@/lib/types";

function errorStep(message: string): NodeDebugLog[] {
  return [
    {
      nodeId: "error",
      title: "Workflow",
      success: false,
      logs: [
        {
          type: "error",
          message,
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ];
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
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No reader");

        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed;

            try {
              const message = JSON.parse(data);
              if (message.type === "step-start") {
                pendingEntries.set(message.nodeId, []);
                setDebugSteps((previous) => [
                  ...previous,
                  { nodeId: message.nodeId, title: message.title, success: false, logs: [] },
                ]);
              } else if (message.type === "log") {
                const entries = pendingEntries.get(message.nodeId);
                if (entries) {
                  entries.push(message.entry);
                  setDebugSteps((previous) =>
                    previous.map((step) =>
                      step.nodeId === message.nodeId
                        ? { ...step, logs: [...entries] }
                        : step,
                    ),
                  );
                }
              } else if (message.type === "step") {
                setDebugSteps((previous) =>
                  previous.map((step) =>
                    step.nodeId === message.step.nodeId ? message.step : step,
                  ),
                );
              } else if (message.type === "result") {
                setTesting(false);
              }
            } catch {
              // Skip malformed events.
            }
          }

          if (done) break;
        }
      } else {
        const result = await response.json();
        if (result.steps) {
          setDebugSteps(result.steps);
        } else {
          setDebugSteps(errorStep(result.error || result.message || "Unknown error"));
        }
        setTesting(false);
      }
    } catch {
      setDebugSteps(errorStep("Request failed"));
      setTesting(false);
    }
  };

  return { testing, debugOpen, setDebugOpen, debugSteps, test };
}
