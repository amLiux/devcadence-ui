"use client";

import { useCallback, useEffect, useState } from "react";
import { extractInputContract, type InputField } from "@/lib/workflows/input-contract";

const cache = new Map<string, InputField[]>();

async function loadContract(workflowId: string): Promise<InputField[]> {
  const response = await fetch(`/api/workflows/${workflowId}`);
  if (!response.ok) throw new Error("Could not load the target workflow.");
  const data = (await response.json()) as { nodes?: string | null };
  const fields = extractInputContract(data.nodes ?? null);
  cache.set(workflowId, fields);
  return fields;
}

/** Fetches (and caches) the Input node contract of the selected reusable workflow. */
export function useCallWorkflowContract(workflowId: string) {
  const cached = workflowId ? cache.get(workflowId) : undefined;
  const [fields, setFields] = useState<InputField[]>(cached ?? []);
  const [loading, setLoading] = useState(Boolean(workflowId) && !cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!workflowId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when the target is unset
      setFields([]);
       
      setError(null);
       
      setLoading(false);
      return;
    }

    const hit = cache.get(workflowId);
    if (hit) {
       
      setFields(hit);
       
      setLoading(false);
      return;
    }

     
    setLoading(true);
    loadContract(workflowId)
      .then((next) => {
        if (!active) return;
        setFields(next);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load the target workflow.");
        setFields([]);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workflowId]);

  const refresh = useCallback(async () => {
    if (!workflowId) return;
    cache.delete(workflowId);
    setLoading(true);
    try {
      const next = await loadContract(workflowId);
      setFields(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the target workflow.");
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  return { fields, loading, error, refresh };
}
