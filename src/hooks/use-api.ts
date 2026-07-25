"use client";

import { useCallback, useState } from "react";
import type { RequestOptions } from "@/lib/types";

interface ApiState {
  loading: boolean;
  error: string | null;
}

export function useApi() {
  const [state, setState] = useState<ApiState>({ loading: false, error: null });

  const request = useCallback(
    async <T = unknown>({ endpoint, method = "GET", data }: RequestOptions): Promise<T | null> => {
      setState({ loading: true, error: null });
      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: data ? JSON.stringify(data) : undefined,
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({ error: "Request failed" }))) as {
            error?: string;
          };
          throw new Error(err.error ?? "Request failed");
        }
        const json = (await res.json()) as T;
        return json;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState({ loading: false, error: message });
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [],
  );

  return { request, loading: state.loading, error: state.error };
}
