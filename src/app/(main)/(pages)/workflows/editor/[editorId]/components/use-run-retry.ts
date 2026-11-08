"use client";

import { useState } from "react";
import type { WorkflowRun } from "./run-types";

export function useRunRetry(run: WorkflowRun, onRetried?: () => void) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/workflows/${run.workflowId}/runs/${run.id}/retry`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setRetryError(data.error ?? "Retry failed");
        return;
      }
      onRetried?.();
    } catch {
      setRetryError("Retry failed");
    } finally {
      setRetrying(false);
    }
  };

  return { retrying, retryError, retry };
}
