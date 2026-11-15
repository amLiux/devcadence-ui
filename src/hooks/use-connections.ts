"use client";

import { useCallback, useEffect, useState } from "react";
import type { Connection, ConnectionType } from "@/lib/types";

interface CacheEntry {
  data: Connection[] | null;
  promise: Promise<Connection[]> | null;
}

/** Module-level cache: opening several node panels must not refetch the same list. */
const cache = new Map<string, CacheEntry>();

function cacheKey(type?: ConnectionType): string {
  return type ?? "all";
}

async function load(type?: ConnectionType): Promise<Connection[]> {
  const url = type ? `/api/connections?type=${encodeURIComponent(type)}` : "/api/connections";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load connections");
  return (await response.json()) as Connection[];
}

/** Call after create/update/delete so the next mount sees the new list. */
export function invalidateConnections(type?: ConnectionType): void {
  if (!type) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey(type));
}

export function useConnections(type?: ConnectionType) {
  const key = cacheKey(type);
  const cached = cache.get(key)?.data ?? null;
  const [connections, setConnections] = useState<Connection[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const entry = cache.get(key);

    if (entry?.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from the shared cache
      setConnections(entry.data);
       
      setLoading(false);
      return;
    }

    // Two components mounting at once share the same in-flight request.
    const promise =
      entry?.promise ??
      load(type)
        .then((data) => {
          cache.set(key, { data, promise: null });
          return data;
        })
        .catch((err: unknown) => {
          cache.delete(key);
          throw err;
        });

    if (!entry?.promise) cache.set(key, { data: null, promise });

     
    setLoading(true);

    promise
      .then((data) => {
        if (!active) return;
        setConnections(data);
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load connections");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key, type]);

  const refresh = useCallback(async () => {
    invalidateConnections(type);
    setLoading(true);
    try {
      const data = await load(type);
      cache.set(key, { data, promise: null });
      setConnections(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, [key, type]);

  return { connections, loading, error, refresh };
}
